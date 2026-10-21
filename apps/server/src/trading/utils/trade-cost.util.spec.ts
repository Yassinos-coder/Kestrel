import { describe, expect, it } from 'vitest';
import { TradeCostUtil } from './trade-cost.util';

const pool = { priceSol: 0.0001, quoteReserveSol: 200, liquidityUsd: 40_000 };

describe('TradeCostUtil', () => {
  it('makes costs visible: fees, impact and fixed fees push the break-even above zero', () => {
    const cost = TradeCostUtil.estimate(0.3, pool);
    expect(cost.roundTripCostPct).toBeGreaterThan(3);
    expect(cost.breakEvenMovePct).toBeGreaterThan(cost.roundTripCostPct);
    expect(cost.swapFeePct).toBe(2);
  });

  it('shows fixed fees hurting small positions more than larger ones', () => {
    const small = TradeCostUtil.estimate(0.02, pool);
    const large = TradeCostUtil.estimate(0.5, pool);
    expect(small.roundTripCostPct).toBeGreaterThan(large.roundTripCostPct);
  });

  it('shows thin pools costing more through price impact', () => {
    const thin = TradeCostUtil.estimate(1, { ...pool, quoteReserveSol: 20 });
    expect(thin.roundTripCostPct).toBeGreaterThan(TradeCostUtil.estimate(1, pool).roundTripCostPct);
  });

  it('refuses a trade whose costs are too high', () => {
    const tiny = TradeCostUtil.estimate(0.004, pool);
    expect(TradeCostUtil.check(tiny, 2).ok).toBe(false);
  });

  it('refuses a scalp target that barely clears break-even', () => {
    const cost = TradeCostUtil.estimate(0.3, pool);
    expect(TradeCostUtil.check(cost, 1.08).ok).toBe(false);
    expect(TradeCostUtil.check(cost, 1.5).ok).toBe(true);
  });
});
