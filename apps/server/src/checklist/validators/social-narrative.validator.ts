import type { RuleResult } from '@kestrel/shared';
import { CHECKLIST_THRESHOLDS } from '../constants/checklist-thresholds.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

const CHECK_WEIGHT = 25;

export class SocialNarrativeValidator {
  static validate(snapshot: TokenSnapshot): RuleResult {
    const { social } = snapshot;
    if (!social) return RuleResultFactory.scored('social-narrative', 0, 'social signals unavailable');

    const failedChecks: string[] = [];

    if (!social.contractAddressVerified) failedChecks.push('contract address not verified');
    if (social.accountAgeDays < CHECKLIST_THRESHOLDS.minSocialAccountAgeDays) failedChecks.push('account is too new');
    if (social.copycatCount > CHECKLIST_THRESHOLDS.maxCopycatCount) failedChecks.push('many copycat tokens');
    if (social.botEngagementRatio > CHECKLIST_THRESHOLDS.maxBotEngagementRatio) failedChecks.push('bot-like engagement');

    const score = 100 - failedChecks.length * CHECK_WEIGHT;
    const reason = failedChecks.length ? failedChecks.join(', ') : 'narrative checks out';
    return RuleResultFactory.scored('social-narrative', score, reason);
  }
}
