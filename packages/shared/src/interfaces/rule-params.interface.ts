export interface RuleParams {
  minLiquidityUsd: number;
  maxTop10HolderPct: number;
  maxTop1HolderPct: number;
  maxBundledSupplyPct: number;
  maxSniperSupplyPct: number;
  minTokenAgeSeconds: number;
  minMarketCapUsd: number;
  maxMarketCapUsd: number;
  maxPriceChange5mPct: number;
  minUniqueTraders5m: number;
  minBuySellRatio5m: number;
  maxBuySellRatio5m: number;
  minSoftScore: number;
  minConfidence: number;
  maxPositionPct: number;
  maxOpenPositions: number;
  dailyLossLimitPct: number;
  stopLossPct: number;
  trailingStopPct: number;
  maxHoldMinutes: number;
  sellStreakExit: number;
  takeProfit1Multiple: number;
  takeProfit1SellPct: number;
  takeProfit2Multiple: number;
  takeProfit2SellPct: number;
}

export type RuleParamKey = keyof RuleParams;

export type PlaybookFeature =
  | 'top10Pct'
  | 'top1HolderPct'
  | 'bundledSupplyPct'
  | 'sniperSupplyPct'
  | 'liquidityUsd'
  | 'marketCapUsd'
  | 'ageSeconds'
  | 'priceChange5mPct'
  | 'uniqueTraders5m'
  | 'buySellRatio5m'
  | 'holderGrowth5mPct'
  | 'liquidityToMarketCapPct'
  | 'priceChange1hPct'
  | 'volumeTrendRatio'
  | 'freshWalletPct'
  | 'sameFunderPct'
  | 'earlyBuyerHoldPct';

export type TradeFeatures = Record<PlaybookFeature, number>;

export type PlaybookOperator = '>' | '>=' | '<' | '<=';

export interface PlaybookCondition {
  feature: PlaybookFeature;
  operator: PlaybookOperator;
  value: number;
}

export interface PlaybookEffect {
  block?: boolean;
  sizeMultiplier?: number;
  maxHoldMinutes?: number;
  takeProfitMultiple?: number;
  stopLossPct?: number;
  scalp?: boolean;
}

export interface Playbook {
  id: string;
  name: string;
  conditions: PlaybookCondition[];
  effect: PlaybookEffect;
  rationale: string;
  evidenceTradeIds: string[];
  createdAt: string;
}

export interface RuleChange {
  kind: 'param' | 'playbook-added' | 'playbook-removed';
  target: string;
  from: string | number | null;
  to: string | number | null;
  rationale: string;
}
