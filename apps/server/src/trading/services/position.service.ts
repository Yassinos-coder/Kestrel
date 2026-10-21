import { Injectable, Logger } from '@nestjs/common';
import type { PositionPlan, TradeFeatures, TradingMode } from '@kestrel/shared';
import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import type { Position } from '../../generated/prisma/client';
import { SolPriceService } from '../../market-data/services/sol-price.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { RuleSetService } from '../../rules/services/rule-set.service';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import { LiveExecutor } from '../executors/live.executor';
import { PaperExecutor } from '../executors/paper.executor';
import type { TradeExecutor } from '../interfaces/executor.interface';
import type { ExitPlan, PoolState, PositionContext } from '../interfaces/trading.interface';
import { PositionRepository } from '../repositories/position.repository';
import { TradeRepository } from '../repositories/trade.repository';
import { LessonService } from './lesson.service';
import { PortfolioService } from './portfolio.service';

const PERCENT = 100;
const FULL_EXIT_THRESHOLD = 0.999;
const MAX_SELL_FAILURES = 3;

export interface OpenArgs {
  userId: string;
  decisionId: string | null;
  mode: TradingMode;
  snapshot: TokenMarketSnapshot;
  sizeSol: number;
  confidence: number | null;
  plan: PositionPlan;
  exitPlan: ExitPlan;
  features: TradeFeatures;
  ruleVersion: number;
  matchedPlaybooks: string[];
  reasoning: string;
}

export interface SellFlags {
  markTp1?: boolean;
  markTp2?: boolean;
}

@Injectable()
export class PositionService {
  private readonly logger = new Logger(PositionService.name);
  private readonly inFlight = new Set<string>();
  private readonly failures = new Map<string, number>();

  constructor(
    private readonly positions: PositionRepository,
    private readonly trades: TradeRepository,
    private readonly settings: SettingsRepository,
    private readonly paper: PaperExecutor,
    private readonly live: LiveExecutor,
    private readonly notifications: NotificationService,
    private readonly solPrice: SolPriceService,
    private readonly lessons: LessonService,
    private readonly portfolio: PortfolioService,
    private readonly ruleSets: RuleSetService,
  ) {}

  async open(args: OpenArgs): Promise<Position> {
    const { snapshot } = args;
    const pool: PoolState = {
      priceSol: snapshot.priceSol,
      quoteReserveSol: snapshot.liquidity.quoteSol,
      liquidityUsd: snapshot.liquidity.usd,
    };
    const fill = await this.executor(args.mode).buy({
      userId: args.userId,
      mint: snapshot.mint,
      decimals: snapshot.decimals,
      solAmount: args.sizeSol,
      pool,
    });

    const context: PositionContext = {
      decimals: snapshot.decimals,
      creator: snapshot.creator.address,
      topHolderOwners: snapshot.holders.topHolderOwners,
      entryLiquidityUsd: snapshot.liquidity.usd,
      exitPlan: args.exitPlan,
      tp1Done: false,
      tp2Done: false,
      features: args.features,
      ruleVersion: args.ruleVersion,
      matchedPlaybooks: args.matchedPlaybooks,
      reasoning: args.reasoning,
    };

    const position = await this.positions.create({
      userId: args.userId,
      decisionId: args.decisionId,
      mode: args.mode,
      mint: snapshot.mint,
      symbol: snapshot.symbol,
      pairAddress: snapshot.pairAddress,
      entrySol: fill.solAmount,
      entryPriceSol: fill.priceSol,
      tokens: fill.tokenAmount,
      plan: args.plan,
      context,
    });
    await this.trades.create({
      userId: args.userId,
      positionId: position.id,
      side: 'BUY',
      reason: args.reasoning,
      priceSol: fill.priceSol,
      solAmount: fill.solAmount,
      tokenAmount: fill.tokenAmount,
      feesSol: fill.feesSol,
      signature: fill.signature,
    });
    if (args.mode === 'PAPER') await this.settings.adjustPaperCash(args.userId, -fill.solAmount);

    void this.notifyBuy(args, fill.solAmount, fill.priceSol);
    return position;
  }

  async sell(positionId: string, fraction: number, reason: string, pool: PoolState, flags: SellFlags = {}): Promise<boolean> {
    if (this.inFlight.has(positionId)) return false;
    this.inFlight.add(positionId);

    try {
      return await this.executeSell(positionId, fraction, reason, pool, flags);
    } catch (error) {
      await this.handleSellFailure(await this.ownerOf(positionId), positionId, error);
      return false;
    } finally {
      this.inFlight.delete(positionId);
    }
  }

