import { describe, expect, it } from 'vitest';
import { ExitSnapshotBuilder } from './exit-snapshot.builder';

describe('ExitSnapshotBuilder', () => {
  it('captures what the guardian saw at the moment of the decision', () => {
    const nowMs = 1_800_000_000_000;
    const snapshot = ExitSnapshotBuilder.build({
      openedAtMs: nowMs - 20 * 60_000,
      entryPriceSol: 1,
      peakPriceSol: 1.4,
      priceSol: 1.07,
      nowMs,
      signals: {
        creatorSold: false,
        sellStreak: 2,
        topHoldersSelling: 1,
        liquidityUsd: 37_466.4,
        flow: { trades: 40, buyers: 20, sellers: 25, buyVolumeSol: 6, sellVolumeSol: 5 },
      },
      reason: 'hold limit of 20 minutes reached',
    });
    expect(snapshot).toMatchObject({
      heldMinutes: 20,
      priceMultiple: 1.07,
      peakMultiple: 1.4,
      sellStreak: 2,
      topHoldersSelling: 1,
      liquidityUsd: 37_466,
      reason: 'hold limit of 20 minutes reached',
    });
    expect(snapshot.flow).toEqual({ trades: 40, buyers: 20, sellers: 25, buyVolumeSol: 6, sellVolumeSol: 5 });
  });
});
