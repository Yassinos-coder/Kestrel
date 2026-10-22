import { describe, expect, it } from 'vitest';
import { OutcomeCalculator } from './outcome-calculator.util';

const HOUR_MS = 60 * 60 * 1000;
const empty = { change1hPct: null, change4hPct: null, change24hPct: null, peakChangePct: null };

describe('OutcomeCalculator', () => {
  it('computes the percentage change in market cap', () => {
    expect(OutcomeCalculator.changePct(100_000, 180_000)).toBeCloseTo(80);
    expect(OutcomeCalculator.changePct(100_000, 25_000)).toBeCloseTo(-75);
  });

  it('treats a missing or dead pair as a total loss', () => {
    expect(OutcomeCalculator.changePct(100_000, null)).toBe(-100);
    expect(OutcomeCalculator.changePct(100_000, 0)).toBe(-100);
  });

  it('lists only the horizons that are due and still empty', () => {
    expect(OutcomeCalculator.dueFields(30 * 60_000, null)).toEqual([]);
    expect(OutcomeCalculator.dueFields(2 * HOUR_MS, empty)).toEqual(['change1hPct']);
    expect(OutcomeCalculator.dueFields(5 * HOUR_MS, { ...empty, change1hPct: 10 })).toEqual(['change4hPct']);
    expect(OutcomeCalculator.dueFields(25 * HOUR_MS, null)).toEqual(['change1hPct', 'change4hPct', 'change24hPct']);
  });

  it('keeps the highest change seen as the peak', () => {
    const first = OutcomeCalculator.withPeak({ change1hPct: 120 }, null);
    expect(first.peakChangePct).toBe(120);
    const second = OutcomeCalculator.withPeak({ change4hPct: -40 }, { ...empty, change1hPct: 120, peakChangePct: 120 });
    expect(second.peakChangePct).toBe(120);
  });
});
