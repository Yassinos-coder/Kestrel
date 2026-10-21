import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RuleParams } from '@kestrel/shared';
import { DexScreenerClient } from '../../market-data/clients/dexscreener.client';
import { GeckoTerminalClient } from '../../market-data/clients/geckoterminal.client';
import type { DexPair, PoolCandidate } from '../../market-data/interfaces/market-data.interface';
import { TokenSnapshotBuilderService } from '../../market-data/services/token-snapshot-builder.service';
import { RuleSetService } from '../../rules/services/rule-set.service';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import { TokenScanRepository } from '../repositories/token-scan.repository';
import { DecisionPipelineService } from './decision-pipeline.service';
import { EngineStatusService } from './engine-status.service';
import { TradingGateService } from './trading-gate.service';

const MINUTE_MS = 60_000;
const MAX_WATCHLIST = 600;
const MAX_TOKEN_AGE_MS = 180 * MINUTE_MS;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [10 * MINUTE_MS, 30 * MINUTE_MS, Number.POSITIVE_INFINITY];
const ESTABLISHED_RETRY_MS = 25 * MINUTE_MS;
const ESTABLISHED_UNSEEN_LIMIT_MS = 2 * 60 * MINUTE_MS;
const MAX_SNAPSHOTS_PER_TICK = 4;
const MAX_PAIRS_PER_LOOKUP = 24;
const MIN_RECENT_TRANSACTIONS = 5;
const PREFILTER_LIQUIDITY_FACTOR = 0.5;
const PREFILTER_MARKET_CAP_LOW_FACTOR = 0.5;
const PREFILTER_MARKET_CAP_HIGH_FACTOR = 1.5;

type WatchSource = 'new' | 'trending';

interface WatchEntry {
  candidate: PoolCandidate;
  source: WatchSource;
  lastSeenMs: number;
  attempts: number;
  nextAttemptMs: number;
}

