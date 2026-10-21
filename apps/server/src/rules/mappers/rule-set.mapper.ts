import type { Playbook, RuleChange, RuleParams, RuleSetView } from '@kestrel/shared';
import type { RuleSetVersion } from '../../generated/prisma/client';
import { DEFAULT_RULE_PARAMS } from '../constants/default-rule-params.constant';

export class RuleSetMapper {
  static toView(row: RuleSetVersion): RuleSetView {
    return {
      version: row.version,
      active: row.active,
      source: row.source,
      summary: row.summary,
      params: RuleSetMapper.toParams(row),
      playbooks: row.playbooks as unknown as Playbook[],
      changes: row.changes as unknown as RuleChange[],
      createdAt: row.createdAt.toISOString(),
    };
  }

  static toParams(row: RuleSetVersion): RuleParams {
    return { ...DEFAULT_RULE_PARAMS, ...(row.params as unknown as Partial<RuleParams>) };
  }
}
