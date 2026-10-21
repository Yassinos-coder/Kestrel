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

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
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
  marketCapUsd: number;
  pairAddress: string;
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

export interface ExitSeller {
  wallet: string;
  role: 'creator' | 'top-holder' | 'early-buyer' | 'other';
  tokens: number;
  sharePct: number;
}

export interface ExitEvidence {
  sellStreak: number;
  uniqueSellers: number;
  windowMinutes: number;
  sellVsBuyVolume: number;
  soldByCreator: boolean;
  topHoldersSelling: number;
  earlyBuyersSelling: number;
  otherSellers: number;
  topSellers: ExitSeller[];
}

export interface PositionDetail extends PositionView {
  trades: TradeView[];
  exitEvidence: ExitEvidence | null;
}

export interface CostEstimateView {
  sizeSol: number;
  roundTripCostSol: number;
  roundTripCostPct: number;
  breakEvenMovePct: number;
  entryImpactPct: number;
  swapFeePct: number;
  fixedCostSol: number;
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
  costs: CostEstimateView | null;
  marketCapUsd: number | null;
  pairAddress: string | null;
  createdAt: string;
}

export interface SuggestionResult {
  decision: DecisionView;
  positionOpened: boolean;
}

export interface ProfitabilityView {
  tradingPnlSol: number;
  tradingFeesSol: number;
  aiCostSol: number;
  aiCostUsd: number;
  aiCalls: number;
  netProfitSol: number;
  todayNetProfitSol: number;
  profitable: boolean;
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
  openPositionCount: number;
  profitability: ProfitabilityView;
  engine: EngineStatus;
}

export interface EngineStatus {
  entriesPausedReason: string | null;
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

export type WalletTier = 'A' | 'B' | 'C';

export interface WalletStatsView {
  swapsAnalyzed: number;
  solSidedPct: number;
  tokensTraded: number;
  closedTokens: number;
  winRatePct: number;
  totalPnlSol: number;
  avgPnlPerTokenSol: number;
  bestTokenSharePct: number;
  medianHoldMinutes: number;
  swapsPerDay: number;
  spanDays: number;
  avgBuySol: number;
  earlyEntryPct: number | null;
  lastActiveMs: number;
}

export interface SmartWalletView {
  id: string;
  address: string;
  tier: WalletTier;
  score: number;
  stats: WalletStatsView;
  lastActiveAt: string | null;
  followId: string | null;
  followStatus: string | null;
}

export interface FollowInput {
  budgetSol: number;
  maxPerTradeSol: number;
  maxLossSol: number;
  minLiquidityUsd: number;
  mirrorSells: boolean;
  requireSecuredLp: boolean;
}

export interface CopyFollowView extends FollowInput {
  id: string;
  walletId: string;
  walletAddress: string;
  tier: WalletTier;
  score: number;
  status: string;
  deployedSol: number;
  realizedPnlSol: number;
  openPnlSol: number;
  openPositions: number;
  closedTrades: number;
  winRatePct: number;
  createdAt: string;
}
