import type { HolderForensics } from '../../forensics/interfaces/holder-forensics.interface';

export interface TokenAuthorities {
  mintRevoked: boolean;
  freezeRevoked: boolean;
}

export interface TokenExtensions {
  transferFee: boolean;
  transferHook: boolean;
  permanentDelegate: boolean;
}

export interface LiquiditySnapshot {
  usd: number;
  quoteSol: number;
  lpBurnedOrLockedPct: number;
  exitPriceImpactPct: number;
}

export interface HolderSnapshot {
  top10Pct: number;
  top1Pct: number;
  totalHolders: number;
  topHolderOwners: string[];
  excludedOwners: string[];
  supplyRaw: number;
}

export interface ClusterSnapshot {
  bundledSupplyPct: number;
  sniperSupplyPct: number;
}

export interface CreatorSnapshot {
  address: string | null;
  hasSold: boolean;
  priorTokenCount: number;
  priorRugCount: number;
  flaggedRugged: boolean;
}

export interface SellabilitySnapshot {
  routeExists: boolean;
  simulatedSellOk: boolean;
}

export interface ActivitySnapshot {
  uniqueTraders5m: number;
  buySellRatio5m: number;
  holderGrowth5mPct: number;
  washTradeSuspected: boolean;
}

export interface MomentumSnapshot {
  priceChange1hPct: number;
  volumeTrendRatio: number;
}

export interface PortfolioSnapshot {
  openPositions: number;
  dailyLossPct: number;
}

export interface TokenMarketSnapshot {
  mint: string;
  symbol: string;
  name: string;
  pairAddress: string;
  dexId: string;
  decimals: number;
  ageSeconds: number;
  marketCapUsd: number;
  priceSol: number;
  priceChange5mPct: number;
  authorities: TokenAuthorities;
  extensions: TokenExtensions;
  liquidity: LiquiditySnapshot;
  holders: HolderSnapshot;
  clusters: ClusterSnapshot;
  creator: CreatorSnapshot;
  sellability: SellabilitySnapshot;
  activity: ActivitySnapshot;
  momentum: MomentumSnapshot;
  forensics?: HolderForensics;
}

export interface TokenSnapshot extends TokenMarketSnapshot {
  portfolio: PortfolioSnapshot;
}
