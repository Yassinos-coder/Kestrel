import type { PlaybookFeature, TradeFeatures } from '@kestrel/shared';

export interface TradeSummary {
  id: string;
  symbol: string;
  pnlPct: number;
  pnlSol: number;
  peakMultiple: number;
  exitMultiple: number;
  heldMinutes: number;
  exitReason: string;
  style: string;
  features: TradeFeatures;
  matchedPlaybooks: string[];
}

export interface ScoredTrade {
  trade: TradeSummary;
  score: number;
  reasons: string[];
}

export interface DayStats {
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  totalPnlSol: number;
  avgWinPct: number;
  avgLossPct: number;
  bestPct: number;
  worstPct: number;
  exitReasons: Record<string, number>;
}

export interface FeatureComparison {
  feature: PlaybookFeature;
  winnersAvg: number;
  losersAvg: number;
}

export interface RejectionStats {
  buys: number;
  skips: number;
  rejected: number;
  topRejectionRules: Array<{ rule: string; count: number }>;
}
