import { describe, expect, it } from 'vitest';
import { DEFAULT_RULE_PARAMS } from '../../rules/constants/default-rule-params.constant';
import { ExitPlanResolver } from './exit-plan.resolver';

const noEffect = { matched: [], block: false, scalp: false, sizeMultiplier: 1, maxHoldMinutes: null, takeProfitMultiple: null, stopLossPct: null };

describe('ExitPlanResolver', () => {
  it('sells enough at the first target to recover the entry cost', () => {
    expect(ExitPlanResolver.recoupPct(2)).toBe(53);
    expect(ExitPlanResolver.recoupPct(1.5)).toBe(70);
    expect(ExitPlanResolver.recoupPct(1.05)).toBe(100);
  });

  it('never sells less than the recoup share at the first target', () => {
    const params = { ...DEFAULT_RULE_PARAMS, takeProfit1Multiple: 2, takeProfit1SellPct: 25 };
    const { exitPlan } = ExitPlanResolver.resolve(params, null, noEffect);
    expect(exitPlan.tp1Multiple).toBe(2);
    expect(exitPlan.tp1SellPct).toBe(53);
  });

  it('keeps the larger scalp sell when it already covers the cost', () => {
    const { exitPlan } = ExitPlanResolver.resolve(DEFAULT_RULE_PARAMS, { style: 'scalp', maxHoldMinutes: 15, takeProfitMultiple: 1.5, stopLossPct: 30 }, noEffect);
    expect(exitPlan.tp1SellPct).toBe(80);
  });
});
