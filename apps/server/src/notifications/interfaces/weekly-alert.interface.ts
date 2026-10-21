import type { TradingMode } from '@kestrel/shared';

export interface WeeklyTradeLine {
  symbol: string;
  pnlPct: number;
  pnlSol: number;
  exitReason: string;
}

export interface WeeklyDayLine {
  label: string;
  pnlSol: number;
  trades: number;
}

export interface WeeklyAlert {
  mode: TradingMode;
  periodLabel: string;
  tradeCount: number;
  wins: number;
  losses: number;
  winRatePct: number;
  netPnlSol: number;
  netPnlPct: number;
  solUsd: number;
  avgWinPct: number;
  avgLossPct: number;
  avgHoldMinutes: number;
  best: WeeklyTradeLine | null;
  worst: WeeklyTradeLine | null;
  trades: WeeklyTradeLine[];
  byDay: WeeklyDayLine[];
  reviewCount: number;
  ruleChangeCount: number;
  versionFrom: number | null;
  versionTo: number | null;
  equitySol: number;
  openPositions: number;
}
