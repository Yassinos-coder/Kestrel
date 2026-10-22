import type { PoolCandidate, PoolTrade } from '../interfaces/market-data.interface';

const WINDOW_MS = 5 * 60_000;

export class RecentTraders {
  static count(candidate: PoolCandidate | null, trades: PoolTrade[], nowMs: number): number {
    const reported = (candidate?.buyers5m ?? 0) + (candidate?.sellers5m ?? 0);
    if (reported > 0) return reported;

    const wallets = trades.filter((trade) => nowMs - trade.timestampMs <= WINDOW_MS).map((trade) => trade.wallet);
    return new Set(wallets).size;
  }
}
