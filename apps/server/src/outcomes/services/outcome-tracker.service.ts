import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DexScreenerClient } from '../../market-data/clients/dexscreener.client';
import type { DexPair } from '../../market-data/interfaces/market-data.interface';
import { MAX_DECISIONS_PER_TICK, OUTCOME_HORIZONS, TRACK_INTERVAL_MS, TRACK_WINDOW_MS } from '../constants/outcome.constant';
import type { OutcomeChanges } from '../interfaces/outcome.interface';
import { DecisionOutcomeRepository, type DecisionWithOutcome } from '../repositories/decision-outcome.repository';
import { OutcomeCalculator } from '../utils/outcome-calculator.util';
import { OutcomeEligibilityValidator } from '../validators/outcome-eligibility.validator';

@Injectable()
export class OutcomeTrackerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutcomeTrackerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly outcomes: DecisionOutcomeRepository,
    private readonly dexScreener: DexScreenerClient,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>('engine.enabled')) return;
    this.timer = setInterval(() => void this.tick(), TRACK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      return await this.track();
    } catch (error) {
      this.logger.warn(`Outcome tracking failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async track(): Promise<number> {
    const now = Date.now();
    const earliestAgeMs = OUTCOME_HORIZONS[0].afterMs;
    const candidates = await this.outcomes.listSkipsBetween(new Date(now - TRACK_WINDOW_MS), new Date(now - earliestAgeMs), MAX_DECISIONS_PER_TICK);
    const due = candidates
      .filter((decision) => OutcomeEligibilityValidator.isTrackable(decision))
      .map((decision) => ({ decision, fields: OutcomeCalculator.dueFields(now - decision.createdAt.getTime(), decision.outcome) }))
      .filter((item) => item.fields.length > 0);
    if (!due.length) return 0;

    const pairs = await this.dexScreener.getPairs([...new Set(due.map((item) => item.decision.pairAddress as string))]);
    const byPair = new Map(pairs.map((pair) => [pair.pairAddress, pair]));

    for (const item of due) await this.record(item.decision, item.fields, byPair.get(item.decision.pairAddress as string) ?? null);
    this.logger.log(`Outcome tracking updated ${due.length} passed tokens`);
    return due.length;
  }

  private async record(decision: DecisionWithOutcome, fields: string[], pair: DexPair | null): Promise<void> {
    const change = OutcomeCalculator.changePct(decision.marketCapUsd ?? 0, pair?.marketCapUsd ?? null);
    const changes: OutcomeChanges = Object.fromEntries(fields.map((field) => [field, change]));
    await this.outcomes.save(decision, OutcomeCalculator.withPeak(changes, decision.outcome));
  }
}
