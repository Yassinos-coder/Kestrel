import type { BirdeyeWalletSummaryResponse, WalletPerformanceSummary } from '../interfaces/birdeye.interface';

const PERCENT = 100;

export class BirdeyeWalletSummaryMapper {
  static toSummary(response: BirdeyeWalletSummaryResponse): WalletPerformanceSummary | null {
    const summary = response.data?.summary;
    if (!summary?.counts || !summary.pnl) return null;
    return {
      uniqueTokens: summary.unique_tokens ?? 0,
      trades: summary.counts.total_trade ?? 0,
      wins: summary.counts.total_win ?? 0,
      losses: summary.counts.total_loss ?? 0,
      winRatePct: (summary.counts.win_rate ?? 0) * PERCENT,
      realizedProfitUsd: summary.pnl.realized_profit_usd ?? 0,
      realizedProfitPct: summary.pnl.realized_profit_percent ?? 0,
    };
  }
}
