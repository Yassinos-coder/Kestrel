import { describe, expect, it } from 'vitest';
import type { TradeFeatures } from '@kestrel/shared';
import type { PoolTrade } from '../../market-data/interfaces/market-data.interface';
import type { PositionContext } from '../interfaces/trading.interface';
import { ExitEvidenceBuilder } from './exit-evidence.builder';

const NOW = 1_800_000_000_000;
const context: PositionContext = {
  decimals: 6,
  creator: 'CREATOR',
  topHolderOwners: ['WHALE1', 'WHALE2'],
  entryLiquidityUsd: 30_000,
  exitPlan: { tp1Multiple: 2, tp1SellPct: 50, tp2Multiple: 5, tp2SellPct: 25, stopLossPct: 45, trailingStopPct: 30, maxHoldMinutes: 240, sellStreakExit: 10 },
  tp1Done: false,
  tp2Done: false,
  features: {} as TradeFeatures,
  ruleVersion: 1,
  matchedPlaybooks: [],
  reasoning: '',
  earlyBuyerWallets: ['SNIPER'],
};
const trade = (wallet: string, kind: 'buy' | 'sell', agoSec: number, tokens: number): PoolTrade => ({
  kind,
  wallet,
  tokenAmount: tokens,
  solAmount: tokens / 1000,
  timestampMs: NOW - agoSec * 1000,
});

describe('ExitEvidenceBuilder', () => {
  const trades = [
    trade('A', 'buy', 400, 100),
    trade('SNIPER', 'sell', 120, 500),
    trade('WHALE1', 'sell', 90, 3_000),
    trade('CREATOR', 'sell', 60, 1_000),
    trade('RANDOM', 'sell', 30, 200),
    trade('WHALE2', 'sell', 10, 800),
  ];
  const evidence = ExitEvidenceBuilder.build(trades, context, NOW - 3_600_000, NOW);

  it('counts the run of consecutive sells', () => {
    expect(evidence.sellStreak).toBe(5);
  });

  it('classifies who was selling', () => {
    expect(evidence.soldByCreator).toBe(true);
    expect(evidence.topHoldersSelling).toBe(2);
    expect(evidence.earlyBuyersSelling).toBe(1);
    expect(evidence.otherSellers).toBe(1);
    expect(evidence.uniqueSellers).toBe(5);
  });

  it('ranks the biggest sellers with their share', () => {
    expect(evidence.topSellers[0]?.wallet).toBe('WHALE1');
    expect(evidence.topSellers[0]?.role).toBe('top-holder');
    expect(evidence.topSellers[0]?.sharePct).toBeCloseTo((3000 / 5500) * 100, 1);
  });

  it('compares sell volume with buy volume', () => {
    expect(evidence.sellVsBuyVolume).toBeGreaterThan(10);
  });

  it('only looks at trades after the position opened', () => {
    const late = ExitEvidenceBuilder.build(trades, context, NOW - 100_000, NOW);
    expect(late.topSellers.some((seller) => seller.wallet === 'SNIPER')).toBe(false);
  });
});
