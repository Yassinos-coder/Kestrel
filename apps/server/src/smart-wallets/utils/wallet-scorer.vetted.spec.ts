import { describe, expect, it } from 'vitest';
import type { WalletPerformanceSummary } from '../../market-data/interfaces/birdeye.interface';
import type { WalletStats } from '../interfaces/wallet.interface';
import { WalletScorer } from './wallet-scorer';

const NOW = 1_800_000_000_000;
const stats: WalletStats = {
  swapsAnalyzed: 120,
  solSidedPct: 80,
  tokensTraded: 20,
  closedTokens: 2,
  winRatePct: 10,
  totalPnlSol: 0,
  avgPnlPerTokenSol: 0,
  bestTokenSharePct: 100,
  medianHoldMinutes: 12,
  swapsPerDay: 40,
  spanDays: 3,
  avgBuySol: 0.5,
  earlyEntryPct: null,
  lastActiveMs: NOW - 3_600_000,
};
const summary: WalletPerformanceSummary = { uniqueTokens: 35, trades: 233, wins: 40, losses: 60, winRatePct: 40, realizedProfitUsd: 169_000, realizedProfitPct: 464 };

describe('WalletScorer.assessVetted', () => {
  it('tiers a wallet on its verified profit record and shows those numbers', () => {
    const result = WalletScorer.assessVetted(stats, summary, 104, NOW);
    expect(result.tier).toBe('B');
    expect(result.stats.winRatePct).toBe(40);
    expect(result.stats.closedTokens).toBe(100);
    expect(result.stats.totalPnlSol).toBeCloseTo(1625, 0);
  });

  it('refuses wallets whose swaps cannot be read, bots and inactive wallets', () => {
    expect(WalletScorer.assessVetted({ ...stats, swapsAnalyzed: 0 }, summary, 104, NOW).tier).toBeNull();
    expect(WalletScorer.assessVetted({ ...stats, swapsPerDay: 400 }, summary, 104, NOW).rejectReasons).toContain('trades like a bot (too many swaps per day)');
    expect(WalletScorer.assessVetted({ ...stats, lastActiveMs: NOW - 9 * 86_400_000 }, summary, 104, NOW).rejectReasons).toContain('no recent activity');
  });
});
