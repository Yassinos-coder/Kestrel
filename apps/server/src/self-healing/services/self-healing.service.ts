import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MissedOpportunitiesView, PlaybookEffect, RuleChange } from '@kestrel/shared';
import type { Position, ReviewRun } from '../../generated/prisma/client';
import { MissedOpportunityService } from '../../outcomes/services/missed-opportunity.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { RuleSetService } from '../../rules/services/rule-set.service';
import { PlaybookValidator } from '../../rules/validators/playbook.validator';
import { RuleChangeValidator } from '../../rules/validators/rule-change.validator';
import type { ProposedPlaybook } from '../../rules/interfaces/rule-proposals.interface';
import { DayWindow } from '../../shared/utils/day-window.util';
import type { PositionContext } from '../../trading/interfaces/trading.interface';
import { DecisionRepository } from '../../trading/repositories/decision.repository';
import { PositionRepository } from '../../trading/repositories/position.repository';
import { LessonService } from '../../trading/services/lesson.service';
import { TradingGateService } from '../../trading/services/trading-gate.service';
import type { TradeSummary } from '../interfaces/review.interface';
import { AiUsageRepository } from '../../agents/repositories/ai-usage.repository';
import { TradeRepository } from '../../trading/repositories/trade.repository';
import { ReviewRunRepository } from '../repositories/review-run.repository';
import type { ReviewOutput } from '../schemas/review-output.schema';
import { ReviewStatsBuilder } from '../utils/review-stats.builder';
import { TradeSignificanceScorer } from '../utils/trade-significance.scorer';
import { ReviewAgentService, type ReviewDigest } from './review-agent.service';

const PERCENT = 100;
const MINUTE_MS = 60_000;
const DIGEST_SIZE = 12;
const LESSONS_PER_TRADE = 2;
const LESSON_TRADES = 6;
const MIN_TRADES_FOR_PARAM_CHANGES = 3;
const MIN_MISSED_TRACKED = 5;
const MIN_MISSED_TRACKED_FOR_PARAM_CHANGES = 8;
const MIN_MISSED_WINNERS_FOR_PARAM_CHANGES = 3;

@Injectable()
export class SelfHealingService {
  private readonly logger = new Logger(SelfHealingService.name);

  constructor(
    private readonly positions: PositionRepository,
    private readonly decisions: DecisionRepository,
    private readonly reviews: ReviewRunRepository,
    private readonly ruleSets: RuleSetService,
    private readonly agent: ReviewAgentService,
    private readonly lessons: LessonService,
    private readonly notifications: NotificationService,
    private readonly gate: TradingGateService,
    private readonly configService: ConfigService,
    private readonly trades: TradeRepository,
    private readonly aiUsage: AiUsageRepository,
    private readonly missedOpportunities: MissedOpportunityService,
  ) {}

  async runReview(userId: string): Promise<ReviewRun> {
    await this.gate.pauseEntries('Nightly review in progress');
    try {
      return await this.runPausedReview(userId);
    } finally {
      this.gate.resumeEntries();
    }
  }

