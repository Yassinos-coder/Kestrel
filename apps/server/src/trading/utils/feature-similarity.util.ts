import type { PlaybookFeature, TradeFeatures } from '@kestrel/shared';

const SCALES: Record<PlaybookFeature, { scale: number; log?: boolean }> = {
  top10Pct: { scale: 60 },
  top1HolderPct: { scale: 40 },
  bundledSupplyPct: { scale: 40 },
  sniperSupplyPct: { scale: 40 },
  liquidityUsd: { scale: 5, log: true },
  marketCapUsd: { scale: 5, log: true },
  ageSeconds: { scale: 5, log: true },
  priceChange5mPct: { scale: 200 },
  uniqueTraders5m: { scale: 4, log: true },
  buySellRatio5m: { scale: 4 },
  holderGrowth5mPct: { scale: 50 },
  liquidityToMarketCapPct: { scale: 40 },
  priceChange1hPct: { scale: 300 },
  volumeTrendRatio: { scale: 4 },
};

export class FeatureSimilarity {
  static distance(a: TradeFeatures, b: TradeFeatures): number {
    const keys = Object.keys(SCALES) as PlaybookFeature[];
    const total = keys.reduce((sum, key) => {
      const { scale, log } = SCALES[key];
      const left = FeatureSimilarity.prepare(a[key] ?? 0, log);
      const right = FeatureSimilarity.prepare(b[key] ?? 0, log);
      return sum + ((left - right) / scale) ** 2;
    }, 0);
    return Math.sqrt(total / keys.length);
  }

  private static prepare(value: number, log: boolean | undefined): number {
    return log ? Math.log10(Math.max(value, 1)) : value;
  }
}
