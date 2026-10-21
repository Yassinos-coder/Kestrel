import { describe, expect, it } from 'vitest';
import type { TokenSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import { CopyGateValidator } from './copy-gate.validator';

const snapshot = (overrides: Partial<TokenSnapshot> = {}): TokenSnapshot => ({
  mint: 'M',
  symbol: 'T',
  name: 'T',
  pairAddress: 'P',
  dexId: 'pumpswap',
  decimals: 6,
  ageSeconds: 30,
  marketCapUsd: 30_000,
  priceSol: 0.00001,
  priceChange5mPct: 80,
  authorities: { mintRevoked: true, freezeRevoked: true },
  extensions: { transferFee: false, transferHook: false, permanentDelegate: false },
  liquidity: { usd: 20_000, quoteSol: 100, lpBurnedOrLockedPct: 100, exitPriceImpactPct: 2 },
  holders: { top10Pct: 70, top1Pct: 40, totalHolders: 20, topHolderOwners: [], excludedOwners: [], supplyRaw: 0 },
  clusters: { bundledSupplyPct: 50, sniperSupplyPct: 40 },
  creator: { address: 'C', hasSold: false, priorTokenCount: 0, priorRugCount: 0, flaggedRugged: false },
  sellability: { routeExists: true, simulatedSellOk: true },
  activity: { uniqueTraders5m: 5, buySellRatio5m: 5, holderGrowth5mPct: 0, washTradeSuspected: false },
  momentum: { priceChange1hPct: 80, volumeTrendRatio: 2 },
  portfolio: { openPositions: 0, dailyLossPct: 0 },
  ...overrides,
});

const options = { minLiquidityUsd: 8_000, requireSecuredLp: true };

describe('CopyGateValidator', () => {
  it('allows a very new, concentrated token as long as the safety basics hold', () => {
    expect(CopyGateValidator.validate(snapshot(), options).passed).toBe(true);
  });

  it('blocks tokens with an active mint authority', () => {
    expect(CopyGateValidator.validate(snapshot({ authorities: { mintRevoked: false, freezeRevoked: true } }), options).passed).toBe(false);
  });

  it('blocks tokens that cannot be sold', () => {
    expect(CopyGateValidator.validate(snapshot({ sellability: { routeExists: false, simulatedSellOk: false } }), options).passed).toBe(false);
  });

  it('blocks unsecured liquidity only when the follower asked for secured liquidity', () => {
    const unsecured = snapshot({ liquidity: { usd: 20_000, quoteSol: 100, lpBurnedOrLockedPct: 0, exitPriceImpactPct: 2 } });
    expect(CopyGateValidator.validate(unsecured, options).passed).toBe(false);
    expect(CopyGateValidator.validate(unsecured, { ...options, requireSecuredLp: false }).passed).toBe(true);
  });

  it('blocks thin liquidity', () => {
    const thin = snapshot({ liquidity: { usd: 3_000, quoteSol: 15, lpBurnedOrLockedPct: 100, exitPriceImpactPct: 2 } });
    expect(CopyGateValidator.validate(thin, options).passed).toBe(false);
  });
});
