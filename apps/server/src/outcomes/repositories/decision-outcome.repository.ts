import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Decision, DecisionOutcome } from '../../generated/prisma/client';
import type { OutcomeChanges } from '../interfaces/outcome.interface';

export type DecisionWithOutcome = Decision & { outcome: DecisionOutcome | null };
export type TrackedDecision = Decision & { outcome: DecisionOutcome };

@Injectable()
export class DecisionOutcomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  listSkipsBetween(since: Date, until: Date, take: number): Promise<DecisionWithOutcome[]> {
    return this.prisma.decision.findMany({
      where: { action: 'SKIP', createdAt: { gte: since, lte: until }, pairAddress: { not: null }, marketCapUsd: { not: null } },
      include: { outcome: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async listTrackedSince(userId: string, since: Date): Promise<TrackedDecision[]> {
    const rows = await this.prisma.decision.findMany({
      where: { userId, action: 'SKIP', createdAt: { gte: since }, outcome: { isNot: null } },
      include: { outcome: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.filter((row): row is TrackedDecision => row.outcome !== null);
  }

  async save(decision: Decision, changes: OutcomeChanges): Promise<void> {
    await this.prisma.decisionOutcome.upsert({
      where: { decisionId: decision.id },
      create: { decisionId: decision.id, userId: decision.userId, baseMarketCapUsd: decision.marketCapUsd ?? 0, ...changes },
      update: changes,
    });
  }
}
