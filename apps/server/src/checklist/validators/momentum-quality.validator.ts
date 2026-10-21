import type { RuleResult } from '@kestrel/shared';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

const CHECK_WEIGHT = 25;

export class MomentumQualityValidator {
  static validate(snapshot: TokenSnapshot): RuleResult {
    const { priceChange1hPct, volumeTrendRatio } = snapshot.momentum;
    const failedChecks: string[] = [];

    if (volumeTrendRatio < STATIC_LIMITS.minVolumeTrendRatio) failedChecks.push('volume is fading');
    if (priceChange1hPct < STATIC_LIMITS.maxFreefall1hPct) failedChecks.push('price is in freefall over the last hour');
    if (priceChange1hPct > STATIC_LIMITS.maxOverextended1hPct) failedChecks.push('price is overextended over the last hour');
    if (snapshot.priceChange5mPct < STATIC_LIMITS.minShortTermChange5mPct) failedChecks.push('selling pressure in the last 5 minutes');

    const score = 100 - failedChecks.length * CHECK_WEIGHT;
    const reason = failedChecks.length ? failedChecks.join(', ') : 'healthy volume and price structure';
    return RuleResultFactory.scored('momentum-quality', score, reason);
  }
}
