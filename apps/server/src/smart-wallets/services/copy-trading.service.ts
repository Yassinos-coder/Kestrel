import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChecklistReport, RuleResult } from '@kestrel/shared';
import type { TokenMarketSnapshot, TokenSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import { DexScreenerClient } from '../../market-data/clients/dexscreener.client';
import { HeliusClient } from '../../market-data/clients/helius.client';
import { TokenSnapshotBuilderService } from '../../market-data/services/token-snapshot-builder.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';
import { TradeFeaturesMapper } from '../../rules/mappers/trade-features.mapper';
import { RuleSetService } from '../../rules/services/rule-set.service';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import type { PoolState, PositionContext } from '../../trading/interfaces/trading.interface';
import { DecisionRepository } from '../../trading/repositories/decision.repository';
import { PositionRepository } from '../../trading/repositories/position.repository';
import { TokenScanRepository } from '../../trading/repositories/token-scan.repository';
import { PositionService } from '../../trading/services/position.service';
import { TradingGateService } from '../../trading/services/trading-gate.service';
import { ExitPlanResolver } from '../../trading/utils/exit-plan.resolver';
import type { EnhancedSwapTransaction, WalletSwap } from '../interfaces/wallet.interface';
import { WalletSwapParserMapper } from '../mappers/wallet-swap-parser.mapper';
import { CopyFollowRepository, type FollowWithWallet } from '../repositories/copy-follow.repository';
import { CopyGateValidator } from '../validators/copy-gate.validator';
import { CopyFollowStatsService } from './copy-follow-stats.service';

const POLL_BATCH = 20;
const SIGNATURE_PEEK = 10;
const NO_PLAYBOOK_EFFECT = { matched: [], block: false, scalp: false, sizeMultiplier: 1, maxHoldMinutes: null, takeProfitMultiple: null, stopLossPct: null };

@Injectable()
export class CopyTradingService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CopyTradingService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly heads = new Map<string, string>();

  constructor(
    private readonly follows: CopyFollowRepository,
    private readonly stats: CopyFollowStatsService,
    private readonly helius: HeliusClient,
    private readonly dexScreener: DexScreenerClient,
    private readonly snapshots: TokenSnapshotBuilderService,
    private readonly positions: PositionService,
    private readonly positionRepo: PositionRepository,
    private readonly decisions: DecisionRepository,
    private readonly scans: TokenScanRepository,
    private readonly settings: SettingsRepository,
    private readonly ruleSets: RuleSetService,
    private readonly gate: TradingGateService,
    private readonly notifications: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>('engine.enabled') || !this.helius.isAvailable()) return;
    const intervalMs = this.configService.getOrThrow<number>('engine.copyIntervalSeconds') * 1000;
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const active = await this.enforceLossLimits(await this.follows.listWithStatus('active'));
      const byWallet = new Map<string, FollowWithWallet[]>();
      for (const follow of active) byWallet.set(follow.wallet.address, [...(byWallet.get(follow.wallet.address) ?? []), follow]);

      for (const [address, group] of byWallet) {
        try {
          const latest = await this.helius.getNewSignatures(address, this.heads.get(address) ?? null, SIGNATURE_PEEK);
          if (this.heads.has(address) && !latest.length) continue;
          const transactions = await this.helius.getWalletSwapTransactions(address, POLL_BATCH);
          for (const follow of group) await this.process(follow, transactions);
          if (latest[0]) this.heads.set(address, latest[0]);
        } catch (error) {
          this.logger.warn(`Could not read swaps for ${this.short(address)}: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }
    } catch (error) {
      this.logger.error(`Copy tick failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.running = false;
    }
  }

  private async process(follow: FollowWithWallet, transactions: EnhancedSwapTransaction[]): Promise<void> {
    if (!transactions.length) return;
    const newest = transactions[0]!.signature;
    if (!follow.lastSignature) {
      await this.follows.setCursor(follow.id, newest);
      return;
    }

    const fresh: EnhancedSwapTransaction[] = [];
    for (const transaction of transactions) {
      if (transaction.signature === follow.lastSignature) break;
      fresh.push(transaction);
    }
    if (!fresh.length) return;
    await this.follows.setCursor(follow.id, newest);

    const swaps = fresh.reverse().flatMap((transaction) => {
      const swap = WalletSwapParserMapper.parse(transaction, follow.wallet.address);
      return swap ? [swap] : [];
    });
    for (const swap of swaps) {
      try {
        if (swap.side === 'buy') await this.handleBuy(follow, swap);
        else await this.handleSell(follow, swap);
      } catch (error) {
        this.logger.warn(`Copy of ${swap.side} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
  }

  private async handleBuy(follow: FollowWithWallet, swap: WalletSwap): Promise<void> {
    const existing = await this.positionRepo.findOpenCopy(follow.id, swap.mint);
    if (existing) {
      await this.addToTrackedHolding(existing.id, existing.context as unknown as PositionContext, swap.tokenAmount, 0);
      return;
    }

    const settings = await this.settings.findByUserId(follow.userId);
    if (!settings?.enabled || this.gate.isPaused()) return;
    if (await this.positionRepo.hasOpenForMintAnySource(follow.userId, swap.mint)) return;

    const stats = await this.stats.compute(follow.id);
    const sizeSol = Math.min(follow.maxPerTradeSol, follow.budgetSol - stats.deployedSol);
    if (sizeSol < STATIC_LIMITS.minTradeSol) return;
    if (settings.mode === 'PAPER' && settings.paperCashSol < sizeSol) return;

    const pair = await this.dexScreener.getBestPairForToken(swap.mint);
    if (!pair) return;
    const market = await this.snapshots.build(pair, null);
    const snapshot: TokenSnapshot = { ...market, portfolio: { openPositions: 0, dailyLossPct: 0 } };
    const gateResult = CopyGateValidator.validate(snapshot, { minLiquidityUsd: follow.minLiquidityUsd, requireSecuredLp: follow.requireSecuredLp });

    const scan = await this.scans.upsert(market.mint, { pairAddress: market.pairAddress, symbol: market.symbol, name: market.name, snapshot: market });
    const label = this.short(follow.wallet.address);

    if (!gateResult.passed) {
      const why = gateResult.results.filter((result) => result.status === 'fail').map((result) => result.reason).join('; ');
      await this.record(follow.userId, scan.id, market, 'REJECTED', gateResult.results, `Copy of ${label} skipped: ${why}`, null, null);
      return;
    }

    const rules = await this.ruleSets.getActive(follow.userId);
    const { plan, exitPlan } = ExitPlanResolver.resolve(rules.params, null, NO_PLAYBOOK_EFFECT);
    const reasoning = `Copying ${label} (tier ${follow.wallet.tier}, score ${Math.round(follow.wallet.score)}). It just bought ${swap.solAmount.toFixed(2)} SOL of ${market.symbol}.`;
    const decision = await this.record(follow.userId, scan.id, market, 'BUY', gateResult.results, reasoning, sizeSol, plan);

    try {
      await this.positions.open({
        userId: follow.userId,
        decisionId: decision.id,
        mode: settings.mode,
        snapshot: market,
        sizeSol,
        confidence: null,
        plan,
        exitPlan,
        features: TradeFeaturesMapper.fromSnapshot(market),
        ruleVersion: rules.version,
        matchedPlaybooks: [],
        reasoning,
        source: 'COPY',
        followId: follow.id,
        copy: { followId: follow.id, wallet: follow.wallet.address, boughtTokens: swap.tokenAmount, soldTokens: 0 },
      });
    } catch (error) {
      await this.decisions.markFailed(decision.id, `Copy order failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async handleSell(follow: FollowWithWallet, swap: WalletSwap): Promise<void> {
    if (!follow.mirrorSells) return;
    const position = await this.positionRepo.findOpenCopy(follow.id, swap.mint);
    const copy = (position?.context as unknown as PositionContext | undefined)?.copy;
    if (!position || !copy) return;

    const heldBefore = Math.max(copy.boughtTokens - copy.soldTokens, 0);
    const fraction = heldBefore > 0 ? Math.min(1, swap.tokenAmount / heldBefore) : 1;
    await this.addToTrackedHolding(position.id, position.context as unknown as PositionContext, 0, swap.tokenAmount);

    const pair = await this.dexScreener.getBestPairForToken(swap.mint);
    const pool: PoolState = pair
      ? { priceSol: pair.priceSol, quoteReserveSol: pair.liquidityQuoteSol, liquidityUsd: pair.liquidityUsd }
      : { priceSol: position.lastPriceSol, quoteReserveSol: 0, liquidityUsd: 0 };
    await this.positions.sell(position.id, fraction, `mirrored a sell by ${this.short(follow.wallet.address)}`, pool);
  }

  private async addToTrackedHolding(positionId: string, context: PositionContext, bought: number, sold: number): Promise<void> {
    if (!context.copy) return;
    const copy = { ...context.copy, boughtTokens: context.copy.boughtTokens + bought, soldTokens: context.copy.soldTokens + sold };
    await this.positionRepo.update(positionId, { context: { ...context, copy } });
  }

  private async enforceLossLimits(active: FollowWithWallet[]): Promise<FollowWithWallet[]> {
    const remaining: FollowWithWallet[] = [];
    for (const follow of active) {
      const stats = await this.stats.compute(follow.id);
      const net = stats.realizedPnlSol + stats.openPnlSol;
      if (net > -follow.maxLossSol) {
        remaining.push(follow);
        continue;
      }
      await this.follows.update(follow.id, { status: 'paused-max-loss' });
      await this.notifications.notifyWarning(
        follow.userId,
        `copy-loss:${follow.id}`,
        `🛑 <b>Copy trading paused</b>\nWallet <code>${this.short(follow.wallet.address)}</code> is down ${Math.abs(net).toFixed(3)} SOL for you, which reached your ${follow.maxLossSol} SOL loss limit.\nNo new copies will be made. Open copied positions stay protected by the guardian.`,
      );
    }
    return remaining;
  }

  private async record(
    userId: string,
    scanId: string,
    market: TokenMarketSnapshot,
    action: 'BUY' | 'REJECTED',
    results: RuleResult[],
    reasoning: string,
    sizeSol: number | null,
    plan: object | null,
  ) {
    const failed = results.filter((result) => result.status === 'fail').map((result) => result.rule);
    const report: ChecklistReport = { mint: market.mint, verdict: failed.length ? 'reject' : 'candidate', softScore: failed.length ? 0 : 100, hardFailures: failed, results };
    return this.decisions.create({
      userId,
      scanId,
      mint: market.mint,
      symbol: market.symbol,
      action,
      confidence: null,
      sizeSol,
      plan,
      reasoning,
      report,
      agents: { source: 'copy-trading' },
      marketCapUsd: market.marketCapUsd,
      pairAddress: market.pairAddress,
    });
  }

  private short(address: string): string {
    return `${address.slice(0, 4)}…${address.slice(-4)}`;
  }
}
