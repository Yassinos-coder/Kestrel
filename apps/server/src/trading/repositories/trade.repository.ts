import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Trade, TradeSide } from '../../generated/prisma/client';

export interface NewTrade {
  userId: string;
  positionId: string;
  side: TradeSide;
  reason: string;
  priceSol: number;
  solAmount: number;
  tokenAmount: number;
  feesSol: number;
  signature: string | null;
}

@Injectable()
export class TradeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: NewTrade): Promise<Trade> {
    return this.prisma.trade.create({ data });
  }

  listByPosition(positionId: string): Promise<Trade[]> {
    return this.prisma.trade.findMany({ where: { positionId }, orderBy: { createdAt: 'asc' } });
  }

  async sumFees(userId: string, since?: Date): Promise<number> {
    const result = await this.prisma.trade.aggregate({
      where: { userId, ...(since ? { createdAt: { gte: since } } : {}) },
      _sum: { feesSol: true },
    });
    return result._sum.feesSol ?? 0;
  }

  listByUser(userId: string, take: number): Promise<Trade[]> {
    return this.prisma.trade.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
  }
}
