import { Injectable, Logger } from '@nestjs/common';
import type { TradeFeatures } from '@kestrel/shared';
import { LearningAgentService } from '../../agents/services/learning-agent.service';
import type { LessonSummary } from '../../agents/interfaces/agent-inputs.interface';
import type { Position } from '../../generated/prisma/client';
import type { PositionContext } from '../interfaces/trading.interface';
import { LessonRepository } from '../repositories/lesson.repository';
import { FeatureSimilarity } from '../utils/feature-similarity.util';

const PERCENT = 100;
const MINUTE_MS = 60_000;
const SIMILARITY_POOL = 300;

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    private readonly lessons: LessonRepository,
    private readonly learningAgent: LearningAgentService,
  ) {}

  async recordClosed(position: Position): Promise<void> {
    try {
      const context = position.context as unknown as PositionContext;
      const closedAt = position.closedAt ?? new Date();
      const pnlPct = ((position.realizedSol - position.entrySol) / position.entrySol) * PERCENT;
      const postMortem = await this.learningAgent.postMortem({
        symbol: position.symbol,
        features: context.features,
        plan: position.plan as unknown as { style: string; maxHoldMinutes: number; takeProfitMultiple: number; stopLossPct: number },
        entryReasoning: context.reasoning,
        peakMultiple: position.peakPriceSol / position.entryPriceSol,
        exitMultiple: position.lastPriceSol / position.entryPriceSol,
        heldMinutes: (closedAt.getTime() - position.openedAt.getTime()) / MINUTE_MS,
        exitReason: position.exitReason ?? 'unknown',
        pnlPct,
        exitEvidence: context.exitEvidence ?? null,
      }, position.userId);
      await this.lessons.create({
        userId: position.userId,
        positionId: position.id,
        mint: position.mint,
        symbol: position.symbol,
        outcomePct: pnlPct,
        exitReason: position.exitReason ?? 'unknown',
        features: context.features,
        lesson: postMortem.lesson,
        tags: postMortem.tags,
      });
    } catch (error) {
      this.logger.warn(`Could not record lesson for ${position.symbol}: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  async findSimilar(userId: string, features: TradeFeatures, take: number): Promise<LessonSummary[]> {
    const recent = await this.lessons.listRecent(userId, SIMILARITY_POOL);
    return recent
      .map((lesson) => ({ lesson, distance: FeatureSimilarity.distance(features, lesson.features as unknown as TradeFeatures) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, take)
      .map(({ lesson }) => ({
        symbol: lesson.symbol,
        outcomePct: Math.round(lesson.outcomePct),
        exitReason: lesson.exitReason,
        lesson: lesson.lesson,
        tags: lesson.tags,
      }));
  }
}
