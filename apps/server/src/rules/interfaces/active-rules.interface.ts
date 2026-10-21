import type { Playbook, RuleParams } from '@kestrel/shared';

export interface ActiveRules {
  version: number;
  params: RuleParams;
  playbooks: Playbook[];
}
