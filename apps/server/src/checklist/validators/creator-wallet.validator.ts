import type { RuleResult } from '@kestrel/shared';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class CreatorWalletValidator {
  static validate(snapshot: TokenSnapshot): RuleResult {
    const { hasSold, priorRugCount, flaggedRugged } = snapshot.creator;
    if (flaggedRugged) return RuleResultFactory.hard('creator-wallet', false, 'token is flagged as rugged');
    if (hasSold) return RuleResultFactory.hard('creator-wallet', false, 'creator has already sold');
    if (priorRugCount > STATIC_LIMITS.maxCreatorPriorRugs) {
      return RuleResultFactory.hard('creator-wallet', false, `creator has ${priorRugCount} prior rugs`);
    }
    return RuleResultFactory.hard('creator-wallet', true, 'creator is holding with a clean history');
  }
}
