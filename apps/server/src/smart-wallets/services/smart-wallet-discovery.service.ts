import { Injectable, Logger, NotFoundException, ServiceUnavailableException, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WalletDiscoveryResult } from '@kestrel/shared';
import { DexScreenerClient } from '../../market-data/clients/dexscreener.client';
import { GeckoTerminalClient } from '../../market-data/clients/geckoterminal.client';
import { HeliusClient } from '../../market-data/clients/helius.client';
import type { SmartWallet } from '../../generated/prisma/client';
import type { TrendingWinner } from '../../market-data/interfaces/market-data.interface';
import type { WalletAssessment, WalletSwap } from '../interfaces/wallet.interface';
import { WalletSwapParserMapper } from '../mappers/wallet-swap-parser.mapper';
import { SmartWalletRepository } from '../repositories/smart-wallet.repository';
import { WalletPerformanceAnalyzer } from '../utils/wallet-performance.analyzer';
import { WalletScorer } from '../utils/wallet-scorer';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const WINNERS_PER_RUN = 8;
const CANDIDATES_PER_RUN = 25;
const REFRESH_PER_RUN = 5;
const MIN_WINNER_VOLUME_USD = 150_000;
const MAX_WINNER_VOLUME_USD = 15_000_000;
const MIN_WINNER_CHANGE_PCT = 30;
const SWAP_PAGE = 100;
const EXTRA_PAGES = 2;
const QUICK_MIN_TXS = 20;
const QUICK_MIN_SPAN_HOURS = 6;
const QUICK_MIN_SOL_SWAPS = 8;
const QUICK_MIN_MINTS = 5;
const RECHECK_MS = 12 * HOUR_MS;
const CONCURRENCY = 3;
const VAULT_SIGNATURES = 400;
const TOP_BUYERS = 15;
const MAX_MINTS_LOOKUP = 60;

