import type { ExitSignals, ExitSnapshot } from '../interfaces/trading.interface';

const MINUTE_MS = 60_000;
const ROUND = 100;

export interface ExitSnapshotInput {
  openedAtMs: number;
  entryPriceSol: number;
  peakPriceSol: number;
  priceSol: number;
  nowMs: number;
  signals: ExitSignals;
  reason: string | null;
}

export class ExitSnapshotBuilder {
  static build(input: ExitSnapshotInput): ExitSnapshot {
    return {
      at: new Date(input.nowMs).toISOString(),
      heldMinutes: ExitSnapshotBuilder.round((input.nowMs - input.openedAtMs) / MINUTE_MS),
      priceMultiple: ExitSnapshotBuilder.round(input.priceSol / input.entryPriceSol),
      peakMultiple: ExitSnapshotBuilder.round(input.peakPriceSol / input.entryPriceSol),
      flow: input.signals.flow,
      sellStreak: input.signals.sellStreak,
      topHoldersSelling: input.signals.topHoldersSelling,
      liquidityUsd: Math.round(input.signals.liquidityUsd),
      reason: input.reason,
    };
  }

  private static round(value: number): number {
    return Math.round(value * ROUND) / ROUND;
  }
}
