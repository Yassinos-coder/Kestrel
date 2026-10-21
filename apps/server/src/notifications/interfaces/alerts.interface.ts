import type { PositionPlan, RuleChange, TradingMode } from '@kestrel/shared';

export interface BuyAlert {
  mode: TradingMode;
  symbol: string;
  mint: string;
  pairAddress: string;
  solAmount: number;
  solUsd: number;
  priceSol: number;
  confidence: number | null;
  plan: PositionPlan;
  reasoning: string;
  ruleVersion: number;
}

export interface SellAlert {
  mode: TradingMode;
  symbol: string;
  mint: string;
  pairAddress: string;
  reason: string;
  soldSol: number;
  pnlSol: number;
  pnlPct: number;
  closed: boolean;
  solUsd: number;
}

export interface LowFundsAlert {
  mode: TradingMode;
  availableSol: number;
  neededSol: number;
  solUsd: number;
}

export interface DailyLossAlert {
  mode: TradingMode;
  lossSol: number;
  lossPct: number;
  limitPct: number;
  solUsd: number;
}

export interface ReviewAlert {
  failedReason: string | null;
  windowLabel: string;
  tradesInWindow: number;
  tradesReviewed: number;
  summary: string;
  applied: RuleChange[];
  rejectedCount: number;
  versionBefore: number;
  versionAfter: number | null;
}
