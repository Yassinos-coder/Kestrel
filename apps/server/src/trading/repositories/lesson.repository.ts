import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { TradeLesson } from '../../generated/prisma/client';

export interface NewLesson {
  userId: string;
  positionId: string;
  mint: string;
  symbol: string;
  outcomePct: number;
  exitReason: string;
  features: object;
  lesson: string;
  tags: string[];
}

@Injectable()
export class LessonRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: NewLesson): Promise<TradeLesson> {
    return this.prisma.tradeLesson.create({ data });
  }

  listRecent(userId: string, take: number): Promise<TradeLesson[]> {
    return this.prisma.tradeLesson.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
  }
}
