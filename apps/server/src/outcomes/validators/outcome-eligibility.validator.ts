import type { Decision } from '../../generated/prisma/client';
import { UNTRACKED_REASONS } from '../constants/outcome.constant';

export class OutcomeEligibilityValidator {
  static isTrackable(decision: Decision): boolean {
    if (decision.action !== 'SKIP') return false;
    if (!decision.pairAddress || !decision.marketCapUsd || decision.marketCapUsd <= 0) return false;
    const reasoning = decision.reasoning ?? '';
    return !UNTRACKED_REASONS.some((reason) => reasoning.startsWith(reason));
  }
}
