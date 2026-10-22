import { GONE_CHANGE_PCT, OUTCOME_HORIZONS } from '../constants/outcome.constant';
import type { OutcomeChanges, OutcomeField, OutcomeSnapshot } from '../interfaces/outcome.interface';

const PERCENT = 100;

export class OutcomeCalculator {
  static changePct(baseMarketCapUsd: number, currentMarketCapUsd: number | null): number {
    if (currentMarketCapUsd === null || currentMarketCapUsd <= 0) return GONE_CHANGE_PCT;
    return ((currentMarketCapUsd - baseMarketCapUsd) / baseMarketCapUsd) * PERCENT;
  }

  static dueFields(ageMs: number, existing: OutcomeSnapshot | null): OutcomeField[] {
    return OUTCOME_HORIZONS.filter((horizon) => ageMs >= horizon.afterMs && (existing?.[horizon.field] ?? null) === null).map(
      (horizon) => horizon.field,
    );
  }

  static withPeak(changes: OutcomeChanges, existing: OutcomeSnapshot | null): OutcomeChanges {
    const known = [
      existing?.peakChangePct ?? null,
      existing?.change1hPct ?? null,
      existing?.change4hPct ?? null,
      existing?.change24hPct ?? null,
      changes.change1hPct ?? null,
      changes.change4hPct ?? null,
      changes.change24hPct ?? null,
    ].filter((value): value is number => value !== null);
    return known.length ? { ...changes, peakChangePct: Math.max(...known) } : changes;
  }
}
