import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolPriceService } from '../../market-data/services/sol-price.service';
import type { WeeklyAlert } from '../../notifications/interfaces/weekly-alert.interface';
import { NotificationService } from '../../notifications/services/notification.service';
import { RuleSetService } from '../../rules/services/rule-set.service';
import { ReviewRunRepository } from '../../self-healing/repositories/review-run.repository';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import { DayWindow } from '../../shared/utils/day-window.util';
import { PositionRepository } from '../../trading/repositories/position.repository';
import { PortfolioService } from '../../trading/services/portfolio.service';
import { WeeklyReportBuilder } from '../utils/weekly-report.builder';

@Injectable()
export class WeeklyReportService {
  constructor(
    private readonly positions: PositionRepository,
    private readonly portfolio: PortfolioService,
    private readonly settings: SettingsRepository,
    private readonly reviews: ReviewRunRepository,
    private readonly ruleSets: RuleSetService,
    private readonly solPrice: SolPriceService,
    private readonly notifications: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  async send(userId: string): Promise<boolean> {
    return this.notifications.sendWeekly(userId, await this.build(userId));
  }

  async build(userId: string): Promise<WeeklyAlert> {
    const timeZone = this.configService.getOrThrow<string>('engine.timezone');
    const now = new Date();
    const weekStart = DayWindow.startOfWeek(timeZone, now);

    const settings = await this.settings.findByUserId(userId);
    const mode = settings?.mode ?? 'PAPER';
    const [closed, state, solUsd, reviews, versions] = await Promise.all([
      this.positions.listClosedSince(userId, weekStart),
      this.portfolio.getState(userId),
      this.solPrice.getUsd(),
      this.reviews.listSince(userId, weekStart),
      this.ruleSets.listViews(userId),
    ]);

    const tuned = versions.filter((version) => version.source === 'nightly-review' && new Date(version.createdAt) >= weekStart);
    const active = versions.find((version) => version.active);

    return WeeklyReportBuilder.build({
      mode,
      periodLabel: this.periodLabel(weekStart, now, timeZone),
      timeZone,
      closed: closed
        .filter((position) => position.mode === mode)
        .map((position) => ({
          symbol: position.symbol,
          entrySol: position.entrySol,
          realizedSol: position.realizedSol,
          exitReason: position.exitReason,
          openedAt: position.openedAt,
          closedAt: position.closedAt ?? now,
        })),
      equitySol: state.equitySol,
      openPositions: state.openPositions.length,
      solUsd,
      reviewCount: reviews.length,
      ruleChangeCount: tuned.reduce((sum, version) => sum + version.changes.length, 0),
      versionFrom: tuned.length ? Math.min(...tuned.map((version) => version.version)) - 1 : null,
      versionTo: active?.version ?? null,
    });
  }

  private periodLabel(start: Date, end: Date, timeZone: string): string {
    const format = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' });
    return `${format.format(start)} – ${format.format(end)}`;
  }
}
