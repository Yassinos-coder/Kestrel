import type { Playbook, PlaybookCondition, PlaybookEffect, RuleChange, RuleParams } from '@kestrel/shared';

export interface ProposedParamChange {
  param: string;
  value: number;
  rationale: string;
}

export interface ProposedPlaybook {
  name: string;
  conditions: PlaybookCondition[];
  effect: PlaybookEffect;
  rationale: string;
  evidenceTradeIds: string[];
}

export interface ParamChangeOutcome {
  params: RuleParams;
  accepted: RuleChange[];
  rejected: RuleChange[];
}

export interface PlaybookOutcome {
  playbooks: Playbook[];
  accepted: RuleChange[];
  rejected: RuleChange[];
}

export interface MergedPlaybookEffect {
  matched: Playbook[];
  block: boolean;
  scalp: boolean;
  sizeMultiplier: number;
  maxHoldMinutes: number | null;
  takeProfitMultiple: number | null;
  stopLossPct: number | null;
}
