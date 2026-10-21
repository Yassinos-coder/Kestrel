import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ReviewRun } from '../../generated/prisma/client';

export interface NewReviewRun {
  userId: string;
  windowStart: Date;
  windowEnd: Date;
  tradesInWindow: number;
  stats: object;
}

export interface ReviewRunResult {
  status: string;
  tradesReviewed: number;
  report: object | null;
  appliedChanges: object[];
  rejectedChanges: object[];
  ruleVersionAfter: number | null;
  error: string | null;
}

const HISTORY_LIMIT = 30;

@Injectable()
export class ReviewRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  start(data: NewReviewRun): Promise<ReviewRun> {
    return this.prisma.reviewRun.create({
      data: { ...data, status: 'running', tradesReviewed: 0 },
    });
  }

  finish(id: string, result: ReviewRunResult): Promise<ReviewRun> {
    return this.prisma.reviewRun.update({
      where: { id },
      data: {
        status: result.status,
        tradesReviewed: result.tradesReviewed,
        report: result.report ?? undefined,
        appliedChanges: result.appliedChanges,
        rejectedChanges: result.rejectedChanges,
        ruleVersionAfter: result.ruleVersionAfter,
        error: result.error,
        finishedAt: new Date(),
      },
    });
  }

  listSince(userId: string, since: Date): Promise<ReviewRun[]> {
    return this.prisma.reviewRun.findMany({ where: { userId, status: 'completed', startedAt: { gte: since } } });
  }

  listRecent(userId: string): Promise<ReviewRun[]> {
    return this.prisma.reviewRun.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: HISTORY_LIMIT });
  }
}
