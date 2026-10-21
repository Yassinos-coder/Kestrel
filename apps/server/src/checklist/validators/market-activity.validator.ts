import type { RuleParams, RuleResult } from '@kestrel/shared';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

const CHECK_WEIGHT = 25;

export class MarketActivityValidator {
  static validate(snapshot: TokenSnapshot, params: RuleParams): RuleResult {
    const { uniqueTraders5m, buySellRatio5m, holderGrowth5mPct, washTradeSuspected } = snapshot.activity;
    const failedChecks: string[] = [];

    if (uniqueTraders5m < params.minUniqueTraders5m) failedChecks.push('few unique traders');
    if (buySellRatio5m < params.minBuySellRatio5m || buySellRatio5m > params.maxBuySellRatio5m) {
      failedChecks.push('unbalanced buy/sell ratio');
    }
    if (holderGrowth5mPct < STATIC_LIMITS.minHolderGrowth5mPct) failedChecks.push('holders shrinking');
    if (washTradeSuspected) failedChecks.push('wash trading suspected');

    const score = 100 - failedChecks.length * CHECK_WEIGHT;
    const reason = failedChecks.length ? failedChecks.join(', ') : 'activity looks organic';
    return RuleResultFactory.scored('organic-activity', score, reason);
  }
}
