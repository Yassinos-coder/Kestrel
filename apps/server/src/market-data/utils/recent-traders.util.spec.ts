import { describe, expect, it } from 'vitest';
import type { PoolCandidate, PoolTrade } from '../interfaces/market-data.interface';
import { RecentTraders } from './recent-traders.util';

const NOW = 1_700_000_000_000;

const trade = (wallet: string, agoMs: number): PoolTrade => ({ kind: 'buy', wallet, tokenAmount: 1, solAmount: 1, timestampMs: NOW - agoMs });
const candidate = (buyers: number, sellers: number): PoolCandidate => ({
  pairAddress: 'p',
  mint: 'm',
  name: 'n',
  dexId: 'd',
  createdAtMs: NOW,
  buys5m: 0,
  sells5m: 0,
  buyers5m: buyers,
  sellers5m: sellers,
});

describe('RecentTraders', () => {
  it('uses the counts reported by the feed when present', () => {
    expect(RecentTraders.count(candidate(40, 10), [], NOW)).toBe(50);
  });

  it('counts distinct wallets from the last five minutes when the feed has none', () => {
    const trades = [trade('a', 1_000), trade('a', 2_000), trade('b', 60_000), trade('c', 6 * 60_000)];
    expect(RecentTraders.count(null, trades, NOW)).toBe(2);
    expect(RecentTraders.count(candidate(0, 0), trades, NOW)).toBe(2);
  });

  it('is zero with no data', () => {
    expect(RecentTraders.count(null, [], NOW)).toBe(0);
  });
});
