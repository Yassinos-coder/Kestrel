import { describe, expect, it } from 'vitest';
import type { WalletPerformanceSummary } from '../../market-data/interfaces/birdeye.interface';
import { WalletVettingValidator } from './wallet-vetting.validator';

const good: WalletPerformanceSummary = {
  uniqueTokens: 35,
  trades: 233,
  wins: 40,
  losses: 60,
  winRatePct: 40,
  realizedProfitUsd: 169_000,
  realizedProfitPct: 464,
};

describe('WalletVettingValidator', () => {
  it('accepts a profitable wallet that trades many tokens', () => {
    expect(WalletVettingValidator.passes(good)).toBe(true);
  });

  it('rejects one-token insiders, bots and unprofitable wallets', () => {
    expect(WalletVettingValidator.rejections({ ...good, uniqueTokens: 2 })).toContain('trades too few different tokens');
    expect(WalletVettingValidator.rejections({ ...good, trades: 9_000 })).toContain('trades like a bot (too many trades)');
    expect(WalletVettingValidator.rejections({ ...good, winRatePct: 20 })).toContain('win rate is too low');
    expect(WalletVettingValidator.rejections({ ...good, realizedProfitUsd: 300 })).toContain('not profitable enough');
    expect(WalletVettingValidator.rejections({ ...good, realizedProfitPct: 5 })).toContain('return on money invested is too low');
  });
});