@Injectable()
export class ScoutService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ScoutService.name);
  private readonly watchlist = new Map<string, WatchEntry>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly gecko: GeckoTerminalClient,
    private readonly dexScreener: DexScreenerClient,
    private readonly snapshots: TokenSnapshotBuilderService,
    private readonly scans: TokenScanRepository,
    private readonly pipeline: DecisionPipelineService,
    private readonly settings: SettingsRepository,
    private readonly ruleSets: RuleSetService,
    private readonly engine: EngineStatusService,
    private readonly gate: TradingGateService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>('engine.enabled')) {
      this.logger.warn('Engine disabled (ENGINE_ENABLED=false), the scout will not run');
      return;
    }
    const intervalMs = this.configService.getOrThrow<number>('engine.scoutIntervalSeconds') * 1000;
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.gate.run(() => this.runTick());
    } catch (error) {
      this.logger.error(`Scout tick failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.engine.markScout(this.watchlist.size);
      this.running = false;
    }
  }

  private async runTick(): Promise<void> {
    const users = await this.settings.listEnabled();
    if (!users.length) return;

    const params = await Promise.all(users.map(async (user) => (await this.ruleSets.getActive(user.userId)).params));
    await this.refreshWatchlist();

    const due = this.pickDue(params);
    if (!due.length) return;

    const pairs = await this.dexScreener.getPairs(due.map((entry) => entry.candidate.pairAddress));
    const byPair = new Map(pairs.map((pair) => [pair.pairAddress, pair]));
    let snapshotsTaken = 0;

    for (const entry of due) {
      if (snapshotsTaken >= MAX_SNAPSHOTS_PER_TICK || this.gate.isPaused()) break;
      this.scheduleRetry(entry);

      const pair = byPair.get(entry.candidate.pairAddress);
      if (!pair || !this.passesPrefilter(pair, params)) continue;

      snapshotsTaken++;
      await this.scanAndDecide(pair, entry.candidate, users);
    }
  }

  private async scanAndDecide(pair: DexPair, candidate: PoolCandidate, users: Awaited<ReturnType<SettingsRepository['listEnabled']>>): Promise<void> {
    try {
      const snapshot = await this.snapshots.build(pair, candidate);
      const scan = await this.scans.upsert(snapshot.mint, {
        pairAddress: snapshot.pairAddress,
        symbol: snapshot.symbol,
        name: snapshot.name,
        snapshot,
      });
      await this.pipeline.process(snapshot, scan, users);
    } catch (error) {
      this.logger.debug(`Skipping ${pair.symbol}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async refreshWatchlist(): Promise<void> {
    const feeds: Array<[WatchSource, Promise<PoolCandidate[]>]> = [
      ['new', this.gecko.getNewPools(1)],
      ['new', this.gecko.getNewPools(2)],
      ['trending', this.gecko.getTrendingPools('1h')],
      ['trending', this.gecko.getTrendingPools('24h')],
    ];
    const results = await Promise.allSettled(feeds.map(([, request]) => request));
    results.forEach((result, index) => {
      if (result.status === 'rejected') return;
      for (const candidate of result.value) this.track(candidate, feeds[index]![0]);
    });
    this.prune();
  }

  private track(candidate: PoolCandidate, source: WatchSource): void {
    const existing = this.watchlist.get(candidate.mint);
    if (existing) {
      existing.lastSeenMs = Date.now();
      if (source === 'trending') existing.source = 'trending';
      return;
    }
    this.watchlist.set(candidate.mint, { candidate, source, lastSeenMs: Date.now(), attempts: 0, nextAttemptMs: 0 });
  }

  private prune(): void {
    const now = Date.now();
    for (const [mint, entry] of this.watchlist) {
      const expired =
        entry.source === 'trending'
          ? now - entry.lastSeenMs > ESTABLISHED_UNSEEN_LIMIT_MS
          : now - entry.candidate.createdAtMs > MAX_TOKEN_AGE_MS || entry.attempts >= MAX_ATTEMPTS;
      if (expired) this.watchlist.delete(mint);
    }
    if (this.watchlist.size <= MAX_WATCHLIST) return;

    const oldestFirst = [...this.watchlist.entries()].sort((a, b) => a[1].candidate.createdAtMs - b[1].candidate.createdAtMs);
    for (const [mint] of oldestFirst.slice(0, this.watchlist.size - MAX_WATCHLIST)) this.watchlist.delete(mint);
  }

  private pickDue(params: RuleParams[]): WatchEntry[] {
    const now = Date.now();
    const minAgeMs = Math.min(...params.map((p) => p.minTokenAgeSeconds)) * 1000;
    return [...this.watchlist.values()]
      .filter((entry) => now >= entry.nextAttemptMs && now - entry.candidate.createdAtMs >= minAgeMs)
      .sort((a, b) => b.candidate.createdAtMs - a.candidate.createdAtMs)
      .slice(0, MAX_PAIRS_PER_LOOKUP);
  }

  private scheduleRetry(entry: WatchEntry): void {
    if (entry.source === 'trending') {
      entry.nextAttemptMs = Date.now() + ESTABLISHED_RETRY_MS;
      return;
    }
    const delay = RETRY_DELAYS_MS[Math.min(entry.attempts, RETRY_DELAYS_MS.length - 1)] ?? Number.POSITIVE_INFINITY;
    entry.attempts++;
    entry.nextAttemptMs = Date.now() + delay;
  }

  private passesPrefilter(pair: DexPair, params: RuleParams[]): boolean {
    const minLiquidity = Math.min(...params.map((p) => p.minLiquidityUsd)) * PREFILTER_LIQUIDITY_FACTOR;
    const minCap = Math.min(...params.map((p) => p.minMarketCapUsd)) * PREFILTER_MARKET_CAP_LOW_FACTOR;
    const maxCap = Math.max(...params.map((p) => p.maxMarketCapUsd)) * PREFILTER_MARKET_CAP_HIGH_FACTOR;
    return (
      pair.liquidityUsd >= minLiquidity &&
      pair.marketCapUsd >= minCap &&
      pair.marketCapUsd <= maxCap &&
      pair.buys5m + pair.sells5m >= MIN_RECENT_TRANSACTIONS
    );
  }
}
