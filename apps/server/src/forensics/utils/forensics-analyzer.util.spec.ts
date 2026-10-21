import { describe, expect, it } from 'vitest';
import type { ParsedSwap, WalletProfile } from '../../market-data/interfaces/helius.interface';
import { ForensicsAnalyzer, type ForensicsInputs } from './forensics-analyzer.util';

const NOW = 1_800_000_000_000;
const swap = (wallet: string, side: 'buy' | 'sell', offsetSec: number, tokens: number): ParsedSwap => ({
  signature: `${wallet}-${side}-${offsetSec}`,
  timestampMs: NOW - 3_600_000 + offsetSec * 1000,
  wallet,
  side,
  tokenAmount: tokens,
});

const profile = (address: string, ageHours: number | null, txCount: number): WalletProfile => ({ address, ageHours, txCount, oldestSignature: 's' });

const base = (): ForensicsInputs => ({
  supplyRaw: 1000,
  holderCount: 1234,
  topHolders: [
    { owner: 'POOL', amount: 500 },
    { owner: 'SNIPER', amount: 200 },
    { owner: 'FRESH1', amount: 120 },
    { owner: 'FRESH2', amount: 80 },
    { owner: 'OLD', amount: 60 },
    { owner: 'DUST', amount: 40 },
  ],
  excludedOwners: new Set(['POOL']),
  swaps: [
    swap('SNIPER', 'buy', 0, 300),
    swap('FRESH1', 'buy', 20, 120),
    swap('OLD', 'buy', 600, 60),
    swap('SNIPER', 'sell', 900, 100),
  ],
  swapsReachedStart: true,
  profiles: new Map([
    ['SNIPER', profile('SNIPER', 2, 8)],
    ['FRESH1', profile('FRESH1', 5, 4)],
    ['FRESH2', profile('FRESH2', 6, 3)],
    ['OLD', profile('OLD', 5000, 400)],
  ]),
  funders: new Map([
    ['FRESH1', 'FUNDER'],
    ['FRESH2', 'FUNDER'],
    ['OLD', 'OTHER'],
  ]),
  nowMs: NOW,
});

describe('ForensicsAnalyzer', () => {
  it('excludes pool accounts and ranks holders by balance', () => {
    const result = ForensicsAnalyzer.analyze(base());
    expect(result.holderCount).toBe(1234);
    expect(result.topHolders[0]?.owner).toBe('SNIPER');
    expect(result.top1Pct).toBeCloseTo(20, 1);
  });

  it('finds early buyers and how much they still hold and have sold', () => {
    const result = ForensicsAnalyzer.analyze(base());
    expect(result.earlyBuyerWallets.sort()).toEqual(['FRESH1', 'SNIPER']);
    expect(result.earlyBuyerHoldPct).toBeCloseTo(32, 1);
    expect(result.earlyBuyersSoldPct).toBeCloseTo((100 / 420) * 100, 1);
  });

  it('flags fresh wallets and same-funder clusters', () => {
    const result = ForensicsAnalyzer.analyze(base());
    expect(result.freshWalletPct).toBeCloseTo(40, 1);
    expect(result.sameFunderPct).toBeCloseTo(20, 1);
  });

  it('does not guess early buyers when the launch is not visible', () => {
    const result = ForensicsAnalyzer.analyze({ ...base(), swapsReachedStart: false });
    expect(result.launchVisible).toBe(false);
    expect(result.earlyBuyerCount).toBe(0);
  });

  it('measures recent sell pressure', () => {
    const inputs = base();
    inputs.swaps.push(swap('X', 'sell', 3_500, 400), swap('Y', 'buy', 3_550, 100));
    const result = ForensicsAnalyzer.analyze(inputs);
    expect(result.sellBuyVolumeRatio).toBeCloseTo(4, 1);
    expect(result.uniqueSellers).toBe(2);
  });
});
