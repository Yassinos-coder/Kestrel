import { describe, expect, it } from 'vitest';
import type { TradeFeatures } from '@kestrel/shared';
import { DayWindow } from '../../shared/utils/day-window.util';
import type { ExitSignals, OpenPositionState } from '../interfaces/trading.interface';
import { ExitRulesEvaluator } from './exit-rules.evaluator';
import { PaperFillCalculator } from './paper-fill.calculator';

const features = {} as TradeFeatures;
const NOW = 1_800_000_000_000;

const buildState = (overrides: Partial<OpenPositionState> = {}): OpenPositionState => ({
  entryPriceSol: 1,
  tokensBought: 1000,
  tokensHeld: 1000,
  peakPriceSol: 1,
  openedAtMs: NOW - 5 * 60_000,
  context: {
    decimals: 6,
    creator: 'Creator',
    topHolderOwners: ['A', 'B', 'C'],
    entryLiquidityUsd: 40_000,
    exitPlan: {
      tp1Multiple: 2,
      tp1SellPct: 50,
      tp2Multiple: 5,
      tp2SellPct: 25,
      stopLossPct: 45,
      trailingStopPct: 30,
      maxHoldMinutes: 240,
      sellStreakExit: 10,
    },
    tp1Done: false,
    tp2Done: false,
    features,
    ruleVersion: 1,
    matchedPlaybooks: [],
    reasoning: '',
  },
  ...overrides,
});

const calm: ExitSignals = { creatorSold: false, sellStreak: 0, topHoldersSelling: 0, liquidityUsd: 40_000, flow: null };
const flow = (buyers: number, sellers: number, buyVolumeSol = 10, sellVolumeSol = 10) => ({ trades: 30, buyers, sellers, buyVolumeSol, sellVolumeSol });
const scalpState = (heldMinutes: number, overrides: Partial<OpenPositionState> = {}): OpenPositionState => {
  const state = buildState({ openedAtMs: NOW - heldMinutes * 60_000, peakPriceSol: 1.4, ...overrides });
  state.context.exitPlan.maxHoldMinutes = 15;
  return state;
};

