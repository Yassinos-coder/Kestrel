import { describe, expect, it } from 'vitest';
import { WeeklyMessageMapper } from '../../notifications/mappers/weekly-message.mapper';
import { WeeklyReportBuilder, type WeeklyBuildInput } from './weekly-report.builder';

const base: WeeklyBuildInput = {
  mode: 'PAPER',
  periodLabel: 'Oct 19 – Oct 25',
  timeZone: 'UTC',
  closed: [
    { symbol: 'WINR', entrySol: 0.3, realizedSol: 0.567, exitReason: 'trailing stop', openedAt: new Date('2026-10-19T10:00:00Z'), closedAt: new Date('2026-10-19T10:40:00Z') },
    { symbol: 'WHALE', entrySol: 0.3, realizedSol: 0.099, exitReason: 'creator wallet sold', openedAt: new Date('2026-10-21T10:00:00Z'), closedAt: new Date('2026-10-21T10:20:00Z') },
    { symbol: 'FLAT', entrySol: 0.3, realizedSol: 0.31, exitReason: 'hold limit', openedAt: new Date('2026-10-23T10:00:00Z'), closedAt: new Date('2026-10-23T12:00:00Z') },
  ],
  equitySol: 10.2,
  openPositions: 1,
  solUsd: 180,
  reviewCount: 6,
  ruleChangeCount: 3,
  versionFrom: 2,
  versionTo: 4,
};

describe('WeeklyReportBuilder', () => {
  const report = WeeklyReportBuilder.build(base);

  it('totals the week', () => {
    expect(report.tradeCount).toBe(3);
    expect(report.wins).toBe(2);
    expect(report.losses).toBe(1);
    expect(report.netPnlSol).toBeCloseTo(0.076, 3);
    expect(report.winRatePct).toBeCloseTo(66.7, 1);
  });

  it('finds the best and worst trade', () => {
    expect(report.best?.symbol).toBe('WINR');
    expect(report.worst?.symbol).toBe('WHALE');
  });

  it('buckets results by weekday in the report time zone', () => {
    const monday = report.byDay.find((day) => day.label === 'Mon');
    const tuesday = report.byDay.find((day) => day.label === 'Tue');
    expect(monday?.trades).toBe(1);
    expect(tuesday?.trades).toBe(0);
    expect(report.byDay).toHaveLength(7);
  });
});

describe('WeeklyMessageMapper', () => {
  it('renders a structured message with the key sections', () => {
    const text = WeeklyMessageMapper.build(WeeklyReportBuilder.build(base));
    expect(text).toContain('<b>Weekly report</b>');
    expect(text).toContain('Net result');
    expect(text).toContain('Day by day');
    expect(text).toContain('WINR');
    expect(text).toContain('v2 → v4');
    expect(text.length).toBeLessThan(4096);
  });

  it('handles a week without trades', () => {
    const text = WeeklyMessageMapper.build(WeeklyReportBuilder.build({ ...base, closed: [] }));
    expect(text).toContain('No trades were closed');
  });

  it('escapes HTML in token names', () => {
    const closed = [{ ...base.closed[0]!, symbol: '<b>X</b>' }];
    expect(WeeklyMessageMapper.build(WeeklyReportBuilder.build({ ...base, closed }))).toContain('&lt;b&gt;X&lt;/b&gt;');
  });

  it('caps a long trade list under the Telegram message limit', () => {
    const closed = Array.from({ length: 80 }, (_, index) => ({ ...base.closed[0]!, symbol: `TOKEN${index}` }));
    const text = WeeklyMessageMapper.build(WeeklyReportBuilder.build({ ...base, closed }));
    expect(text.length).toBeLessThan(4096);
    expect(text).toContain('more not shown');
  });
});
