import type { TradeFeatures } from '@kestrel/shared';

export interface ExitPlan {
  tp1Multiple: number;
  tp1SellPct: number;
  tp2Multiple: number;
  tp2SellPct: number;
  stopLossPct: number;
  trailingStopPct: number;
  maxHoldMinutes: number;
  sellStreakExit: number;
}

export interface PositionContext {
  decimals: number;
  creator: string | null;
  topHolderOwners: string[];
  entryLiquidityUsd: number;
  exitPlan: ExitPlan;
  tp1Done: boolean;
  tp2Done: boolean;
  features: TradeFeatures;
  ruleVersion: number;
  matchedPlaybooks: string[];
  reasoning: string;
}

export interface PoolState {
  priceSol: number;
  quoteReserveSol: number;
  liquidityUsd: number;
}

export interface Fill {
  tokenAmount: number;
  solAmount: number;
  feesSol: number;
  priceSol: number;
  signature: string | null;
}

export interface ExitSignals {
  creatorSold: boolean;
  sellStreak: number;
  topHoldersSelling: number;
  liquidityUsd: number;
}

export interface OpenPositionState {
  entryPriceSol: number;
  tokensBought: number;
  tokensHeld: number;
  peakPriceSol: number;
  openedAtMs: number;
  context: PositionContext;
}

export interface ExitAction {
  sellFraction: number;
  full: boolean;
  reason: string;
  markTp1?: boolean;
  markTp2?: boolean;
}
