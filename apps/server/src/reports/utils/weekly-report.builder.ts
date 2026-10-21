import type { TradingMode } from '@kestrel/shared';
import type { WeeklyAlert, WeeklyDayLine, WeeklyTradeLine } from '../../notifications/interfaces/weekly-alert.interface';

const PERCENT = 100;
const MINUTE_MS = 60_000;
const MIN_EQUITY = 0.0001;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface ClosedTradeInput {
  symbol: string;
  entrySol: number;
  realizedSol: number;
  exitReason: string | null;
  openedAt: Date;
  closedAt: Date;
}

export interface WeeklyBuildInput {
  mode: TradingMode;
  periodLabel: string;
  timeZone: string;
  closed: ClosedTradeInput[];
  equitySol: number;
  openPositions: number;
  solUsd: number;
  reviewCount: number;
  ruleChangeCount: number;
  versionFrom: number | null;
  versionTo: number | null;
}

export class WeeklyReportBuilder {
  static build(input: WeeklyBuildInput): WeeklyAlert {
    const lines = input.closed
      .map((trade) => WeeklyReportBuilder.toLine(trade))
      .sort((a, b) => b.pnlSol - a.pnlSol);
    const wins = lines.filter((line) => line.pnlSol > 0);
    const losses = lines.filter((line) => line.pnlSol <= 0);
    const netPnlSol = lines.reduce((sum, line) => sum + line.pnlSol, 0);
    const startEquity = Math.max(input.equitySol - netPnlSol, MIN_EQUITY);
    const holds = input.closed.map((trade) => (trade.closedAt.getTime() - trade.openedAt.getTime()) / MINUTE_MS);

    return {
      mode: input.mode,
      periodLabel: input.periodLabel,
      tradeCount: lines.length,
      wins: wins.length,
      losses: losses.length,
      winRatePct: lines.length ? (wins.length / lines.length) * PERCENT : 0,
      netPnlSol,
      netPnlPct: (netPnlSol / startEquity) * PERCENT,
      solUsd: input.solUsd,
      avgWinPct: WeeklyReportBuilder.average(wins.map((line) => line.pnlPct)),
      avgLossPct: WeeklyReportBuilder.average(losses.map((line) => line.pnlPct)),
      avgHoldMinutes: WeeklyReportBuilder.average(holds),
      best: lines[0] ?? null,
      worst: lines.length > 1 ? (lines[lines.length - 1] ?? null) : null,
      trades: [...lines].sort((a, b) => Math.abs(b.pnlSol) - Math.abs(a.pnlSol)),
      byDay: WeeklyReportBuilder.byDay(input.closed, input.timeZone),
      reviewCount: input.reviewCount,
      ruleChangeCount: input.ruleChangeCount,
      versionFrom: input.versionFrom,
      versionTo: input.versionTo,
      equitySol: input.equitySol,
      openPositions: input.openPositions,
    };
  }

  private static toLine(trade: ClosedTradeInput): WeeklyTradeLine {
    const pnlSol = trade.realizedSol - trade.entrySol;
    return {
      symbol: trade.symbol,
      pnlSol,
      pnlPct: trade.entrySol > 0 ? (pnlSol / trade.entrySol) * PERCENT : 0,
      exitReason: trade.exitReason ?? 'closed',
    };
  }

  private static byDay(closed: ClosedTradeInput[], timeZone: string): WeeklyDayLine[] {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
    const buckets = new Map<string, WeeklyDayLine>(WEEKDAYS.map((label) => [label, { label, pnlSol: 0, trades: 0 }]));

    for (const trade of closed) {
      const bucket = buckets.get(formatter.format(trade.closedAt));
      if (!bucket) continue;
      bucket.pnlSol += trade.realizedSol - trade.entrySol;
      bucket.trades++;
    }
    return WEEKDAYS.map((label) => buckets.get(label)!);
  }

  private static average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
