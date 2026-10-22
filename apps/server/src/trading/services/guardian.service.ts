import { Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Position } from '../../generated/prisma/client';
import { DexScreenerClient } from '../../market-data/clients/dexscreener.client';
import { GeckoTerminalClient } from '../../market-data/clients/geckoterminal.client';
import type { DexPair, PoolTrade } from '../../market-data/interfaces/market-data.interface';
import type { ExitSignals, PoolState, PositionContext } from '../interfaces/trading.interface';
import { PositionRepository } from '../repositories/position.repository';
import { ExitEvidenceBuilder } from '../utils/exit-evidence.builder';
import { ExitRulesEvaluator } from '../utils/exit-rules.evaluator';
import { FlowSignalBuilder } from '../utils/flow-signal.builder';
import { EngineStatusService } from './engine-status.service';
import { PositionService } from './position.service';

const TRADE_LOOKUPS_PER_TICK = 6;
const TOP_HOLDER_WINDOW_MS = 10 * 60 * 1000;
const RUG_EXIT_PATTERN = /creator|consecutive|top holders|liquidity/;

@Injectable()
export class GuardianService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(GuardianService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private cursor = 0;

  constructor(
    private readonly positions: PositionRepository,
    private readonly positionService: PositionService,
    private readonly dexScreener: DexScreenerClient,
    private readonly gecko: GeckoTerminalClient,
    private readonly engine: EngineStatusService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>('engine.enabled')) return;
    const intervalMs = this.configService.getOrThrow<number>('engine.guardianIntervalSeconds') * 1000;
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async closeNow(userId: string, positionId: string): Promise<void> {
    const position = await this.positions.findById(positionId);
    if (!position || position.userId !== userId || position.status !== 'OPEN') throw new NotFoundException('Open position not found');

    const [pair] = await this.dexScreener.getPairs([position.pairAddress]);
    if (!pair) throw new NotFoundException('Market data for this position is unavailable right now');
    await this.positionService.sell(position.id, 1, 'closed manually', this.toPool(pair));
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.runTick();
    } catch (error) {
      this.logger.error(`Guardian tick failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.engine.markGuardian();
      this.running = false;
    }
  }

  private async runTick(): Promise<void> {
    const open = await this.positions.findOpen();
    if (!open.length) return;

    const pairs = await this.dexScreener.getPairs([...new Set(open.map((position) => position.pairAddress))]);
    const byPair = new Map(pairs.map((pair) => [pair.pairAddress, pair]));
    const lookups = this.selectTradeLookups(open);

    for (const position of open) {
      const pair = byPair.get(position.pairAddress);
      if (!pair) {
        this.logger.warn(`No market data for open position ${position.symbol}`);
        continue;
      }
      await this.guard(position, pair, lookups.has(position.id) || this.pastHoldLimit(position));
    }
  }

  private async guard(position: Position, pair: DexPair, loadTrades: boolean): Promise<void> {
    const pool = this.toPool(pair);
    const peak = Math.max(position.peakPriceSol, pair.priceSol);
    await this.positions.update(position.id, { lastPriceSol: pair.priceSol, peakPriceSol: peak });

    const context = position.context as unknown as PositionContext;
    const trades = loadTrades ? await this.loadTrades(position.pairAddress) : [];
    const signals = this.computeSignals(context, trades, position.openedAt.getTime(), pair.liquidityUsd, loadTrades);

    const action = ExitRulesEvaluator.evaluate(
      {
        entryPriceSol: position.entryPriceSol,
        tokensBought: position.tokensBought,
        tokensHeld: position.tokensHeld,
        peakPriceSol: peak,
        openedAtMs: position.openedAt.getTime(),
        context,
      },
      signals,
      pair.priceSol,
      Date.now(),
    );
    if (!action) return;

    if (action.full && RUG_EXIT_PATTERN.test(action.reason)) {
      await this.recordExitEvidence(position, context, trades, pair.pairAddress);
    }

    await this.positionService.sell(position.id, action.sellFraction, action.reason, pool, {
      markTp1: action.markTp1,
      markTp2: action.markTp2,
    });
  }

  private async recordExitEvidence(position: Position, context: PositionContext, loaded: PoolTrade[], pairAddress: string): Promise<void> {
    const trades = loaded.length ? loaded : await this.loadTrades(pairAddress);
    const exitEvidence = ExitEvidenceBuilder.build(trades, context, position.openedAt.getTime(), Date.now());
    await this.positions.update(position.id, { context: { ...context, exitEvidence } });
  }

  private computeSignals(context: PositionContext, trades: PoolTrade[], openedAtMs: number, liquidityUsd: number, tradesLoaded: boolean): ExitSignals {
    const sinceOpen = trades.filter((trade) => trade.timestampMs >= openedAtMs).sort((a, b) => b.timestampMs - a.timestampMs);
    const recentCutoff = Date.now() - TOP_HOLDER_WINDOW_MS;
    const topHolders = new Set(context.topHolderOwners);

    return {
      creatorSold: context.creator !== null && sinceOpen.some((trade) => trade.kind === 'sell' && trade.wallet === context.creator),
      sellStreak: this.leadingSells(sinceOpen),
      topHoldersSelling: new Set(
        sinceOpen.filter((trade) => trade.kind === 'sell' && trade.timestampMs >= recentCutoff && topHolders.has(trade.wallet)).map((trade) => trade.wallet),
      ).size,
      liquidityUsd,
      flow: tradesLoaded ? FlowSignalBuilder.build(trades, Date.now()) : null,
    };
  }

  private leadingSells(newestFirst: PoolTrade[]): number {
    let streak = 0;
    for (const trade of newestFirst) {
      if (trade.kind !== 'sell') break;
      streak++;
    }
    return streak;
  }

  private pastHoldLimit(position: Position): boolean {
    const context = position.context as unknown as PositionContext;
    return Date.now() - position.openedAt.getTime() >= context.exitPlan.maxHoldMinutes * 60_000;
  }

  private selectTradeLookups(open: Position[]): Set<string> {
    const ordered = [...open].sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
    const chosen = new Set<string>();
    for (let index = 0; index < Math.min(TRADE_LOOKUPS_PER_TICK, ordered.length); index++) {
      chosen.add(ordered[(this.cursor + index) % ordered.length]!.id);
    }
    this.cursor = (this.cursor + TRADE_LOOKUPS_PER_TICK) % Math.max(ordered.length, 1);
    return chosen;
  }

  private async loadTrades(pairAddress: string): Promise<PoolTrade[]> {
    try {
      return await this.gecko.getTrades(pairAddress);
    } catch {
      return [];
    }
  }

  private toPool(pair: DexPair): PoolState {
    return { priceSol: pair.priceSol, quoteReserveSol: pair.liquidityQuoteSol, liquidityUsd: pair.liquidityUsd };
  }
}
