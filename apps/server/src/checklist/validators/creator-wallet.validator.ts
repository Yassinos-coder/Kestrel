import type { RuleResult } from '@kestrel/shared';
import { CHECKLIST_THRESHOLDS } from '../constants/checklist-thresholds.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class CreatorWalletValidator {
  static validate(snapshot: TokenSnapshot): RuleResult {
    const { hasSold, priorRugCount } = snapshot.creator;
    if (hasSold) return RuleResultFactory.hard('creator-wallet', false, 'creator has already sold');
    if (priorRugCount > CHECKLIST_THRESHOLDS.maxCreatorPriorRugs) {
      return RuleResultFactory.hard('creator-wallet', false, `creator has ${priorRugCount} prior rugs`);
    }
    return RuleResultFactory.hard('creator-wallet', true, 'creator is holding with a clean history');
  }
}
