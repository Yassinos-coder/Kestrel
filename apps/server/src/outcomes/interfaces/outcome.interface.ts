import type { OUTCOME_HORIZONS } from '../constants/outcome.constant';

export type OutcomeField = (typeof OUTCOME_HORIZONS)[number]['field'];

export type OutcomeChanges = Partial<Record<OutcomeField, number>> & { peakChangePct?: number };

export interface OutcomeSnapshot {
  change1hPct: number | null;
  change4hPct: number | null;
  change24hPct: number | null;
  peakChangePct: number | null;
}
