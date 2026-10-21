import { describe, expect, it } from 'vitest';
import type { TradeFeatures } from '@kestrel/shared';
import { DEFAULT_RULE_PARAMS } from '../../rules/constants/default-rule-params.constant';
import type { MergedPlaybookEffect } from '../../rules/interfaces/rule-proposals.interface';
import { ExitPlanResolver } from './exit-plan.resolver';
import { FeatureSimilarity } from './feature-similarity.util';
import { PositionSizer } from './position-sizer.util';

const noEffect: MergedPlaybookEffect = {
  matched: [],
  block: false,
  scalp: false,
  sizeMultiplier: 1,
  maxHoldMinutes: null,
  takeProfitMultiple: null,
  stopLossPct: null,
};

const features: TradeFeatures = {
  top10Pct: 20,
  top1HolderPct: 8,
  bundledSupplyPct: 5,
  sniperSupplyPct: 5,
  liquidityUsd: 30_000,
  marketCapUsd: 200_000,
  ageSeconds: 900,
  priceChange5mPct: 30,
  uniqueTraders5m: 60,
  buySellRatio5m: 1.2,
  holderGrowth5mPct: 4,
  liquidityToMarketCapPct: 15,
  priceChange1hPct: 40,
  volumeTrendRatio: 1,
  freshWalletPct: 10,
  sameFunderPct: 0,
  earlyBuyerHoldPct: 12,
};

describe('PositionSizer', () => {
  const base = { params: DEFAULT_RULE_PARAMS, equitySol: 10, cashSol: 10, sizeFraction: 1, playbookMultiplier: 1, live: false };

  it('sizes from the equity ceiling', () => {
    expect(PositionSizer.size(base).sizeSol).toBeCloseTo(0.3);
  });

  it('shrinks with the fraction and the playbook multiplier', () => {
    expect(PositionSizer.size({ ...base, sizeFraction: 0.5, playbookMultiplier: 0.5 }).sizeSol).toBeCloseTo(0.075);
  });

  it('never spends more cash than is available', () => {
    expect(PositionSizer.size({ ...base, cashSol: 0.1 }).sizeSol).toBeCloseTo(0.1);
  });

  it('flags a position that would be too small', () => {
    expect(PositionSizer.size({ ...base, cashSol: 0.005 }).tooSmall).toBe(true);
  });

  it('keeps a fee reserve in live mode', () => {
    expect(PositionSizer.size({ ...base, cashSol: 0.2, equitySol: 100, live: true }).sizeSol).toBeCloseTo(0.18);
  });
});

describe('ExitPlanResolver', () => {
  it('uses the rule defaults without a proposal', () => {
    const { plan, exitPlan } = ExitPlanResolver.resolve(DEFAULT_RULE_PARAMS, null, noEffect);
    expect(plan.style).toBe('swing');
    expect(exitPlan.tp1Multiple).toBe(DEFAULT_RULE_PARAMS.takeProfit1Multiple);
    expect(exitPlan.stopLossPct).toBe(DEFAULT_RULE_PARAMS.stopLossPct);
  });

  it('turns into a quick scalp when a playbook asks for it', () => {
    const effect = { ...noEffect, scalp: true, maxHoldMinutes: 10, takeProfitMultiple: 1.4 };
    const { plan, exitPlan } = ExitPlanResolver.resolve(DEFAULT_RULE_PARAMS, null, effect);
    expect(plan.style).toBe('scalp');
    expect(plan.maxHoldMinutes).toBe(10);
    expect(plan.takeProfitMultiple).toBe(1.4);
    expect(exitPlan.tp1SellPct).toBe(80);
  });

  it('lets the trader tighten but never loosen the stop loss', () => {
    const tighter = ExitPlanResolver.resolve(DEFAULT_RULE_PARAMS, { style: 'swing', maxHoldMinutes: 60, takeProfitMultiple: 2, stopLossPct: 30 }, noEffect);
    const looser = ExitPlanResolver.resolve(DEFAULT_RULE_PARAMS, { style: 'swing', maxHoldMinutes: 60, takeProfitMultiple: 2, stopLossPct: 80 }, noEffect);
    expect(tighter.plan.stopLossPct).toBe(30);
    expect(looser.plan.stopLossPct).toBe(DEFAULT_RULE_PARAMS.stopLossPct);
  });

  it('never holds longer than the rule limit', () => {
    const { plan } = ExitPlanResolver.resolve(DEFAULT_RULE_PARAMS, { style: 'runner', maxHoldMinutes: 99_999, takeProfitMultiple: 3, stopLossPct: 40 }, noEffect);
    expect(plan.maxHoldMinutes).toBe(DEFAULT_RULE_PARAMS.maxHoldMinutes);
  });
});

describe('FeatureSimilarity', () => {
  it('is zero for identical setups', () => {
    expect(FeatureSimilarity.distance(features, features)).toBe(0);
  });

  it('ranks a similar setup closer than a very different one', () => {
    const similar = { ...features, top1HolderPct: 10 };
    const different = { ...features, top1HolderPct: 35, top10Pct: 55, bundledSupplyPct: 30 };
    expect(FeatureSimilarity.distance(features, similar)).toBeLessThan(FeatureSimilarity.distance(features, different));
  });
});
