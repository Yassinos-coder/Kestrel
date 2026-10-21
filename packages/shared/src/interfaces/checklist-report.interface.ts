export type ChecklistRuleId =
  | 'token-authorities'
  | 'token-extensions'
  | 'liquidity'
  | 'holder-concentration'
  | 'bundled-supply'
  | 'creator-wallet'
  | 'sellability'
  | 'organic-activity'
  | 'momentum-quality'
  | 'timing-and-limits';

export type RuleStatus = 'pass' | 'warn' | 'fail';

export type ChecklistVerdict = 'reject' | 'candidate';

export interface RuleResult {
  rule: ChecklistRuleId;
  hard: boolean;
  status: RuleStatus;
  score: number;
  reason: string;
}

export interface ChecklistReport {
  mint: string;
  verdict: ChecklistVerdict;
  softScore: number;
  hardFailures: ChecklistRuleId[];
  results: RuleResult[];
}
