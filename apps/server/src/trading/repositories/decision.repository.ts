import { Injectable } from '@nestjs/common';
import type { Paginated } from '@kestrel/shared';
import { PrismaService } from '../../database/prisma.service';
import type { Decision, DecisionAction, Prisma } from '../../generated/prisma/client';
import type { DecisionQueryDto, DecisionSort } from '../dto/table-query.dto';

const DEFAULT_PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const ORDER: Record<DecisionSort, Prisma.DecisionOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  mcap_desc: { marketCapUsd: { sort: 'desc', nulls: 'last' } },
  mcap_asc: { marketCapUsd: { sort: 'asc', nulls: 'last' } },
  confidence_desc: { confidence: { sort: 'desc', nulls: 'last' } },
};

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
  marketCapUsd: number | null;
  pairAddress: string | null;
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

  findLatestForMint(userId: string, mint: string): Promise<Decision | null> {
    return this.prisma.decision.findFirst({ where: { userId, mint }, orderBy: { createdAt: 'desc' } });
  }

  async markFailed(id: string, reasoning: string): Promise<void> {
    await this.prisma.decision.update({ where: { id }, data: { action: 'SKIP', reasoning } });
  }

  async listPage(userId: string, query: DecisionQueryDto): Promise<Paginated<Decision>> {
    const where = this.buildWhere(userId, query);
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const total = await this.prisma.decision.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(query.page ?? 1, 1), pages);

    const items = await this.prisma.decision.findMany({
      where,
      orderBy: ORDER[query.sort ?? 'newest'],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize, pages };
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

  private buildWhere(userId: string, query: DecisionQueryDto): Prisma.DecisionWhereInput {
    const search = query.search?.trim();
    return {
      userId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(Date.parse(query.to) + DAY_MS - 1) } : {}),
            },
          }
        : {}),
      ...(query.minMarketCap !== undefined || query.maxMarketCap !== undefined
        ? {
            marketCapUsd: {
              ...(query.minMarketCap !== undefined ? { gte: query.minMarketCap } : {}),
              ...(query.maxMarketCap !== undefined ? { lte: query.maxMarketCap } : {}),
            },
          }
        : {}),
      ...(search ? { OR: [{ symbol: { contains: search, mode: 'insensitive' as const } }, { mint: { contains: search } }] } : {}),
    };
  }
}
