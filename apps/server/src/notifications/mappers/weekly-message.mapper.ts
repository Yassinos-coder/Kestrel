import type { WeeklyAlert, WeeklyDayLine, WeeklyTradeLine } from '../interfaces/weekly-alert.interface';

const MAX_TRADE_LINES = 12;
const MAX_BAR = 5;
const DIVIDER = '━━━━━━━━━━━━━━━━';

export class WeeklyMessageMapper {
  static build(alert: WeeklyAlert): string {
    const header = [
      `📊 <b>Weekly report</b>  ·  ${WeeklyMessageMapper.escape(alert.periodLabel)}`,
      `<i>${alert.mode === 'LIVE' ? 'Live money' : 'Paper mode'}</i>`,
    ];

    if (!alert.tradeCount) {
      return [...header, '', DIVIDER, '😴 No trades were closed this week.', WeeklyMessageMapper.footer(alert)].join('\n');
    }

    const sections = [
      header.join('\n'),
      DIVIDER,
      WeeklyMessageMapper.result(alert),
      WeeklyMessageMapper.highlights(alert),
      WeeklyMessageMapper.days(alert.byDay),
      WeeklyMessageMapper.tradeList(alert),
      DIVIDER,
      WeeklyMessageMapper.footer(alert),
    ];
    return sections.filter(Boolean).join('\n\n');
  }

  private static result(alert: WeeklyAlert): string {
    const icon = alert.netPnlSol >= 0 ? '💰' : '🩸';
    const dollars = alert.solUsd > 0 ? `  (~${WeeklyMessageMapper.usd(alert.netPnlSol * alert.solUsd)})` : '';
    return [
      `${icon} <b>Net result</b>`,
      `<b>${WeeklyMessageMapper.signedSol(alert.netPnlSol)}</b>${dollars}  ·  <b>${WeeklyMessageMapper.signedPct(alert.netPnlPct)}</b> of equity`,
      `🎯 Win rate <b>${alert.winRatePct.toFixed(0)}%</b>  (${alert.wins} wins / ${alert.losses} losses, ${alert.tradeCount} trades)`,
      `📈 Avg win <b>${WeeklyMessageMapper.signedPct(alert.avgWinPct)}</b>   📉 Avg loss <b>${WeeklyMessageMapper.signedPct(alert.avgLossPct)}</b>`,
      `⏱ Avg hold <b>${Math.round(alert.avgHoldMinutes)} min</b>`,
    ].join('\n');
  }

  private static highlights(alert: WeeklyAlert): string {
    const lines: string[] = [];
    if (alert.best) lines.push(`🏆 <b>Best:</b> ${WeeklyMessageMapper.tradeShort(alert.best)}`);
    if (alert.worst && alert.worst.symbol !== alert.best?.symbol) lines.push(`💀 <b>Worst:</b> ${WeeklyMessageMapper.tradeShort(alert.worst)}`);
    return lines.join('\n');
  }

  private static days(days: WeeklyDayLine[]): string {
    const maxAbs = Math.max(...days.map((day) => Math.abs(day.pnlSol)), 0.000001);
    const lines = days.map((day) => {
      if (!day.trades) return `<code>${day.label}</code> ⬜ <i>no trades</i>`;
      const bars = Math.max(1, Math.round((Math.abs(day.pnlSol) / maxAbs) * MAX_BAR));
      const squares = (day.pnlSol >= 0 ? '🟩' : '🟥').repeat(bars);
      return `<code>${day.label}</code> ${squares} ${WeeklyMessageMapper.signedSol(day.pnlSol)}`;
    });
    return ['📅 <b>Day by day</b>', ...lines].join('\n');
  }

  private static tradeList(alert: WeeklyAlert): string {
    const shown = alert.trades.slice(0, MAX_TRADE_LINES).map((trade) => {
      const icon = trade.pnlSol >= 0 ? '🟢' : '🔴';
      return `${icon} <b>${WeeklyMessageMapper.escape(trade.symbol)}</b>  ${WeeklyMessageMapper.signedPct(trade.pnlPct)}  ·  ${WeeklyMessageMapper.signedSol(trade.pnlSol)}\n      <i>${WeeklyMessageMapper.escape(trade.exitReason)}</i>`;
    });
    const hidden = alert.trades.length - shown.length;
    return ['🧾 <b>Trades</b>', ...shown, ...(hidden > 0 ? [`<i>+${hidden} more not shown</i>`] : [])].join('\n');
  }

  private static footer(alert: WeeklyAlert): string {
    const brain =
      alert.reviewCount > 0
        ? `🧠 <b>Self-healing:</b> ${alert.reviewCount} nightly review${alert.reviewCount === 1 ? '' : 's'}, ${alert.ruleChangeCount} rule change${alert.ruleChangeCount === 1 ? '' : 's'}${alert.versionFrom && alert.versionTo && alert.versionTo !== alert.versionFrom ? ` (v${alert.versionFrom} → v${alert.versionTo})` : ''}`
        : '🧠 <b>Self-healing:</b> no reviews ran this week';
    return [brain, `🏦 Equity <b>${alert.equitySol.toFixed(3)} SOL</b>  ·  ${alert.openPositions} open position${alert.openPositions === 1 ? '' : 's'}`].join('\n');
  }

  private static tradeShort(trade: WeeklyTradeLine): string {
    return `${WeeklyMessageMapper.escape(trade.symbol)} ${WeeklyMessageMapper.signedPct(trade.pnlPct)} (${WeeklyMessageMapper.signedSol(trade.pnlSol)})`;
  }

  private static signedSol(value: number): string {
    return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(3)} SOL`;
  }

  private static signedPct(value: number): string {
    return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;
  }

  private static usd(value: number): string {
    return `${value >= 0 ? '+' : '−'}$${Math.abs(value).toFixed(0)}`;
  }

  private static escape(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
