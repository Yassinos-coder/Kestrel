import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import type { HolderForensics } from '../interfaces/holder-forensics.interface';

export class ForensicsMerger {
  static apply(snapshot: TokenMarketSnapshot, forensics: HolderForensics): TokenMarketSnapshot {
    return {
      ...snapshot,
      holders: {
        ...snapshot.holders,
        top10Pct: Math.max(snapshot.holders.top10Pct, forensics.top10Pct),
        top1Pct: Math.max(snapshot.holders.top1Pct, forensics.top1Pct),
        totalHolders: Math.max(snapshot.holders.totalHolders, forensics.holderCount),
      },
      clusters: {
        bundledSupplyPct: Math.max(snapshot.clusters.bundledSupplyPct, forensics.sameFunderPct, forensics.freshWalletPct * 0.5),
        sniperSupplyPct: Math.max(snapshot.clusters.sniperSupplyPct, forensics.earlyBuyerHoldPct),
      },
      forensics,
    };
  }
}
