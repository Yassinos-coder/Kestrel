import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Position, PositionStatus, TradingMode } from '../../generated/prisma/client';
import type { PositionContext } from '../interfaces/trading.interface';

export interface NewPosition {
  userId: string;
  decisionId: string | null;
  mode: TradingMode;
  mint: string;
  symbol: string;
  pairAddress: string;
  entrySol: number;
  entryPriceSol: number;
  tokens: number;
  plan: object;
  context: PositionContext;
}

export interface PositionUpdate {
  tokensHeld?: number;
  realizedSol?: number;
  peakPriceSol?: number;
  lastPriceSol?: number;
  status?: PositionStatus;
  exitReason?: string;
  closedAt?: Date;
  context?: PositionContext;
}

@Injectable()
export class PositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: NewPosition): Promise<Position> {
    return this.prisma.position.create({
      data: {
        userId: data.userId,
        decisionId: data.decisionId,
        mode: data.mode,
        mint: data.mint,
        symbol: data.symbol,
        pairAddress: data.pairAddress,
        entrySol: data.entrySol,
        entryPriceSol: data.entryPriceSol,
        tokensBought: data.tokens,
        tokensHeld: data.tokens,
        peakPriceSol: data.entryPriceSol,
        lastPriceSol: data.entryPriceSol,
        plan: data.plan,
        context: data.context as unknown as object,
      },
    });
  }

  findById(id: string): Promise<Position | null> {
    return this.prisma.position.findUnique({ where: { id } });
  }

  findOpen(): Promise<Position[]> {
    return this.prisma.position.findMany({ where: { status: 'OPEN' } });
  }

  findOpenByUser(userId: string): Promise<Position[]> {
    return this.prisma.position.findMany({ where: { userId, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
  }

  listByUser(userId: string, status: PositionStatus | undefined, take: number): Promise<Position[]> {
    return this.prisma.position.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { openedAt: 'desc' },
      take,
    });
  }

  listClosedSince(userId: string, since: Date): Promise<Position[]> {
    return this.prisma.position.findMany({ where: { userId, status: 'CLOSED', closedAt: { gte: since } } });
  }

  listClosedAll(userId: string): Promise<Position[]> {
    return this.prisma.position.findMany({ where: { userId, status: 'CLOSED' } });
  }

  async hasOpenForMint(userId: string, mint: string): Promise<boolean> {
    return (await this.prisma.position.count({ where: { userId, mint, status: 'OPEN' } })) > 0;
  }

  update(id: string, data: PositionUpdate): Promise<Position> {
    const { context, ...rest } = data;
    return this.prisma.position.update({
      where: { id },
      data: { ...rest, ...(context ? { context: context as unknown as object } : {}) },
    });
  }
}
