import type { WalletPerformanceSummary } from '../../market-data/interfaces/birdeye.interface';

const MIN_UNIQUE_TOKENS = 10;
const MIN_TRADES = 20;
const MAX_TRADES = 3_000;
const MIN_WIN_RATE_PCT = 35;
const MIN_PROFIT_USD = 2_000;
const MIN_PROFIT_PCT = 25;

export class WalletVettingValidator {
  static rejections(summary: WalletPerformanceSummary): string[] {
    const reasons: string[] = [];
    if (summary.uniqueTokens < MIN_UNIQUE_TOKENS) reasons.push('trades too few different tokens');
    if (summary.trades < MIN_TRADES) reasons.push('too few trades');
    if (summary.trades > MAX_TRADES) reasons.push('trades like a bot (too many trades)');
    if (summary.winRatePct < MIN_WIN_RATE_PCT) reasons.push('win rate is too low');
    if (summary.realizedProfitUsd < MIN_PROFIT_USD) reasons.push('not profitable enough');
    if (summary.realizedProfitPct < MIN_PROFIT_PCT) reasons.push('return on money invested is too low');
    return reasons;
  }

  static passes(summary: WalletPerformanceSummary): boolean {
    return WalletVettingValidator.rejections(summary).length === 0;
  }
}
