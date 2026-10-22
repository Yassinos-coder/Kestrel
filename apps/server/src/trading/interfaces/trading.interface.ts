import type { ExitEvidence, TradeFeatures } from '@kestrel/shared';

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
  earlyBuyerWallets?: string[];
  exitEvidence?: ExitEvidence;
  exitSnapshot?: ExitSnapshot;
  holdExtension?: ExitSnapshot;
  copy?: CopyContext;
}

export interface ExitSnapshot {
  at: string;
  heldMinutes: number;
  priceMultiple: number;
  peakMultiple: number;
  flow: FlowSignal | null;
  sellStreak: number;
  topHoldersSelling: number;
  liquidityUsd: number;
  reason: string | null;
}

export interface CopyContext {
  followId: string;
  wallet: string;
  boughtTokens: number;
  soldTokens: number;
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

export interface FlowSignal {
  trades: number;
  buyers: number;
  sellers: number;
  buyVolumeSol: number;
  sellVolumeSol: number;
}

export interface ExitSignals {
  creatorSold: boolean;
  sellStreak: number;
  topHoldersSelling: number;
  liquidityUsd: number;
  flow: FlowSignal | null;
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
