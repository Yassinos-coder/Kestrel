import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Decision, DecisionAction } from '../../generated/prisma/client';

export interface NewDecision {
  userId: string;
  scanId: string;
  mint: string;
  symbol: string;
  action: DecisionAction;
  confidence: number | null;
  sizeSol: number | null;
  plan: object | null;
  reasoning: string | null;
  report: object;
  agents: object | null;
}

@Injectable()
export class DecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: NewDecision): Promise<Decision> {
    return this.prisma.decision.create({
      data: {
        ...data,
        plan: data.plan ?? undefined,
        agents: data.agents ?? undefined,
      },
    });
  }

  async markFailed(id: string, reasoning: string): Promise<void> {
    await this.prisma.decision.update({ where: { id }, data: { action: 'SKIP', reasoning } });
  }

  listRecent(userId: string, take: number, action?: DecisionAction): Promise<Decision[]> {
    return this.prisma.decision.findMany({
      where: { userId, ...(action ? { action } : {}) },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async hasRecentForMint(userId: string, mint: string, since: Date): Promise<boolean> {
    return (await this.prisma.decision.count({ where: { userId, mint, createdAt: { gte: since } } })) > 0;
  }

  listSince(userId: string, since: Date): Promise<Decision[]> {
    return this.prisma.decision.findMany({ where: { userId, createdAt: { gte: since } } });
  }

  countSince(userId: string, since: Date): Promise<number> {
    return this.prisma.decision.count({ where: { userId, createdAt: { gte: since } } });
  }
}
