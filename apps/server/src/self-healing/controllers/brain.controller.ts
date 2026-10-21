import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { BrainView, ReviewRunView } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RuleSetService } from '../../rules/services/rule-set.service';
import { TradingMapper } from '../../trading/mappers/trading.mapper';
import { LessonRepository } from '../../trading/repositories/lesson.repository';
import { ReviewRunMapper } from '../mappers/review-run.mapper';
import { ReviewRunRepository } from '../repositories/review-run.repository';
import { SelfHealingService } from '../services/self-healing.service';

const LESSON_LIMIT = 25;

@Controller('brain')
@UseGuards(JwtAuthGuard)
export class BrainController {
  constructor(
    private readonly ruleSets: RuleSetService,
    private readonly reviews: ReviewRunRepository,
    private readonly lessons: LessonRepository,
    private readonly selfHealing: SelfHealingService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser): Promise<BrainView> {
    const [activeRules, versions, reviews, lessons] = await Promise.all([
      this.ruleSets.getActiveView(user.userId),
      this.ruleSets.listViews(user.userId),
      this.reviews.listRecent(user.userId),
      this.lessons.listRecent(user.userId, LESSON_LIMIT),
    ]);
    return {
      activeRules,
      versions,
      reviews: reviews.map(ReviewRunMapper.toView),
      lessons: lessons.map(TradingMapper.toLessonView),
    };
  }

  @Post('review')
  async reviewNow(@CurrentUser() user: AuthenticatedUser): Promise<ReviewRunView> {
    return ReviewRunMapper.toView(await this.selfHealing.runReview(user.userId));
  }
}
