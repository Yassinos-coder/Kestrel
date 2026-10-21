import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { RuleSetVersion } from '../../generated/prisma/client';
import type { NewRuleSetVersion } from '../interfaces/new-rule-set.interface';

const HISTORY_LIMIT = 30;

@Injectable()
export class RuleSetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(userId: string): Promise<RuleSetVersion | null> {
    return this.prisma.ruleSetVersion.findFirst({ where: { userId, active: true }, orderBy: { version: 'desc' } });
  }

  listVersions(userId: string): Promise<RuleSetVersion[]> {
    return this.prisma.ruleSetVersion.findMany({ where: { userId }, orderBy: { version: 'desc' }, take: HISTORY_LIMIT });
  }

  async createActive(userId: string, data: NewRuleSetVersion): Promise<RuleSetVersion> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.ruleSetVersion.findFirst({ where: { userId }, orderBy: { version: 'desc' } });
      await tx.ruleSetVersion.updateMany({ where: { userId, active: true }, data: { active: false } });
      return tx.ruleSetVersion.create({
        data: {
          userId,
          version: (latest?.version ?? 0) + 1,
          active: true,
          params: data.params as object,
          playbooks: data.playbooks as object[],
          source: data.source,
          summary: data.summary,
          changes: data.changes as object[],
        },
      });
    });
  }
}