  private async runPausedReview(userId: string): Promise<ReviewRun> {
    const timezone = this.configService.getOrThrow<string>('engine.timezone');
    const windowStart = DayWindow.startOfDay(timezone);
    const windowEnd = new Date();
    const windowLabel = windowStart.toISOString().slice(0, 10);

    const closed = await this.positions.listClosedSince(userId, windowStart);
    const summaries = closed.map((position) => this.summarise(position));
    const stats = ReviewStatsBuilder.dayStats(summaries);
    const run = await this.reviews.start({ userId, windowStart, windowEnd, tradesInWindow: summaries.length, stats });
    const before = await this.ruleSets.getActive(userId);

    try {
      const finished = await this.execute(userId, run, summaries, windowStart, windowLabel, before.version);
      return finished;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Nightly review failed for ${userId}: ${message}`);
      const failed = await this.reviews.finish(run.id, this.emptyResult('failed', message));
      await this.notifications.notifyReview(userId, this.alert(windowLabel, summaries.length, 0, message, null, [], 0, before.version, null));
      return failed;
    }
  }

  private async execute(
    userId: string,
    run: ReviewRun,
    summaries: TradeSummary[],
    windowStart: Date,
    windowLabel: string,
    versionBefore: number,
  ): Promise<ReviewRun> {
    const missed = await this.missedOpportunities.getDigest(userId);
    if (!summaries.length && missed.tracked < MIN_MISSED_TRACKED) {
      const result = this.emptyResult('skipped', null);
      await this.notifications.notifyReview(userId, 
        this.alert(windowLabel, 0, 0, null, 'No trades were closed today and too few passed tokens were tracked, so there was nothing to learn from.', [], 0, versionBefore, null),
      );
      return this.reviews.finish(run.id, result);
    }

    if (!this.agent.isAvailable()) {
      await this.notifications.notifyReview(userId, 
        this.alert(windowLabel, summaries.length, 0, null, 'The AI is not configured, so the review was skipped and the rules stay as they are.', [], 0, versionBefore, null),
      );
      return this.reviews.finish(run.id, this.emptyResult('skipped', 'ANTHROPIC_API_KEY is not set'));
    }

    const scored = TradeSignificanceScorer.select(summaries, DIGEST_SIZE);
    const rules = await this.ruleSets.getActive(userId);
    const digest = await this.buildDigest(userId, windowLabel, summaries, scored, rules, windowStart, missed);
    const output = await this.agent.review(digest, userId);

    if (!output) {
      await this.notifications.notifyReview(userId, 
        this.alert(windowLabel, summaries.length, scored.length, 'The AI review could not be completed, rules left unchanged.', null, [], 0, versionBefore, null),
      );
      return this.reviews.finish(run.id, this.emptyResult('failed', 'review model returned no usable output'));
    }

    return this.applyOutput(userId, run, output, summaries.length, scored.map((item) => item.trade.id), rules, windowLabel, versionBefore, missed);
  }

  private async applyOutput(
    userId: string,
    run: ReviewRun,
    output: ReviewOutput,
    tradesInWindow: number,
    reviewedIds: string[],
    rules: Awaited<ReturnType<RuleSetService['getActive']>>,
    windowLabel: string,
    versionBefore: number,
    missed: MissedOpportunitiesView,
  ): Promise<ReviewRun> {
    const evidenceIds = new Set(reviewedIds);
    const allowParamChanges =
      reviewedIds.length >= MIN_TRADES_FOR_PARAM_CHANGES ||
      (missed.tracked >= MIN_MISSED_TRACKED_FOR_PARAM_CHANGES && missed.missedWinners >= MIN_MISSED_WINNERS_FOR_PARAM_CHANGES);

    const paramOutcome = RuleChangeValidator.apply(rules.params, allowParamChanges ? output.paramChanges : []);
    const tooFew: RuleChange[] = allowParamChanges
      ? []
      : output.paramChanges.map((change) => ({
          kind: 'param' as const,
          target: change.param,
          from: rules.params[change.param],
          to: change.value,
          rationale: 'too few reviewed trades to justify a parameter change',
        }));

    const proposals = output.newPlaybooks.map((playbook) => this.toProposal(playbook, evidenceIds));
    const withEvidence = proposals.filter((proposal) => proposal.evidenceTradeIds.length > 0);
    const noEvidence: RuleChange[] = proposals
      .filter((proposal) => proposal.evidenceTradeIds.length === 0)
      .map((proposal) => ({ kind: 'playbook-added' as const, target: proposal.name, from: null, to: null, rationale: 'no supporting trades' }));

    const playbookOutcome = PlaybookValidator.apply(rules.playbooks, withEvidence, output.retirePlaybookIds, new Date().toISOString());
    const applied = [...paramOutcome.accepted, ...playbookOutcome.accepted];
    const rejected = [...paramOutcome.rejected, ...tooFew, ...noEvidence, ...playbookOutcome.rejected];

    let versionAfter: number | null = null;
    if (applied.length) {
      versionAfter = await this.ruleSets.publishFromReview(userId, paramOutcome.params, playbookOutcome.playbooks, output.summary, applied);
    }

    const finished = await this.reviews.finish(run.id, {
      status: 'completed',
      tradesReviewed: reviewedIds.length,
      report: output,
      appliedChanges: applied,
      rejectedChanges: rejected,
      ruleVersionAfter: versionAfter,
      error: null,
    });
    await this.notifications.notifyReview(userId, 
      this.alert(windowLabel, tradesInWindow, reviewedIds.length, null, output.summary, applied, rejected.length, versionBefore, versionAfter),
    );
    return finished;
  }

  private async buildDigest(
    userId: string,
    windowLabel: string,
    summaries: TradeSummary[],
    scored: ReturnType<typeof TradeSignificanceScorer.select>,
    rules: Awaited<ReturnType<RuleSetService['getActive']>>,
    windowStart: Date,
    missed: MissedOpportunitiesView,
  ): Promise<ReviewDigest> {
    const todaysDecisions = await this.decisions.listSince(userId, windowStart);
    const rejections = ReviewStatsBuilder.rejections(
      todaysDecisions.map((decision) => ({
        action: decision.action,
        hardFailures: ((decision.report as { hardFailures?: string[] }).hardFailures ?? []) as string[],
      })),
    );

    const trades = await Promise.all(
      scored.map(async (item, index) => {
        const similar = index < LESSON_TRADES ? await this.lessons.findSimilar(userId, item.trade.features, LESSONS_PER_TRADE) : [];
        return {
          id: item.trade.id,
          symbol: item.trade.symbol,
          whyItMatters: item.reasons,
          result: {
            pnlPct: Math.round(item.trade.pnlPct),
            peakMultiple: Math.round(item.trade.peakMultiple * 100) / 100,
            heldMinutes: Math.round(item.trade.heldMinutes),
            exitReason: item.trade.exitReason,
            style: item.trade.style,
          },
          setup: item.trade.features as unknown as Record<string, number>,
          matchedPlaybooks: item.trade.matchedPlaybooks,
          exitEvidence: item.trade.exitEvidence,
          similarPastLessons: similar.map((lesson) => ({ symbol: lesson.symbol, outcomePct: lesson.outcomePct, lesson: lesson.lesson })),
        };
      }),
    );

    const [tradingFeesSol, ai] = await Promise.all([this.trades.sumFees(userId, windowStart), this.aiUsage.totals(userId, windowStart)]);

    return {
      windowLabel,
      costs: { tradingFeesSol, aiCostUsd: ai.costUsd, aiCalls: ai.calls },
      stats: ReviewStatsBuilder.dayStats(summaries),
      featureComparison: ReviewStatsBuilder.compareFeatures(summaries),
      rejections,
      missedOpportunities: missed,
      rules: { version: rules.version, params: rules.params, playbooks: rules.playbooks },
      trades,
    };
  }

  private toProposal(playbook: ReviewOutput['newPlaybooks'][number], evidenceIds: Set<string>): ProposedPlaybook {
    const effect: PlaybookEffect = {};
    if (playbook.effect.block) effect.block = true;
    if (playbook.effect.scalp) effect.scalp = true;
    if (playbook.effect.sizeMultiplier !== null) effect.sizeMultiplier = playbook.effect.sizeMultiplier;
    if (playbook.effect.maxHoldMinutes !== null) effect.maxHoldMinutes = playbook.effect.maxHoldMinutes;
    if (playbook.effect.takeProfitMultiple !== null) effect.takeProfitMultiple = playbook.effect.takeProfitMultiple;
    if (playbook.effect.stopLossPct !== null) effect.stopLossPct = playbook.effect.stopLossPct;

    return {
      name: playbook.name,
      conditions: playbook.conditions,
      effect,
      rationale: playbook.rationale,
      evidenceTradeIds: playbook.evidenceTradeIds.filter((id) => evidenceIds.has(id)),
    };
  }

  private summarise(position: Position): TradeSummary {
    const context = position.context as unknown as PositionContext;
    const closedAt = position.closedAt ?? new Date();
    const pnlSol = position.realizedSol - position.entrySol;
    return {
      id: position.id,
      symbol: position.symbol,
      pnlPct: (pnlSol / position.entrySol) * PERCENT,
      pnlSol,
      peakMultiple: position.peakPriceSol / position.entryPriceSol,
      exitMultiple: position.lastPriceSol / position.entryPriceSol,
      heldMinutes: (closedAt.getTime() - position.openedAt.getTime()) / MINUTE_MS,
      exitReason: position.exitReason ?? 'unknown',
      style: (position.plan as { style?: string }).style ?? 'swing',
      features: context.features,
      matchedPlaybooks: context.matchedPlaybooks,
      exitEvidence: context.exitEvidence ?? null,
    };
  }

  private emptyResult(status: string, error: string | null) {
    return { status, tradesReviewed: 0, report: null, appliedChanges: [], rejectedChanges: [], ruleVersionAfter: null, error };
  }

  private alert(
    windowLabel: string,
    tradesInWindow: number,
    tradesReviewed: number,
    failedReason: string | null,
    summary: string | null,
    applied: RuleChange[],
    rejectedCount: number,
    versionBefore: number,
    versionAfter: number | null,
  ) {
    return {
      failedReason,
      windowLabel,
      tradesInWindow,
      tradesReviewed,
      summary: summary ?? '',
      applied,
      rejectedCount,
      versionBefore,
      versionAfter,
    };
  }
}
