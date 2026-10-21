import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import { HeliusClient } from '../../market-data/clients/helius.client';
import type { HolderAccount, SwapHistory, WalletProfile } from '../../market-data/interfaces/helius.interface';
import type { HolderForensics } from '../interfaces/holder-forensics.interface';
import { ForensicsAnalyzer } from '../utils/forensics-analyzer.util';

const MAX_SWAP_SIGNATURES = 600;
const PROFILED_HOLDERS = 10;
const CONCURRENCY = 4;
const CACHE_MS = 30 * 60_000;
const FRESH_FUNDING_LOOKBACK_HOURS = 24 * 14;
const EMPTY_HISTORY: SwapHistory = { swaps: [], reachedStart: false };

interface CacheEntry {
  at: number;
  value: HolderForensics;
}

@Injectable()
export class ForensicsService {
  private readonly logger = new Logger(ForensicsService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly enabled: boolean;

  constructor(
    private readonly helius: HeliusClient,
    configService: ConfigService,
  ) {
    this.enabled = configService.get<boolean>('engine.forensicsEnabled') !== false;
  }

  isAvailable(): boolean {
    return this.enabled && this.helius.isAvailable();
  }

  async analyze(snapshot: TokenMarketSnapshot): Promise<HolderForensics | null> {
    if (!this.isAvailable()) return null;
    const cached = this.cache.get(snapshot.mint);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

    try {
      const value = await this.run(snapshot);
      this.cache.set(snapshot.mint, { at: Date.now(), value });
      return value;
    } catch (error) {
      this.logger.warn(`Forensics failed for ${snapshot.symbol}: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    }
  }

  private async run(snapshot: TokenMarketSnapshot): Promise<HolderForensics> {
    const nowMs = Date.now();
    const excluded = new Set([...snapshot.holders.excludedOwners, snapshot.pairAddress]);

    const [topHolders, history] = await Promise.all([this.helius.getTopHolders(snapshot.mint), this.swapHistory(snapshot)]);
    const profiles = await this.profile(this.topOwners(topHolders, excluded), nowMs);
    const funders = await this.fundersOfFreshWallets(profiles);

    return ForensicsAnalyzer.analyze({
      topHolders,
      holderCount: snapshot.holders.totalHolders,
      supplyRaw: snapshot.holders.supplyRaw,
      excludedOwners: excluded,
      swaps: history.swaps,
      swapsReachedStart: history.reachedStart,
      profiles,
      funders,
      nowMs,
    });
  }

  private async swapHistory(snapshot: TokenMarketSnapshot): Promise<SwapHistory> {
    const vault = await this.helius.findPoolVault(snapshot.pairAddress, snapshot.mint);
    if (!vault) return EMPTY_HISTORY;
    return this.helius.getSwapHistory(vault, snapshot.mint, MAX_SWAP_SIGNATURES);
  }

  private topOwners(holders: HolderAccount[], excluded: Set<string>): string[] {
    return holders
      .filter((holder) => !excluded.has(holder.owner))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, PROFILED_HOLDERS)
      .map((holder) => holder.owner);
  }

  private async profile(owners: string[], nowMs: number): Promise<Map<string, WalletProfile>> {
    const results = await this.mapLimited(owners, (owner) => this.helius.getWalletProfile(owner, nowMs));
    return new Map(results.flatMap((profile) => (profile ? [[profile.address, profile] as const] : [])));
  }

  private async fundersOfFreshWallets(profiles: Map<string, WalletProfile>): Promise<Map<string, string | null>> {
    const wallets = [...profiles.values()].filter((profile) => profile.oldestSignature && (profile.ageHours === null || profile.ageHours < FRESH_FUNDING_LOOKBACK_HOURS));
    const funders = await this.mapLimited(wallets, async (profile) => ({
      wallet: profile.address,
      funder: await this.helius.getFunder(profile.oldestSignature!, profile.address),
    }));
    return new Map(funders.flatMap((entry) => (entry ? [[entry.wallet, entry.funder] as const] : [])));
  }

  private async mapLimited<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<Array<R | null>> {
    const results: Array<R | null> = [];
    for (let index = 0; index < items.length; index += CONCURRENCY) {
      const batch = items.slice(index, index + CONCURRENCY);
      const settled = await Promise.allSettled(batch.map(work));
      results.push(...settled.map((outcome) => (outcome.status === 'fulfilled' ? outcome.value : null)));
    }
    return results;
  }
}