describe('ExitRulesEvaluator', () => {
  it('holds when nothing triggers', () => {
    expect(ExitRulesEvaluator.evaluate(buildState(), calm, 1.1, NOW)).toBeNull();
  });

  it('exits fully when the creator sells', () => {
    const action = ExitRulesEvaluator.evaluate(buildState(), { ...calm, creatorSold: true }, 1.1, NOW);
    expect(action?.full).toBe(true);
    expect(action?.reason).toContain('creator');
  });

  it('exits fully on a long run of consecutive sells', () => {
    const action = ExitRulesEvaluator.evaluate(buildState(), { ...calm, sellStreak: 10 }, 1.1, NOW);
    expect(action?.full).toBe(true);
    expect(action?.reason).toContain('consecutive sells');
  });

  it('exits fully when several top holders sell', () => {
    const action = ExitRulesEvaluator.evaluate(buildState(), { ...calm, topHoldersSelling: 3 }, 1.1, NOW);
    expect(action?.reason).toContain('top holders');
  });

  it('exits fully when liquidity collapses', () => {
    const action = ExitRulesEvaluator.evaluate(buildState(), { ...calm, liquidityUsd: 20_000 }, 1.1, NOW);
    expect(action?.reason).toContain('liquidity');
  });

  it('hits the stop loss', () => {
    const action = ExitRulesEvaluator.evaluate(buildState(), calm, 0.5, NOW);
    expect(action?.reason).toContain('stop loss');
  });

  it('hits the time stop', () => {
    const state = buildState({ openedAtMs: NOW - 241 * 60_000 });
    expect(ExitRulesEvaluator.evaluate(state, calm, 1.05, NOW)?.reason).toContain('hold limit');
  });

  it('exits when sellers clearly outnumber buyers', () => {
    const action = ExitRulesEvaluator.evaluate(buildState(), { ...calm, flow: flow(10, 20, 5, 12) }, 1.1, NOW);
    expect(action?.full).toBe(true);
    expect(action?.reason).toContain('sellers outnumber buyers 20 to 10');
  });

  it('ignores balanced or thin flow and the first minutes after entry', () => {
    expect(ExitRulesEvaluator.evaluate(buildState(), { ...calm, flow: flow(15, 16) }, 1.1, NOW)).toBeNull();
    expect(ExitRulesEvaluator.evaluate(buildState(), { ...calm, flow: { ...flow(2, 9), trades: 6 } }, 1.1, NOW)).toBeNull();
    const fresh = buildState({ openedAtMs: NOW - 60_000 });
    expect(ExitRulesEvaluator.evaluate(fresh, { ...calm, flow: flow(10, 30, 2, 20) }, 1.1, NOW)).toBeNull();
  });

  it('needs sell volume to confirm the seller count', () => {
    expect(ExitRulesEvaluator.evaluate(buildState(), { ...calm, flow: flow(10, 20, 30, 5) }, 1.1, NOW)).toBeNull();
  });

  it('keeps a profitable position past the hold limit while buyers still lead', () => {
    expect(ExitRulesEvaluator.evaluate(scalpState(20), { ...calm, flow: flow(20, 12, 12, 8) }, 1.35, NOW)).toBeNull();
  });

  it('still exits at the hold limit when flow is unknown, thin or the trade is not in profit', () => {
    expect(ExitRulesEvaluator.evaluate(scalpState(20), calm, 1.35, NOW)?.reason).toContain('hold limit');
    expect(ExitRulesEvaluator.evaluate(scalpState(20), { ...calm, flow: flow(20, 12) }, 0.95, NOW)?.reason).toContain('hold limit');
    expect(ExitRulesEvaluator.evaluate(scalpState(20), { ...calm, flow: { ...flow(20, 5), trades: 4 } }, 1.35, NOW)?.reason).toContain('hold limit');
  });

  it('trails the peak tightly during an extended hold', () => {
    const state = scalpState(20, { peakPriceSol: 1.6 });
    const action = ExitRulesEvaluator.evaluate(state, { ...calm, flow: flow(20, 12, 12, 8) }, 1.3, NOW);
    expect(action?.reason).toContain('after the planned hold');
  });

  it('forces an exit once the extension cap is reached', () => {
    expect(ExitRulesEvaluator.evaluate(scalpState(61), { ...calm, flow: flow(20, 12, 12, 8) }, 1.35, NOW)?.reason).toContain('hold limit');
  });

  it('lets the free remainder run past the hold limit after the cost is recovered', () => {
    const state = scalpState(40, { peakPriceSol: 2.4 });
    state.context.tp1Done = true;
    expect(ExitRulesEvaluator.evaluate(state, calm, 2.2, NOW)).toBeNull();
    expect(ExitRulesEvaluator.evaluate(state, calm, 1.5, NOW)?.reason).toContain('trailing');
    expect(ExitRulesEvaluator.evaluate(scalpState(65, { peakPriceSol: 2.4 }), calm, 2.2, NOW)).not.toBeNull();
  });

  it('takes the first profit step and marks it', () => {
    const action = ExitRulesEvaluator.evaluate(buildState(), calm, 2.1, NOW);
    expect(action?.full).toBe(false);
    expect(action?.markTp1).toBe(true);
    expect(action?.sellFraction).toBeCloseTo(0.5);
  });

  it('trails the peak once the first target is done', () => {
    const state = buildState({ peakPriceSol: 3 });
    state.context.tp1Done = true;
    const action = ExitRulesEvaluator.evaluate(state, calm, 2, NOW);
    expect(action?.reason).toContain('trailing');
  });
});

describe('PaperFillCalculator', () => {
  const pool = { priceSol: 0.0001, quoteReserveSol: 200, liquidityUsd: 40_000 };

  it('buys fewer tokens than the spot price implies', () => {
    const fill = PaperFillCalculator.buy(1, pool);
    expect(fill.tokenAmount).toBeLessThan(1 / pool.priceSol);
    expect(fill.priceSol).toBeGreaterThan(pool.priceSol);
  });

  it('loses money on an immediate round trip', () => {
    const buy = PaperFillCalculator.buy(1, pool);
    const sell = PaperFillCalculator.sell(buy.tokenAmount, pool);
    expect(sell.solAmount).toBeLessThan(1);
  });

  it('suffers more impact in a thin pool', () => {
    const thin = { ...pool, quoteReserveSol: 20 };
    const deep = PaperFillCalculator.buy(1, pool);
    const shallow = PaperFillCalculator.buy(1, thin);
    expect(shallow.priceSol).toBeGreaterThan(deep.priceSol);
  });
});

describe('DayWindow', () => {
  it('returns midnight in the requested time zone', () => {
    const now = new Date('2026-10-21T23:30:00Z');
    const start = DayWindow.startOfDay('UTC', now);
    expect(start.toISOString()).toBe('2026-10-21T00:00:00.000Z');
  });

  it('respects a positive offset zone', () => {
    const now = new Date('2026-10-21T23:30:00Z');
    const start = DayWindow.startOfDay('Asia/Tokyo', now);
    expect(start.toISOString()).toBe('2026-10-21T15:00:00.000Z');
  });
});
