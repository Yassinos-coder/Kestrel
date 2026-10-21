import type { TradeFeatures } from '@kestrel/shared';
import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';

const PERCENT = 100;

export class TradeFeaturesMapper {
  static fromSnapshot(snapshot: TokenMarketSnapshot): TradeFeatures {
    const liquidityToMarketCapPct = snapshot.marketCapUsd > 0 ? (snapshot.liquidity.usd / snapshot.marketCapUsd) * PERCENT : 0;
    return {
      top10Pct: snapshot.holders.top10Pct,
      top1HolderPct: snapshot.holders.top1Pct,
      bundledSupplyPct: snapshot.clusters.bundledSupplyPct,
      sniperSupplyPct: snapshot.clusters.sniperSupplyPct,
      liquidityUsd: snapshot.liquidity.usd,
      marketCapUsd: snapshot.marketCapUsd,
      ageSeconds: snapshot.ageSeconds,
      priceChange5mPct: snapshot.priceChange5mPct,
      uniqueTraders5m: snapshot.activity.uniqueTraders5m,
      buySellRatio5m: snapshot.activity.buySellRatio5m,
      holderGrowth5mPct: snapshot.activity.holderGrowth5mPct,
      liquidityToMarketCapPct,
      priceChange1hPct: snapshot.momentum.priceChange1hPct,
      volumeTrendRatio: snapshot.momentum.volumeTrendRatio,
      freshWalletPct: snapshot.forensics?.freshWalletPct ?? 0,
      sameFunderPct: snapshot.forensics?.sameFunderPct ?? 0,
      earlyBuyerHoldPct: snapshot.forensics?.earlyBuyerHoldPct ?? 0,
    };
  }
}
