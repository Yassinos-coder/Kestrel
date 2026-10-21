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
  lpBurnedOrLockedPct: number;
  exitPriceImpactPct: number;
}

export interface HolderSnapshot {
  top10Pct: number;
}

export interface ClusterSnapshot {
  bundledSupplyPct: number;
  sniperSupplyPct: number;
}

export interface CreatorSnapshot {
  hasSold: boolean;
  priorTokenCount: number;
  priorRugCount: number;
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

export interface SocialSignals {
  contractAddressVerified: boolean;
  accountAgeDays: number;
  copycatCount: number;
  botEngagementRatio: number;
}

export interface PortfolioSnapshot {
  openPositions: number;
  dailyLossPct: number;
}

export interface TokenSnapshot {
  mint: string;
  ageSeconds: number;
  marketCapUsd: number;
  priceChange5mPct: number;
  authorities: TokenAuthorities;
  extensions: TokenExtensions;
  liquidity: LiquiditySnapshot;
  holders: HolderSnapshot;
  clusters: ClusterSnapshot;
  creator: CreatorSnapshot;
  sellability: SellabilitySnapshot;
  activity: ActivitySnapshot;
  social: SocialSignals | null;
  portfolio: PortfolioSnapshot;
}
