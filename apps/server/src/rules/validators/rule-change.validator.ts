import type { RuleChange, RuleParamKey, RuleParams } from '@kestrel/shared';
import {
  MAX_PARAM_CHANGES_PER_REVIEW,
  MAX_PARAM_STEP_PCT,
  RULE_PARAM_BOUNDS,
} from '../constants/rule-param-bounds.constant';
import { STATIC_LIMITS } from '../constants/static-limits.constant';
import type { ParamChangeOutcome, ProposedParamChange } from '../interfaces/rule-proposals.interface';

const MIN_TP_GAP = 0.5;

export class RuleChangeValidator {
  static apply(current: RuleParams, proposed: ProposedParamChange[]): ParamChangeOutcome {
    const next: RuleParams = { ...current };
    const accepted: RuleChange[] = [];
    const rejected: RuleChange[] = [];

    for (const change of proposed) {
      const key = change.param as RuleParamKey;
      const from = current[key] ?? null;
      const reject = (reason: string) =>
        rejected.push({ kind: 'param', target: change.param, from, to: change.value, rationale: reason });

      if (!(key in RULE_PARAM_BOUNDS)) {
        reject('unknown parameter');
        continue;
      }
      if (!Number.isFinite(change.value)) {
        reject('value is not a finite number');
        continue;
      }
      if (change.value < RULE_PARAM_BOUNDS[key].min || change.value > RULE_PARAM_BOUNDS[key].max) {
        reject(`requested value is outside the allowed range ${RULE_PARAM_BOUNDS[key].min} to ${RULE_PARAM_BOUNDS[key].max}`);
        continue;
      }
      if (accepted.length >= MAX_PARAM_CHANGES_PER_REVIEW) {
        reject('too many changes in one review');
        continue;
      }

      const value = RuleChangeValidator.normalise(key, current[key], change.value);
      if (value === current[key]) {
        reject('no effective change after applying guardrails');
        continue;
      }

      const candidate = { ...next, [key]: value };
      const conflict = RuleChangeValidator.findConflict(candidate);
      if (conflict) {
        reject(conflict);
        continue;
      }

      next[key] = value;
      accepted.push({ kind: 'param', target: key, from: current[key], to: value, rationale: change.rationale });
    }

    return { params: next, accepted, rejected };
  }

  private static normalise(key: RuleParamKey, current: number, requested: number): number {
    const bounds = RULE_PARAM_BOUNDS[key];
    const maxStep = Math.abs(current) * (MAX_PARAM_STEP_PCT / 100);
    const stepped = Math.min(Math.max(requested, current - maxStep), current + maxStep);
    const bounded = Math.min(Math.max(stepped, bounds.min), bounds.max);
    const rounded = bounds.integer ? Math.round(bounded) : Math.round(bounded * 100) / 100;
    return rounded;
  }

  private static findConflict(params: RuleParams): string | null {
    if (params.takeProfit2Multiple < params.takeProfit1Multiple + MIN_TP_GAP) {
      return 'second take-profit must stay above the first';
    }
    if (params.minMarketCapUsd >= params.maxMarketCapUsd) return 'market cap band would be empty';
    if (params.minBuySellRatio5m >= params.maxBuySellRatio5m) return 'buy/sell ratio band would be empty';
    if (params.maxPositionPct > STATIC_LIMITS.absoluteMaxPositionPct) return 'position size above the hard ceiling';
    if (params.dailyLossLimitPct > STATIC_LIMITS.absoluteMaxDailyLossPct) return 'daily loss limit above the hard ceiling';
    if (params.takeProfit1SellPct + params.takeProfit2SellPct > 100) return 'take-profit sells exceed the position';
    return null;
  }
}