  private async executeSell(positionId: string, fraction: number, reason: string, pool: PoolState, flags: SellFlags): Promise<boolean> {
    const position = await this.positions.findById(positionId);
    if (!position || position.status !== 'OPEN') return false;

    const context = position.context as unknown as PositionContext;
    const full = fraction >= FULL_EXIT_THRESHOLD;
    const tokens = full ? position.tokensHeld : position.tokensHeld * fraction;
    const fill = await this.executor(position.mode).sell({
      userId: position.userId,
      mint: position.mint,
      decimals: context.decimals,
      tokenAmount: tokens,
      sellAll: full,
      pool,
    });
    this.failures.delete(positionId);

    const remaining = full ? 0 : Math.max(0, position.tokensHeld - fill.tokenAmount);
    const realizedSol = position.realizedSol + fill.solAmount;
    const nextContext: PositionContext = {
      ...context,
      tp1Done: context.tp1Done || flags.markTp1 === true,
      tp2Done: context.tp2Done || flags.markTp2 === true,
    };

    const updated = await this.positions.update(positionId, {
      tokensHeld: remaining,
      realizedSol,
      lastPriceSol: pool.priceSol,
      context: nextContext,
      ...(full ? { status: 'CLOSED' as const, closedAt: new Date(), exitReason: reason } : {}),
    });
    await this.trades.create({
      userId: position.userId,
      positionId,
      side: 'SELL',
      reason,
      priceSol: fill.priceSol,
      solAmount: fill.solAmount,
      tokenAmount: fill.tokenAmount,
      feesSol: fill.feesSol,
      signature: fill.signature,
    });
    if (position.mode === 'PAPER') await this.settings.adjustPaperCash(position.userId, fill.solAmount);

    await this.afterSell(updated, position, fill.solAmount, fill.tokenAmount, full, reason);
    return true;
  }

  private async afterSell(
    updated: Position,
    before: Position,
    receivedSol: number,
    soldTokens: number,
    closed: boolean,
    reason: string,
  ): Promise<void> {
    const solUsd = await this.solPrice.getUsd();
    const costBasis = before.entrySol * (soldTokens / before.tokensBought);
    const pnlSol = closed ? updated.realizedSol - updated.entrySol : receivedSol - costBasis;
    const basis = closed ? updated.entrySol : costBasis;

    void this.notifications.notifySell(updated.userId, {
      mode: updated.mode,
      symbol: updated.symbol,
      mint: updated.mint,
      pairAddress: updated.pairAddress,
      reason,
      soldSol: receivedSol,
      pnlSol,
      pnlPct: basis > 0 ? (pnlSol / basis) * PERCENT : 0,
      closed,
      solUsd,
    });

    if (!closed) return;
    void this.lessons.recordClosed(updated);
    await this.checkDailyLoss(updated.userId, updated.mode, solUsd);
  }

  private async checkDailyLoss(userId: string, mode: TradingMode, solUsd: number): Promise<void> {
    const [state, rules] = await Promise.all([this.portfolio.getState(userId), this.ruleSets.getActive(userId)]);
    if (state.dailyLossPct < rules.params.dailyLossLimitPct) return;
    await this.notifications.notifyDailyLoss(userId, {
      mode,
      lossSol: -state.dailyPnlSol,
      lossPct: state.dailyLossPct,
      limitPct: rules.params.dailyLossLimitPct,
      solUsd,
    });
  }

  private async handleSellFailure(userId: string, positionId: string, error: unknown): Promise<void> {
    const count = (this.failures.get(positionId) ?? 0) + 1;
    this.failures.set(positionId, count);
    const message = error instanceof Error ? error.message : 'unknown error';
    this.logger.error(`Sell failed for position ${positionId} (attempt ${count}): ${message}`);

    if (count < MAX_SELL_FAILURES) return;
    await this.notifications.notifyWarning(
      userId,
      `sell-failed:${positionId}`,
      `🚨 <b>Exit is failing</b>\nPosition ${positionId.slice(0, 8)} could not be sold ${count} times in a row.\n${message.slice(0, 200)}\nThe bot will keep retrying; check the bot wallet and RPC.`,
    );
  }

  private async notifyBuy(args: OpenArgs, spentSol: number, priceSol: number): Promise<void> {
    const solUsd = await this.solPrice.getUsd();
    await this.notifications.notifyBuy(args.userId, {
      mode: args.mode,
      symbol: args.snapshot.symbol,
      mint: args.snapshot.mint,
      pairAddress: args.snapshot.pairAddress,
      solAmount: spentSol,
      solUsd,
      priceSol,
      confidence: args.confidence,
      plan: args.plan,
      reasoning: args.reasoning,
      ruleVersion: args.ruleVersion,
    });
  }

  private async ownerOf(positionId: string): Promise<string> {
    return (await this.positions.findById(positionId))?.userId ?? '';
  }

  private executor(mode: TradingMode): TradeExecutor {
    return mode === 'LIVE' ? this.live : this.paper;
  }
}
