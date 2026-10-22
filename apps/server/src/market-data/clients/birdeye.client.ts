import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import { BIRDEYE_BASE_URL } from '../constants/market-data.constant';
import type { BirdeyeTradersResponse, BirdeyeWalletSummaryResponse, TopTrader, WalletPerformanceSummary } from '../interfaces/birdeye.interface';
import { BirdeyeTraderMapper } from '../mappers/birdeye-trader.mapper';
import { BirdeyeWalletSummaryMapper } from '../mappers/birdeye-wallet-summary.mapper';

const REQUEST_INTERVAL_MS = 1_100;
const TRADERS_PER_TOKEN = 10;
const TRADERS_TIME_FRAME = '7d';
const SUMMARY_DURATION = '30d';
const BIRDEYE_TIMEOUT_MS = 10_000;

@Injectable()
export class BirdeyeClient {
  private readonly logger = new Logger(BirdeyeClient.name);
  private readonly apiKey: string | undefined;
  private nextSlotMs = 0;
  private warned = false;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('birdeye.apiKey') || undefined;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async getTopTraders(mint: string): Promise<TopTrader[]> {
    if (!this.apiKey) return [];
    const smart = await this.fetchTraders(mint, 'smart_trader');
    const general = await this.fetchTraders(mint);
    const seen = new Set(smart.map((trader) => trader.wallet));
    return [...smart, ...general.filter((trader) => !seen.has(trader.wallet))];
  }

  async getWalletSummary(wallet: string): Promise<WalletPerformanceSummary | null> {
    const response = await this.get<BirdeyeWalletSummaryResponse>('/wallet/v2/pnl/summary', { wallet, duration: SUMMARY_DURATION });
    return response ? BirdeyeWalletSummaryMapper.toSummary(response) : null;
  }

  private async fetchTraders(mint: string, tag?: string): Promise<TopTrader[]> {
    const response = await this.get<BirdeyeTradersResponse>('/defi/v2/tokens/top_traders', {
      address: mint,
      time_frame: TRADERS_TIME_FRAME,
      sort_by: 'realized_pnl',
      sort_type: 'desc',
      limit: String(TRADERS_PER_TOKEN),
      ...(tag ? { wallet_tags: tag } : {}),
    });
    return response ? BirdeyeTraderMapper.toTraders(response) : [];
  }

  private async get<T>(path: string, query: Record<string, string>): Promise<T | null> {
    if (!this.apiKey) return null;
    await this.waitForSlot();
    try {
      return await HttpFetcher.json<T>(`${BIRDEYE_BASE_URL}${path}?${new URLSearchParams(query).toString()}`, {
        headers: { 'X-API-KEY': this.apiKey, 'x-chain': 'solana' },
        timeoutMs: BIRDEYE_TIMEOUT_MS,
        retries: 1,
      });
    } catch (error) {
      this.warnOnce(path, error);
      return null;
    }
  }

  private waitForSlot(): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, this.nextSlotMs);
    this.nextSlotMs = slot + REQUEST_INTERVAL_MS;
    if (slot === now) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, slot - now));
  }

  private warnOnce(path: string, error: unknown): void {
    if (this.warned) return;
    this.warned = true;
    this.logger.warn(`Birdeye ${path} unavailable, wallet discovery continues without it: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}
