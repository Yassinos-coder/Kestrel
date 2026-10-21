import { Injectable } from '@nestjs/common';
import type { Playbook, RuleChange, RuleParams, RuleSetView } from '@kestrel/shared';
import { DEFAULT_RULE_PARAMS } from '../constants/default-rule-params.constant';
import type { RuleSetVersion } from '../../generated/prisma/client';
import type { ActiveRules } from '../interfaces/active-rules.interface';
import { RuleSetMapper } from '../mappers/rule-set.mapper';
import { RuleSetRepository } from '../repositories/rule-set.repository';

const SEED_SUMMARY = 'Initial rules from the Kestrel defaults';

@Injectable()
export class RuleSetService {
  private readonly seeding = new Map<string, Promise<RuleSetVersion>>();

  constructor(private readonly ruleSets: RuleSetRepository) {}

  async getActive(userId: string): Promise<ActiveRules> {
    const existing = await this.ruleSets.findActive(userId);
    const row = existing ?? (await this.seedOnce(userId));
    return {
      version: row.version,
      params: RuleSetMapper.toParams(row),
      playbooks: row.playbooks as unknown as Playbook[],
    };
  }

  async getActiveView(userId: string): Promise<RuleSetView> {
    await this.getActive(userId);
    const row = await this.ruleSets.findActive(userId);
    return RuleSetMapper.toView(row!);
  }

  async listViews(userId: string): Promise<RuleSetView[]> {
    await this.getActive(userId);
    const rows = await this.ruleSets.listVersions(userId);
    return rows.map(RuleSetMapper.toView);
  }

  async publishFromReview(
    userId: string,
    params: RuleParams,
    playbooks: Playbook[],
    summary: string,
    changes: RuleChange[],
  ): Promise<number> {
    const row = await this.ruleSets.createActive(userId, { params, playbooks, source: 'nightly-review', summary, changes });
    return row.version;
  }

  private seedOnce(userId: string): Promise<RuleSetVersion> {
    const pending = this.seeding.get(userId);
    if (pending) return pending;

    const created = this.seed(userId).finally(() => this.seeding.delete(userId));
    this.seeding.set(userId, created);
    return created;
  }

  private seed(userId: string) {
    return this.ruleSets.createActive(userId, {
      params: DEFAULT_RULE_PARAMS,
      playbooks: [],
      source: 'seed',
      summary: SEED_SUMMARY,
      changes: [],
    });
  }
}
