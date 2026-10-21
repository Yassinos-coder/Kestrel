import type { ChecklistRuleId, RuleResult } from '@kestrel/shared';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';

export class RuleResultFactory {
  static hard(rule: ChecklistRuleId, passed: boolean, reason: string): RuleResult {
    return {
      rule,
      hard: true,
      status: passed ? 'pass' : 'fail',
      score: passed ? 100 : 0,
      reason,
    };
  }

  static scored(rule: ChecklistRuleId, score: number, reason: string): RuleResult {
    return {
      rule,
      hard: false,
      status: score >= STATIC_LIMITS.passingRuleScore ? 'pass' : 'warn',
      score,
      reason,
    };
  }
}
