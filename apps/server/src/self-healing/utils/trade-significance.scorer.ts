import type { ScoredTrade, TradeSummary } from '../interfaces/review.interface';

const RUG_EXIT_MARKERS = ['creator', 'consecutive sells', 'top holders', 'liquidity'];
const BIG_LOSS_PCT = -30;
const BIG_WIN_PCT = 50;
const GAVE_BACK_PEAK = 1.5;
const GAVE_BACK_MAX_RESULT_PCT = 10;
const MIN_SCORE_TO_REVIEW = 1;

export class TradeSignificanceScorer {
  static score(trade: TradeSummary): ScoredTrade {
    const reasons: string[] = [];
    let score = 0;

    if (trade.pnlPct <= BIG_LOSS_PCT) {
      score += 3 + Math.abs(trade.pnlPct) / 50;
      reasons.push(`large loss ${trade.pnlPct.toFixed(0)}%`);
    }
    if (RUG_EXIT_MARKERS.some((marker) => trade.exitReason.includes(marker))) {
      score += 3;
      reasons.push('exited on a rug-style signal');
    }
    if (trade.peakMultiple >= GAVE_BACK_PEAK && trade.pnlPct < GAVE_BACK_MAX_RESULT_PCT) {
      score += 2.5;
      reasons.push(`peaked at ${trade.peakMultiple.toFixed(2)}x but finished at ${trade.pnlPct.toFixed(0)}%`);
    }
    if (trade.pnlPct >= BIG_WIN_PCT) {
      score += 2;
      reasons.push(`strong win ${trade.pnlPct.toFixed(0)}%`);
    }
    if (trade.exitReason.includes('stop loss')) {
      score += 1.5;
      reasons.push('stop loss hit');
    }
    if (trade.exitReason.includes('hold limit') && Math.abs(trade.pnlPct) < 5) {
      score += 0.5;
      reasons.push('dead trade, went nowhere');
    }

    return { trade, score, reasons };
  }

  static select(trades: TradeSummary[], limit: number): ScoredTrade[] {
    return trades
      .map((trade) => TradeSignificanceScorer.score(trade))
      .filter((scored) => scored.score >= MIN_SCORE_TO_REVIEW)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
