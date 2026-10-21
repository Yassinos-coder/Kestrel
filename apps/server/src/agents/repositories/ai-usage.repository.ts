import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface NewAiUsage {
  userId: string | null;
  label: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AiUsageTotals {
  costUsd: number;
  calls: number;
}

@Injectable()
export class AiUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async totals(userId: string, since?: Date): Promise<AiUsageTotals> {
    const result = await this.prisma.aiUsage.aggregate({
      where: { userId, ...(since ? { createdAt: { gte: since } } : {}) },
      _sum: { costUsd: true },
      _count: { _all: true },
    });
    return { costUsd: result._sum.costUsd ?? 0, calls: result._count._all };
  }

  async record(data: NewAiUsage): Promise<void> {
    await this.prisma.aiUsage.create({ data });
  }
}
