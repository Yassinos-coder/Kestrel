import type { PlaybookFeature } from '@kestrel/shared';
import type { DayStats, FeatureComparison, RejectionStats, TradeSummary } from '../interfaces/review.interface';

const FEATURE_KEYS: PlaybookFeature[] = [
  'top10Pct',
  'top1HolderPct',
  'bundledSupplyPct',
  'sniperSupplyPct',
  'liquidityUsd',
  'marketCapUsd',
  'ageSeconds',
  'priceChange5mPct',
  'uniqueTraders5m',
  'buySellRatio5m',
  'holderGrowth5mPct',
  'liquidityToMarketCapPct',
  'priceChange1hPct',
  'volumeTrendRatio',
  'freshWalletPct',
  'sameFunderPct',
  'earlyBuyerHoldPct',
];
const TOP_RULES = 5;

export class ReviewStatsBuilder {
  static dayStats(trades: TradeSummary[]): DayStats {
    const wins = trades.filter((trade) => trade.pnlPct > 0);
    const losses = trades.filter((trade) => trade.pnlPct <= 0);
    const exitReasons: Record<string, number> = {};
    for (const trade of trades) exitReasons[trade.exitReason] = (exitReasons[trade.exitReason] ?? 0) + 1;

    return {
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRatePct: trades.length ? (wins.length / trades.length) * 100 : 0,
      totalPnlSol: trades.reduce((sum, trade) => sum + trade.pnlSol, 0),
      avgWinPct: ReviewStatsBuilder.average(wins.map((trade) => trade.pnlPct)),
      avgLossPct: ReviewStatsBuilder.average(losses.map((trade) => trade.pnlPct)),
      bestPct: trades.length ? Math.max(...trades.map((trade) => trade.pnlPct)) : 0,
      worstPct: trades.length ? Math.min(...trades.map((trade) => trade.pnlPct)) : 0,
      exitReasons,
    };
  }

  static compareFeatures(trades: TradeSummary[]): FeatureComparison[] {
    const winners = trades.filter((trade) => trade.pnlPct > 0);
    const losers = trades.filter((trade) => trade.pnlPct <= 0);
    if (!winners.length || !losers.length) return [];

    return FEATURE_KEYS.map((feature) => ({
      feature,
      winnersAvg: ReviewStatsBuilder.round(ReviewStatsBuilder.average(winners.map((trade) => trade.features[feature]))),
      losersAvg: ReviewStatsBuilder.round(ReviewStatsBuilder.average(losers.map((trade) => trade.features[feature]))),
    }));
  }

  static rejections(actions: Array<{ action: string; hardFailures: string[] }>): RejectionStats {
    const counts = new Map<string, number>();
    for (const item of actions) {
      for (const rule of item.hardFailures) counts.set(rule, (counts.get(rule) ?? 0) + 1);
    }
    return {
      buys: actions.filter((item) => item.action === 'BUY').length,
      skips: actions.filter((item) => item.action === 'SKIP').length,
      rejected: actions.filter((item) => item.action === 'REJECTED').length,
      topRejectionRules: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_RULES)
        .map(([rule, count]) => ({ rule, count })),
    };
  }

  private static average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private static round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