@Injectable()
export class SmartWalletDiscoveryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SmartWalletDiscoveryService.name);
  private readonly checked = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly gecko: GeckoTerminalClient,
    private readonly dexScreener: DexScreenerClient,
    private readonly helius: HeliusClient,
    private readonly wallets: SmartWalletRepository,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const enabled = this.configService.get<boolean>('engine.enabled') && this.configService.get<boolean>('engine.walletDiscoveryEnabled');
    if (!enabled || !this.helius.isAvailable()) return;

    const intervalMs = this.configService.getOrThrow<number>('engine.walletDiscoveryMinutes') * MINUTE_MS;
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
    setTimeout(() => void this.runOnce(), 30_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<WalletDiscoveryResult> {
    if (!this.helius.isAvailable()) return { winners: 0, checked: 0, qualified: 0, status: 'unavailable' };
    if (this.running) return { winners: 0, checked: 0, qualified: 0, status: 'busy' };
    this.running = true;
    try {
      return await this.discover();
    } catch (error) {
      this.logger.warn(`Wallet discovery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { winners: 0, checked: 0, qualified: 0, status: 'ok' };
    } finally {
      this.running = false;
    }
  }

  private async discover(): Promise<WalletDiscoveryResult> {
    const winners = (await this.gecko.getTrendingWinners())
      .filter(
        (winner) => winner.volume24hUsd >= MIN_WINNER_VOLUME_USD && winner.volume24hUsd <= MAX_WINNER_VOLUME_USD && winner.change24hPct >= MIN_WINNER_CHANGE_PCT,
      )
      .sort((a, b) => b.change24hPct - a.change24hPct)
      .slice(0, WINNERS_PER_RUN);

    const appearances = new Map<string, number>();
    for (const winner of winners) {
      for (const address of new Set(await this.walletsFromToken(winner))) appearances.set(address, (appearances.get(address) ?? 0) + 1);
    }
    const ranked = [...appearances.entries()].sort((a, b) => b[1] - a[1]).map(([address]) => address);

    const refresh = (await this.wallets.listOldestUpdated(REFRESH_PER_RUN)).map((wallet) => wallet.address);
    const queue = [...refresh, ...ranked.filter((address) => !this.recentlyChecked(address))].slice(0, CANDIDATES_PER_RUN + REFRESH_PER_RUN);

    const outcomes = await this.mapLimited(queue, (address) => this.evaluate(address));
    const qualified = outcomes.filter(Boolean).length;
    this.logger.log(`Wallet discovery: ${winners.length} winning tokens, ${queue.length} wallets checked, ${qualified} qualified`);
    return { winners: winners.length, checked: queue.length, qualified, status: 'ok' };
  }

  async addManually(address: string, force = false): Promise<SmartWallet> {
    if (!this.helius.isAvailable()) throw new ServiceUnavailableException('Wallet analysis needs the Helius API key');
    const existing = await this.wallets.findByAddress(address);
    if (existing) return existing;

    const assessment = await this.assess(address, force);
    if (!assessment) throw new NotFoundException('Not enough swap history on this wallet to copy it');
    return this.wallets.upsert(address, assessment);
  }

  private async walletsFromToken(winner: TrendingWinner): Promise<string[]> {
    try {
      const [holders, vault] = await Promise.all([this.helius.getTopHolders(winner.mint), this.helius.findPoolVault(winner.pairAddress, winner.mint)]);
      const history = vault ? await this.helius.getSwapHistory(vault, winner.mint, VAULT_SIGNATURES) : { swaps: [], reachedStart: false };

      const netBought = new Map<string, number>();
      for (const swap of history.swaps) {
        netBought.set(swap.wallet, (netBought.get(swap.wallet) ?? 0) + (swap.side === 'buy' ? swap.tokenAmount : -swap.tokenAmount));
      }
      const buyers = [...netBought.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_BUYERS).map(([wallet]) => wallet);
      return [...holders.map((holder) => holder.owner), ...buyers].filter((address) => address !== winner.pairAddress);
    } catch {
      return [];
    }
  }

  private async evaluate(address: string): Promise<boolean> {
    this.checked.set(address, Date.now());
    try {
      const assessment = await this.assess(address);
      if (!assessment?.tier) {
        await this.wallets.markStale(address);
        return false;
      }
      await this.wallets.upsert(address, assessment);
      return true;
    } catch (error) {
      this.logger.debug(`Could not assess ${address.slice(0, 6)}: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    }
  }

  private async assess(address: string, skipQuickCheck = false): Promise<WalletAssessment | null> {
    const transactions = await this.helius.getWalletSwapTransactions(address, SWAP_PAGE);
    if (!skipQuickCheck && !this.passesQuickCheck(transactions, address)) return null;

    for (let page = 0; page < EXTRA_PAGES && transactions.length >= SWAP_PAGE * (page + 1); page++) {
      const more = await this.helius.getWalletSwapTransactions(address, SWAP_PAGE, transactions[transactions.length - 1]?.signature);
      if (!more.length) break;
      transactions.push(...more);
    }

    const swaps = transactions.flatMap((transaction) => {
      const swap = WalletSwapParserMapper.parse(transaction, address);
      return swap ? [swap] : [];
    });
    const created = await this.pairCreationTimes(swaps);
    const stats = WalletPerformanceAnalyzer.analyze({ swaps, totalSwapTransactions: transactions.length, pairCreatedAtMs: created });
    return WalletScorer.assess(stats, Date.now());
  }

  private passesQuickCheck(transactions: Array<{ timestamp: number }>, address: string): boolean {
    if (transactions.length < QUICK_MIN_TXS) return false;
    const times = transactions.map((transaction) => transaction.timestamp);
    const spanHours = (Math.max(...times) - Math.min(...times)) / 3_600;
    if (spanHours < QUICK_MIN_SPAN_HOURS) return false;

    const parsed = (transactions as Parameters<typeof WalletSwapParserMapper.parse>[0][]).flatMap((transaction) => {
      const swap = WalletSwapParserMapper.parse(transaction, address);
      return swap ? [swap] : [];
    });
    return parsed.length >= QUICK_MIN_SOL_SWAPS && new Set(parsed.map((swap) => swap.mint)).size >= QUICK_MIN_MINTS;
  }

  private async pairCreationTimes(swaps: WalletSwap[]): Promise<Map<string, number>> {
    const mints = [...new Set(swaps.map((swap) => swap.mint))].slice(0, MAX_MINTS_LOOKUP);
    const created = new Map<string, number>();
    try {
      for (const pair of await this.dexScreener.getPairsForTokens(mints)) {
        const known = created.get(pair.mint);
        if (known === undefined || pair.createdAtMs < known) created.set(pair.mint, pair.createdAtMs);
      }
    } catch {
      return created;
    }
    return created;
  }

  private recentlyChecked(address: string): boolean {
    const at = this.checked.get(address);
    return at !== undefined && Date.now() - at < RECHECK_MS;
  }

  private async mapLimited<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (let index = 0; index < items.length; index += CONCURRENCY) {
      results.push(...(await Promise.all(items.slice(index, index + CONCURRENCY).map(work))));
    }
    return results;
  }
}
