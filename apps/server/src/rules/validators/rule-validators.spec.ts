import { describe, expect, it } from 'vitest';
import type { Playbook, TradeFeatures } from '@kestrel/shared';
import { DEFAULT_RULE_PARAMS } from '../constants/default-rule-params.constant';
import { PlaybookMatcher } from '../utils/playbook-matcher.util';
import { PlaybookValidator } from './playbook.validator';
import { RuleChangeValidator } from './rule-change.validator';

const baseFeatures: TradeFeatures = {
  top10Pct: 20,
  top1HolderPct: 18,
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
};

describe('RuleChangeValidator', () => {
  it('accepts a change inside bounds and the step limit', () => {
    const outcome = RuleChangeValidator.apply(DEFAULT_RULE_PARAMS, [
      { param: 'stopLossPct', value: 40, rationale: 'stops were too loose' },
    ]);
    expect(outcome.params.stopLossPct).toBe(40);
    expect(outcome.accepted).toHaveLength(1);
  });

  it('clamps a large jump to the per-review step limit', () => {
    const outcome = RuleChangeValidator.apply(DEFAULT_RULE_PARAMS, [
      { param: 'minLiquidityUsd', value: 60_000, rationale: 'thin pools hurt' },
    ]);
    expect(outcome.params.minLiquidityUsd).toBe(18_750);
  });

  it('rejects a value outside the allowed range instead of clamping it', () => {
    const outcome = RuleChangeValidator.apply(DEFAULT_RULE_PARAMS, [{ param: 'minLiquidityUsd', value: 1, rationale: 'x' }]);
    expect(outcome.accepted).toHaveLength(0);
    expect(outcome.params.minLiquidityUsd).toBe(DEFAULT_RULE_PARAMS.minLiquidityUsd);
    expect(outcome.rejected[0]?.rationale).toContain('outside the allowed range');
  });

  it('rejects unknown parameters', () => {
    const outcome = RuleChangeValidator.apply(DEFAULT_RULE_PARAMS, [{ param: 'mintAuthorityRequired', value: 0, rationale: 'x' }]);
    expect(outcome.accepted).toHaveLength(0);
    expect(outcome.rejected).toHaveLength(1);
  });

  it('never exceeds the absolute position ceiling', () => {
    const raised = { ...DEFAULT_RULE_PARAMS, maxPositionPct: 5 };
    const outcome = RuleChangeValidator.apply(raised, [{ param: 'maxPositionPct', value: 9, rationale: 'x' }]);
    expect(outcome.params.maxPositionPct).toBe(5);
  });

  it('keeps the second take-profit above the first', () => {
    const outcome = RuleChangeValidator.apply(DEFAULT_RULE_PARAMS, [
      { param: 'takeProfit1Multiple', value: 2.5, rationale: 'x' },
      { param: 'takeProfit2Multiple', value: 3.6, rationale: 'x' },
    ]);
    expect(outcome.params.takeProfit2Multiple).toBeGreaterThanOrEqual(outcome.params.takeProfit1Multiple + 0.5);
  });

  it('caps the number of changes per review', () => {
    const proposed = ['stopLossPct', 'trailingStopPct', 'maxHoldMinutes', 'minConfidence', 'sellStreakExit', 'maxOpenPositions'].map(
      (param) => ({ param, value: 1, rationale: 'x' }),
    );
    const outcome = RuleChangeValidator.apply(DEFAULT_RULE_PARAMS, proposed);
    expect(outcome.accepted.length).toBeLessThanOrEqual(5);
  });
});

describe('PlaybookValidator and PlaybookMatcher', () => {
  const proposal = {
    name: 'Whale-heavy scalp',
    conditions: [{ feature: 'top1HolderPct' as const, operator: '>' as const, value: 12 }],
    effect: { scalp: true, maxHoldMinutes: 10, takeProfitMultiple: 1.4, sizeMultiplier: 0.5 },
    rationale: 'a single large holder dumped twice',
    evidenceTradeIds: ['t1', 't2'],
  };

  it('accepts a valid playbook and clamps its effect', () => {
    const outcome = PlaybookValidator.apply([], [{ ...proposal, effect: { ...proposal.effect, maxHoldMinutes: 1 } }], [], '2026-10-21T23:00:00Z');
    expect(outcome.playbooks).toHaveLength(1);
    expect(outcome.playbooks[0]?.effect.maxHoldMinutes).toBe(5);
  });

  it('rejects playbooks with unknown features', () => {
    const bad = { ...proposal, conditions: [{ feature: 'moonPhase' as never, operator: '>' as const, value: 1 }] };
    const outcome = PlaybookValidator.apply([], [bad], [], '2026-10-21T23:00:00Z');
    expect(outcome.playbooks).toHaveLength(0);
    expect(outcome.rejected).toHaveLength(1);
  });

  it('matches by conditions and merges effects conservatively', () => {
    const { playbooks } = PlaybookValidator.apply([], [proposal], [], '2026-10-21T23:00:00Z');
    const merged = PlaybookMatcher.match(baseFeatures, playbooks);
    expect(merged.scalp).toBe(true);
    expect(merged.maxHoldMinutes).toBe(10);
    expect(merged.sizeMultiplier).toBe(0.5);

    const unmatched = PlaybookMatcher.match({ ...baseFeatures, top1HolderPct: 5 }, playbooks);
    expect(unmatched.matched).toHaveLength(0);
    expect(unmatched.sizeMultiplier).toBe(1);
  });

  it('retires playbooks by id', () => {
    const { playbooks } = PlaybookValidator.apply([], [proposal], [], '2026-10-21T23:00:00Z');
    const removed = PlaybookValidator.apply(playbooks as Playbook[], [], [playbooks[0]!.id], '2026-10-22T23:00:00Z');
    expect(removed.playbooks).toHaveLength(0);
  });
});
