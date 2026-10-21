import type { Playbook, RuleChange, RuleParams } from '@kestrel/shared';

export interface NewRuleSetVersion {
  params: RuleParams;
  playbooks: Playbook[];
  source: 'seed' | 'nightly-review';
  summary: string;
  changes: RuleChange[];
}
