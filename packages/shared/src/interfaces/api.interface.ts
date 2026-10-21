import type { ChecklistReport } from './checklist-report.interface';
import type { Playbook, RuleChange, RuleParams } from './rule-params.interface';

export type TradingMode = 'PAPER' | 'LIVE';
export type DecisionAction = 'BUY' | 'SKIP' | 'REJECTED';
export type PositionStatus = 'OPEN' | 'CLOSED';

export interface UserProfile {
  id: string;
  walletAddress: string;
  displayName: string | null;
  onboarded: boolean;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}

export interface TelegramStatus {
  configured: boolean;
  linked: boolean;
  botUsername: string | null;
  linkUrl: string | null;
}

export interface BotSettingsView {
  mode: TradingMode;
  enabled: boolean;
  startingPaperBalanceSol: number;
  paperCashSol: number;
  autoSweep: boolean;
  liveBankrollSol: number;
  liveAvailable: boolean;
  aiAvailable: boolean;
}

export interface WalletView {
  loginWalletAddress: string;
  botWalletAddress: string | null;
  botWalletBalanceSol: number | null;
  liveAvailable: boolean;
}

export interface PositionPlan {
  style: 'scalp' | 'swing' | 'runner';
  maxHoldMinutes: number;
  takeProfitMultiple: number;
  stopLossPct: number;
}

export interface PositionView {
  id: string;
  mode: TradingMode;
  mint: string;
  symbol: string;
  status: PositionStatus;
  entrySol: number;
  entryPriceSol: number;
  lastPriceSol: number;
  tokensHeld: number;
  currentValueSol: number;
  realizedSol: number;
  pnlSol: number;
  pnlPct: number;
  plan: PositionPlan;
  exitReason: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface TradeView {
  id: string;
  side: 'BUY' | 'SELL';
  reason: string;
  priceSol: number;
  solAmount: number;
  tokenAmount: number;
  feesSol: number;
  signature: string | null;
  createdAt: string;
}

export interface PositionDetail extends PositionView {
  trades: TradeView[];
}

export interface DecisionView {
  id: string;
  mint: string;
  symbol: string;
  action: DecisionAction;
  confidence: number | null;
  sizeSol: number | null;
  reasoning: string | null;
  report: ChecklistReport;
  plan: PositionPlan | null;
  createdAt: string;
}

export interface DashboardSummary {
  mode: TradingMode;
  enabled: boolean;
  equitySol: number;
  cashSol: number;
  openValueSol: number;
  startingBalanceSol: number;
  realizedPnlSol: number;
  todayPnlSol: number;
  winRatePct: number;
  closedTrades: number;
  openPositions: PositionView[];
  recentDecisions: DecisionView[];
  engine: EngineStatus;
}

export interface EngineStatus {
  scoutLastRunAt: string | null;
  guardianLastRunAt: string | null;
  watchlistSize: number;
  scannedToday: number;
}

export interface RuleSetView {
  version: number;
  active: boolean;
  source: string;
  summary: string;
  params: RuleParams;
  playbooks: Playbook[];
  changes: RuleChange[];
  createdAt: string;
}

export interface LessonView {
  id: string;
  symbol: string;
  outcomePct: number;
  exitReason: string;
  lesson: string;
  tags: string[];
  createdAt: string;
}

export interface ReviewRunView {
  id: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  tradesInWindow: number;
  tradesReviewed: number;
  summary: string | null;
  appliedChanges: RuleChange[];
  rejectedChanges: RuleChange[];
  ruleVersionAfter: number | null;
  error: string | null;
  startedAt: string;
}

export interface BrainView {
  activeRules: RuleSetView;
  versions: RuleSetView[];
  reviews: ReviewRunView[];
  lessons: LessonView[];
}
