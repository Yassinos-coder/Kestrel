import { Injectable, Logger } from '@nestjs/common';
import type { ChecklistReport, CostEstimateView } from '@kestrel/shared';
import { AnalystAgentService } from '../../agents/services/analyst-agent.service';
import { ClaudeService } from '../../agents/services/claude.service';
import { TraderAgentService } from '../../agents/services/trader-agent.service';
import type { TraderDecision } from '../../agents/schemas/agent-outputs.schema';
import { ChecklistService } from '../../checklist/services/checklist.service';
import { ForensicsService } from '../../forensics/services/forensics.service';
import { ForensicsMerger } from '../../forensics/utils/forensics-merger.util';
import type { TokenMarketSnapshot, TokenSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import type { BotSettings, TokenScan } from '../../generated/prisma/client';
import { SolPriceService } from '../../market-data/services/sol-price.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { TradeFeaturesMapper } from '../../rules/mappers/trade-features.mapper';
import { RuleSetService } from '../../rules/services/rule-set.service';
import { PlaybookMatcher } from '../../rules/utils/playbook-matcher.util';
import type { ActiveRules } from '../../rules/interfaces/active-rules.interface';
import type { PoolState } from '../interfaces/trading.interface';
import { DecisionRepository } from '../repositories/decision.repository';
import { PositionRepository } from '../repositories/position.repository';
import { TokenScanRepository } from '../repositories/token-scan.repository';
import { ExitPlanResolver, type ProposedPlan } from '../utils/exit-plan.resolver';
import { PositionSizer } from '../utils/position-sizer.util';
import { TradeCostUtil } from '../utils/trade-cost.util';
import { LessonService } from './lesson.service';
import { PortfolioService, type PortfolioState } from './portfolio.service';
import { PositionService } from './position.service';

const RECENT_DECISION_WINDOW_MS = 3 * 60 * 60 * 1000;
const LESSONS_IN_PROMPT = 5;
const RULES_ONLY_SIZE_FRACTION = 0.5;
const COST_SIZE_FRACTIONS = [0.25, 0.5, 1];

interface Resolved {
  action: 'buy' | 'skip';
  confidence: number;
  sizeFraction: number;
  plan: ProposedPlan | null;
  reasoning: string;
  usedAi: boolean;
}

@Injectable()
export class DecisionPipelineService {
  private readonly logger = new Logger(DecisionPipelineService.name);

  constructor(
    private readonly checklist: ChecklistService,
    private readonly decisions: DecisionRepository,
    private readonly scans: TokenScanRepository,
    private readonly positionRepository: PositionRepository,
    private readonly portfolio: PortfolioService,
    private readonly ruleSets: RuleSetService,
    private readonly positions: PositionService,
    private readonly lessons: LessonService,
    private readonly analyst: AnalystAgentService,
    private readonly trader: TraderAgentService,
    private readonly claude: ClaudeService,
    private readonly forensics: ForensicsService,
    private readonly notifications: NotificationService,
    private readonly solPrice: SolPriceService,
  ) {}

  async process(market: TokenMarketSnapshot, scan: TokenScan, users: BotSettings[]): Promise<void> {
    for (const settings of users) {
      try {
        await this.processForUser(settings, market, scan);
      } catch (error) {
        this.logger.error(`Decision failed for ${market.symbol}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
  }

  async suggest(settings: BotSettings, market: TokenMarketSnapshot, scan: TokenScan): Promise<void> {
    await this.processForUser(settings, market, scan, true);
  }

  private async processForUser(settings: BotSettings, market: TokenMarketSnapshot, scan: TokenScan, forced = false): Promise<void> {
    const userId = settings.userId;
    if (await this.positionRepository.hasOpenForMint(userId, market.mint)) return;
    if (!forced && (await this.decisions.hasRecentForMint(userId, market.mint, new Date(Date.now() - RECENT_DECISION_WINDOW_MS)))) return;

    const [state, rules] = await Promise.all([this.portfolio.getState(userId), this.ruleSets.getActive(userId)]);
    const snapshot: TokenSnapshot = {
      ...market,
      portfolio: { openPositions: state.openPositions.length, dailyLossPct: state.dailyLossPct },
    };

    const screen = this.checklist.screen(snapshot, rules.params);
    if (screen.verdict === 'reject') {
      await this.record(userId, scan, market, 'REJECTED', screen, { reasoning: this.summariseFailures(screen) });
      return;
    }

    const forensics = await this.forensics.analyze(market);
    const enriched: TokenSnapshot = forensics ? { ...ForensicsMerger.apply(market, forensics), portfolio: snapshot.portfolio } : snapshot;

    if (forensics) {
      const deepScreen = this.checklist.screen(enriched, rules.params);
      if (deepScreen.verdict === 'reject') {
        await this.record(userId, scan, enriched, 'REJECTED', deepScreen, { reasoning: `On-chain forensics: ${this.summariseFailures(deepScreen)}` });
        return;
      }
    }

    const report = this.checklist.evaluate(enriched, rules.params);
    if (report.verdict === 'reject') {
      await this.record(userId, scan, market, 'REJECTED', report, { reasoning: this.summariseSoft(report) });
      return;
    }

    await this.decide(settings, state, rules, enriched, scan, report);
  }

  private async decide(
    settings: BotSettings,
    state: PortfolioState,
    rules: ActiveRules,
    snapshot: TokenSnapshot,
    scan: TokenScan,
    report: ChecklistReport,
  ): Promise<void> {
    const userId = settings.userId;
    const features = TradeFeaturesMapper.fromSnapshot(snapshot);
    const effect = PlaybookMatcher.match(features, rules.playbooks);
    const matchedNames = effect.matched.map((playbook) => playbook.name);

    if (effect.block) {
      await this.record(userId, scan, snapshot, 'SKIP', report, { reasoning: `Blocked by playbook: ${matchedNames.join(', ')}` });
      return;
    }

    const analyst = this.claude.isAvailable() ? await this.analyst.report(snapshot, report, userId) : null;
    const lessons = await this.lessons.findSimilar(userId, features, LESSONS_IN_PROMPT);
    const costs = this.estimateCosts(snapshot, rules, state, effect.sizeMultiplier, settings.mode === 'LIVE');
    const aiDecision = this.claude.isAvailable()
      ? await this.trader.decide({
          snapshot,
          report,
          analyst,
          portfolio: {
            equitySol: state.equitySol,
            cashSol: state.cashSol,
            openPositions: state.openPositions.length,
            dailyLossPct: state.dailyLossPct,
            dailyLossLimitPct: rules.params.dailyLossLimitPct,
          },
          rules,
          matchedPlaybooks: effect.matched,
          lessons,
          userId,
          costs,
        })
      : null;

    const resolved = this.resolve(aiDecision, report);
    const agents = { analyst, matchedPlaybooks: matchedNames, lessonsUsed: lessons.length, usedAi: resolved.usedAi, costs: costs.find((item) => item.sizeFraction === resolved.sizeFraction)?.cost ?? null };

    if (resolved.action === 'skip' || resolved.confidence < rules.params.minConfidence) {
      const reasoning =
        resolved.action === 'skip' ? resolved.reasoning : `Confidence ${resolved.confidence} is below the required ${rules.params.minConfidence}. ${resolved.reasoning}`;
      await this.record(userId, scan, snapshot, 'SKIP', report, { reasoning, confidence: resolved.confidence, agents });
      return;
    }

    const sizing = PositionSizer.size({
      params: rules.params,
      equitySol: state.equitySol,
      cashSol: state.cashSol,
      sizeFraction: resolved.sizeFraction,
      playbookMultiplier: effect.sizeMultiplier,
      live: settings.mode === 'LIVE',
    });
    if (sizing.tooSmall) {
      await this.handleLowFunds(userId, settings, state, sizing.neededSol);
      await this.record(userId, scan, snapshot, 'SKIP', report, { reasoning: 'Not enough free funds for a position', agents });
      return;
    }

    const { plan, exitPlan } = ExitPlanResolver.resolve(rules.params, resolved.plan, effect);
    const tradeCost = TradeCostUtil.estimate(sizing.sizeSol, this.poolOf(snapshot));
    const costCheck = TradeCostUtil.check(tradeCost, plan.takeProfitMultiple);
    if (!costCheck.ok) {
      await this.record(userId, scan, snapshot, 'SKIP', report, { reasoning: `Costs: ${costCheck.reason}`, agents: { ...agents, costs: tradeCost } });
      return;
    }
    const decision = await this.record(userId, scan, snapshot, 'BUY', report, {
      reasoning: resolved.reasoning,
      confidence: resolved.confidence,
      sizeSol: sizing.sizeSol,
      plan,
      agents: { ...agents, costs: tradeCost },
    });

    try {
      await this.positions.open({
        userId,
        decisionId: decision.id,
        mode: settings.mode,
        snapshot,
        sizeSol: sizing.sizeSol,
        confidence: resolved.usedAi ? resolved.confidence : null,
        plan,
        exitPlan,
        features,
        ruleVersion: rules.version,
        matchedPlaybooks: matchedNames,
        reasoning: resolved.reasoning,
        costs: tradeCost,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Could not open ${snapshot.symbol}: ${message}`);
      await this.decisions.markFailed(decision.id, `Order failed: ${message}`);
    }
  }

  private estimateCosts(
    snapshot: TokenSnapshot,
    rules: ActiveRules,
    state: PortfolioState,
    playbookMultiplier: number,
    live: boolean,
  ): Array<{ sizeFraction: number; cost: CostEstimateView }> {
    const pool = this.poolOf(snapshot);
    return COST_SIZE_FRACTIONS.map((sizeFraction) => {
      const sizing = PositionSizer.size({ params: rules.params, equitySol: state.equitySol, cashSol: state.cashSol, sizeFraction, playbookMultiplier, live });
      return { sizeFraction, cost: TradeCostUtil.estimate(sizing.sizeSol, pool) };
    });
  }

  private poolOf(snapshot: TokenSnapshot): PoolState {
    return { priceSol: snapshot.priceSol, quoteReserveSol: snapshot.liquidity.quoteSol, liquidityUsd: snapshot.liquidity.usd };
  }

  private resolve(ai: TraderDecision | null, report: ChecklistReport): Resolved {
    if (!ai) {
      return {
        action: 'buy',
        confidence: Math.round(report.softScore),
        sizeFraction: RULES_ONLY_SIZE_FRACTION,
        plan: null,
        reasoning: `Rules-only entry: every safety gate passed with a soft score of ${Math.round(report.softScore)}.`,
        usedAi: false,
      };
    }
    return {
      action: ai.action,
      confidence: Math.round(ai.confidence),
      sizeFraction: ai.sizeFraction,
      plan: { style: ai.style, maxHoldMinutes: ai.maxHoldMinutes, takeProfitMultiple: ai.takeProfitMultiple, stopLossPct: ai.stopLossPct },
      reasoning: ai.reasoning,
      usedAi: true,
    };
  }


  private async handleLowFunds(userId: string, settings: BotSettings, state: PortfolioState, neededSol: number): Promise<void> {
    await this.notifications.notifyLowFunds(userId, {
      mode: settings.mode,
      availableSol: state.cashSol,
      neededSol,
      solUsd: await this.solPrice.getUsd(),
    });
  }

  private async record(
    userId: string,
    scan: TokenScan,
    market: TokenMarketSnapshot,
    action: 'BUY' | 'SKIP' | 'REJECTED',
    report: ChecklistReport,
    extra: { reasoning: string; confidence?: number; sizeSol?: number; plan?: object; agents?: object },
  ) {
    return this.decisions.create({
      userId,
      scanId: scan.id,
      mint: market.mint,
      symbol: market.symbol,
      action,
      confidence: extra.confidence ?? null,
      sizeSol: extra.sizeSol ?? null,
      plan: extra.plan ?? null,
      reasoning: extra.reasoning,
      report,
      agents: extra.agents ?? null,
      marketCapUsd: market.marketCapUsd,
      pairAddress: market.pairAddress,
    });
  }

  private summariseFailures(report: ChecklistReport): string {
    const failed = report.results.filter((result) => result.status === 'fail');
    return failed.map((result) => `${result.rule}: ${result.reason}`).join('; ');
  }

  private summariseSoft(report: ChecklistReport): string {
    const weak = report.results.filter((result) => !result.hard && result.status !== 'pass');
    return `Soft score ${Math.round(report.softScore)}. ${weak.map((result) => `${result.rule}: ${result.reason}`).join('; ')}`;
  }
}
