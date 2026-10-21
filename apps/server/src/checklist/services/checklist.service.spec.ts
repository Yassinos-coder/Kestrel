import { describe, expect, it } from 'vitest';
import { DEFAULT_RULE_PARAMS } from '../../rules/constants/default-rule-params.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { ChecklistService } from './checklist.service';

const buildSnapshot = (overrides: Partial<TokenSnapshot> = {}): TokenSnapshot => ({
  mint: 'MintAddress111',
  symbol: 'TEST',
  name: 'Test Token',
  pairAddress: 'Pair111',
  dexId: 'pumpswap',
  decimals: 6,
  ageSeconds: 900,
  marketCapUsd: 250_000,
  priceSol: 0.00001,
  priceChange5mPct: 20,
  authorities: { mintRevoked: true, freezeRevoked: true },
  extensions: { transferFee: false, transferHook: false, permanentDelegate: false },
  liquidity: { usd: 40_000, quoteSol: 180, lpBurnedOrLockedPct: 100, exitPriceImpactPct: 1.2 },
  holders: { top10Pct: 22, top1Pct: 7, totalHolders: 400, topHolderOwners: [] },
  clusters: { bundledSupplyPct: 6, sniperSupplyPct: 8 },
  creator: { address: 'Creator111', hasSold: false, priorTokenCount: 2, priorRugCount: 0, flaggedRugged: false },
  sellability: { routeExists: true, simulatedSellOk: true },
  activity: { uniqueTraders5m: 80, buySellRatio5m: 1.4, holderGrowth5mPct: 6, washTradeSuspected: false },
  momentum: { priceChange1hPct: 40, volumeTrendRatio: 1.1 },
  portfolio: { openPositions: 1, dailyLossPct: 2 },
  ...overrides,
});

describe('ChecklistService', () => {
  const service = new ChecklistService();
  const params = DEFAULT_RULE_PARAMS;

  it('accepts a clean token as a candidate', () => {
    const report = service.evaluate(buildSnapshot(), params);
    expect(report.verdict).toBe('candidate');
    expect(report.hardFailures).toEqual([]);
    expect(report.softScore).toBe(100);
  });

  it('rejects when the mint authority is still active', () => {
    const report = service.evaluate(buildSnapshot({ authorities: { mintRevoked: false, freezeRevoked: true } }), params);
    expect(report.verdict).toBe('reject');
    expect(report.hardFailures).toContain('token-authorities');
  });

  it('rejects when the top 10 holders are too concentrated', () => {
    const holders = { top10Pct: 55, top1Pct: 9, totalHolders: 100, topHolderOwners: [] };
    const report = service.evaluate(buildSnapshot({ holders }), params);
    expect(report.hardFailures).toContain('holder-concentration');
  });

  it('rejects when a single holder is too large', () => {
    const holders = { top10Pct: 28, top1Pct: 22, totalHolders: 100, topHolderOwners: [] };
    const report = service.evaluate(buildSnapshot({ holders }), params);
    expect(report.hardFailures).toContain('holder-concentration');
  });

  it('rejects when bundled supply is too high', () => {
    const report = service.evaluate(buildSnapshot({ clusters: { bundledSupplyPct: 35, sniperSupplyPct: 5 } }), params);
    expect(report.hardFailures).toContain('bundled-supply');
  });

  it('rejects when the creator has already sold', () => {
    const creator = { address: 'C', hasSold: true, priorTokenCount: 1, priorRugCount: 0, flaggedRugged: false };
    const report = service.evaluate(buildSnapshot({ creator }), params);
    expect(report.hardFailures).toContain('creator-wallet');
  });

  it('rejects when the sell simulation fails', () => {
    const report = service.evaluate(buildSnapshot({ sellability: { routeExists: true, simulatedSellOk: false } }), params);
    expect(report.hardFailures).toContain('sellability');
  });

  it('rejects when the daily loss limit is reached', () => {
    const report = service.evaluate(buildSnapshot({ portfolio: { openPositions: 0, dailyLossPct: 12 } }), params);
    expect(report.hardFailures).toContain('timing-and-limits');
  });

  it('respects tuned parameters', () => {
    const holders = { top10Pct: 38, top1Pct: 9, totalHolders: 100, topHolderOwners: [] };
    const strict = service.evaluate(buildSnapshot({ holders }), params);
    const relaxed = service.evaluate(buildSnapshot({ holders }), { ...params, maxTop10HolderPct: 40 });
    expect(strict.hardFailures).toContain('holder-concentration');
    expect(relaxed.hardFailures).not.toContain('holder-concentration');
  });

  it('screen ignores the scored rules', () => {
    const momentum = { priceChange1hPct: -60, volumeTrendRatio: 0.1 };
    const report = service.screen(buildSnapshot({ momentum }), params);
    expect(report.verdict).toBe('candidate');
  });

  it('rejects when activity and momentum are both weak', () => {
    const activity = { uniqueTraders5m: 5, buySellRatio5m: 1, holderGrowth5mPct: -3, washTradeSuspected: true };
    const momentum = { priceChange1hPct: -50, volumeTrendRatio: 0.2 };
    const report = service.evaluate(buildSnapshot({ momentum, activity }), params);
    expect(report.hardFailures).toEqual([]);
    expect(report.verdict).toBe('reject');
  });
});
