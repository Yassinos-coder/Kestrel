import type { ChecklistReport, Playbook, TradeFeatures } from '@kestrel/shared';
import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import type { ActiveRules } from '../../rules/interfaces/active-rules.interface';
import type { AnalystReport } from '../schemas/agent-outputs.schema';

export interface LessonSummary {
  symbol: string;
  outcomePct: number;
  exitReason: string;
  lesson: string;
  tags: string[];
}

export interface PortfolioContext {
  equitySol: number;
  cashSol: number;
  openPositions: number;
  dailyLossPct: number;
  dailyLossLimitPct: number;
}

export interface TraderInput {
  snapshot: TokenMarketSnapshot;
  report: ChecklistReport;
  analyst: AnalystReport | null;
  portfolio: PortfolioContext;
  rules: ActiveRules;
  matchedPlaybooks: Playbook[];
  lessons: LessonSummary[];
}

export interface PostMortemInput {
  symbol: string;
  features: TradeFeatures;
  plan: { style: string; maxHoldMinutes: number; takeProfitMultiple: number; stopLossPct: number };
  entryReasoning: string;
  peakMultiple: number;
  exitMultiple: number;
  heldMinutes: number;
  exitReason: string;
  pnlPct: number;
}
