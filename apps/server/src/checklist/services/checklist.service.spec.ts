import { describe, expect, it } from 'vitest';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { ChecklistService } from './checklist.service';

const buildSnapshot = (overrides: Partial<TokenSnapshot> = {}): TokenSnapshot => ({
  mint: 'MintAddress111',
  ageSeconds: 900,
  marketCapUsd: 250_000,
  priceChange5mPct: 20,
  authorities: { mintRevoked: true, freezeRevoked: true },
  extensions: { transferFee: false, transferHook: false, permanentDelegate: false },
  liquidity: { usd: 40_000, lpBurnedOrLockedPct: 100, exitPriceImpactPct: 1.2 },
  holders: { top10Pct: 22 },
  clusters: { bundledSupplyPct: 6, sniperSupplyPct: 8 },
  creator: { hasSold: false, priorTokenCount: 2, priorRugCount: 0 },
  sellability: { routeExists: true, simulatedSellOk: true },
  activity: { uniqueTraders5m: 80, buySellRatio5m: 1.4, holderGrowth5mPct: 6, washTradeSuspected: false },
  social: { contractAddressVerified: true, accountAgeDays: 40, copycatCount: 1, botEngagementRatio: 0.2 },
  portfolio: { openPositions: 1, dailyLossPct: 2 },
  ...overrides,
});

describe('ChecklistService', () => {
  const service = new ChecklistService();

  it('accepts a clean token as a candidate', () => {
    const report = service.evaluate(buildSnapshot());
    expect(report.verdict).toBe('candidate');
    expect(report.hardFailures).toEqual([]);
    expect(report.softScore).toBe(100);
  });

  it('rejects when the mint authority is still active', () => {
    const report = service.evaluate(buildSnapshot({ authorities: { mintRevoked: false, freezeRevoked: true } }));
    expect(report.verdict).toBe('reject');
    expect(report.hardFailures).toContain('token-authorities');
  });

  it('rejects when the top 10 holders are too concentrated', () => {
    const report = service.evaluate(buildSnapshot({ holders: { top10Pct: 55 } }));
    expect(report.hardFailures).toContain('holder-concentration');
  });

  it('rejects when bundled supply is too high', () => {
    const report = service.evaluate(buildSnapshot({ clusters: { bundledSupplyPct: 35, sniperSupplyPct: 5 } }));
    expect(report.hardFailures).toContain('bundled-supply');
  });

  it('rejects when the creator has already sold', () => {
    const report = service.evaluate(buildSnapshot({ creator: { hasSold: true, priorTokenCount: 1, priorRugCount: 0 } }));
    expect(report.hardFailures).toContain('creator-wallet');
  });

  it('rejects when the sell simulation fails', () => {
    const report = service.evaluate(buildSnapshot({ sellability: { routeExists: true, simulatedSellOk: false } }));
    expect(report.hardFailures).toContain('sellability');
  });

  it('rejects when the daily loss limit is reached', () => {
    const report = service.evaluate(buildSnapshot({ portfolio: { openPositions: 0, dailyLossPct: 12 } }));
    expect(report.hardFailures).toContain('timing-and-limits');
  });

  it('rejects when social signals are missing and activity is weak', () => {
    const report = service.evaluate(
      buildSnapshot({
        social: null,
        activity: { uniqueTraders5m: 5, buySellRatio5m: 1, holderGrowth5mPct: -3, washTradeSuspected: false },
      }),
    );
    expect(report.hardFailures).toEqual([]);
    expect(report.verdict).toBe('reject');
  });
});
