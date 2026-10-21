import type { RuleChange } from '@kestrel/shared';
import type { BuyAlert, DailyLossAlert, LowFundsAlert, ReviewAlert, SellAlert } from '../interfaces/alerts.interface';

const DEXSCREENER_URL = 'https://dexscreener.com/solana';
const PAUSE_NOTE = '⏸️ <i>New entries were paused during the review and have resumed. Open positions stayed protected.</i>';

export class NotificationMessageMapper {
  static buy(alert: BuyAlert): string {
    const lines = [
      `🟢 <b>BUY ${NotificationMessageMapper.escape(alert.symbol)}</b> · ${alert.mode}`,
      `Size: ${NotificationMessageMapper.sol(alert.solAmount, alert.solUsd)}`,
      `Entry: ${alert.priceSol.toExponential(3)} SOL`,
      `Confidence: ${alert.confidence ?? 'rules-only'}`,
      `Plan: ${alert.plan.style}, hold ≤ ${alert.plan.maxHoldMinutes}m, first target ${alert.plan.takeProfitMultiple}x, stop -${alert.plan.stopLossPct}%`,
      alert.roundTripCostPct === null || alert.breakEvenMovePct === null
        ? ''
        : `Costs: ~${alert.roundTripCostPct.toFixed(1)}% round trip, needs +${alert.breakEvenMovePct.toFixed(1)}% to break even`,
      `Why: ${NotificationMessageMapper.escape(alert.reasoning)}`,
      `Rules v${alert.ruleVersion} · <a href="${DEXSCREENER_URL}/${alert.pairAddress}">chart</a>`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  static sell(alert: SellAlert): string {
    const icon = alert.pnlSol >= 0 ? '🟢' : '🔴';
    const sign = alert.pnlSol >= 0 ? '+' : '';
    const lines = [
      `${icon} <b>${alert.closed ? 'EXIT' : 'PARTIAL SELL'} ${NotificationMessageMapper.escape(alert.symbol)}</b> · ${alert.mode}`,
      `Sold: ${NotificationMessageMapper.sol(alert.soldSol, alert.solUsd)}`,
      `P&L: ${sign}${alert.pnlSol.toFixed(4)} SOL (${sign}${alert.pnlPct.toFixed(1)}%)`,
      `Reason: ${NotificationMessageMapper.escape(alert.reason)}`,
      `<a href="${DEXSCREENER_URL}/${alert.pairAddress}">chart</a>`,
    ];
    return lines.join('\n');
  }

  static lowFunds(alert: LowFundsAlert): string {
    return [
      `⚠️ <b>Low funds</b> · ${alert.mode}`,
      `Available: ${NotificationMessageMapper.sol(alert.availableSol, alert.solUsd)}`,
      `Needed for the next trade: ${alert.neededSol.toFixed(3)} SOL`,
      alert.mode === 'LIVE' ? 'Top up the bot wallet to keep trading.' : 'The paper balance is nearly used up.',
    ].join('\n');
  }

  static dailyLoss(alert: DailyLossAlert): string {
    return [
      `🛑 <b>Daily loss limit reached</b> · ${alert.mode}`,
      `Today: -${alert.lossSol.toFixed(3)} SOL (~$${(alert.lossSol * alert.solUsd).toFixed(0)}, -${alert.lossPct.toFixed(1)}%)`,
      `Limit: ${alert.limitPct.toFixed(1)}% of equity. No new entries until tomorrow; open positions are still protected.`,
    ].join('\n');
  }

  static review(alert: ReviewAlert): string {
    if (alert.failedReason) {
      return [`🧠 <b>Nightly review failed</b>`, NotificationMessageMapper.escape(alert.failedReason), 'Rules were left unchanged.', PAUSE_NOTE].join('\n');
    }

    const header = `🧠 <b>Nightly review</b> · ${NotificationMessageMapper.escape(alert.windowLabel)}`;
    const scope = `Trades today: ${alert.tradesInWindow}, studied closely: ${alert.tradesReviewed}`;
    const summary = NotificationMessageMapper.escape(alert.summary);

    if (!alert.applied.length) {
      return [header, scope, summary, 'Nothing needed changing.', PAUSE_NOTE].join('\n');
    }

    const changes = alert.applied.map((change) => `• ${NotificationMessageMapper.describe(change)}`);
    const version = alert.versionAfter ? `Rules v${alert.versionBefore} → v${alert.versionAfter}` : `Rules v${alert.versionBefore}`;
    const rejected = alert.rejectedCount ? [`(${alert.rejectedCount} proposed change(s) blocked by guardrails)`] : [];
    return [header, scope, summary, '', '<b>Changed:</b>', ...changes, ...rejected, version, PAUSE_NOTE].join('\n');
  }

  private static describe(change: RuleChange): string {
    const why = NotificationMessageMapper.escape(change.rationale);
    if (change.kind === 'param') return `${change.target}: ${change.from} → ${change.to}. ${why}`;
    if (change.kind === 'playbook-added') return `New playbook "${NotificationMessageMapper.escape(change.target)}". ${why}`;
    return `Retired playbook "${NotificationMessageMapper.escape(change.target)}". ${why}`;
  }

  private static sol(amount: number, solUsd: number): string {
    const dollars = solUsd > 0 ? ` (~$${(amount * solUsd).toFixed(2)})` : '';
    return `${amount.toFixed(4)} SOL${dollars}`;
  }

  private static escape(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
