import { describe, expect, it } from 'vitest';
import type { PositionView } from '@kestrel/shared';
import { PositionQueryUtil } from './position-query.util';

const build = (overrides: Partial<PositionView>): PositionView => ({
  id: Math.random().toString(),
  mode: 'PAPER',
  mint: 'Mint',
  symbol: 'AAA',
  status: 'CLOSED',
  entrySol: 0.3,
  entryPriceSol: 1,
  lastPriceSol: 1,
  tokensHeld: 0,
  currentValueSol: 0,
  realizedSol: 0.3,
  pnlSol: 0,
  pnlPct: 0,
  plan: { style: 'swing', maxHoldMinutes: 60, takeProfitMultiple: 2, stopLossPct: 40 },
  marketCapUsd: 100_000,
  pairAddress: 'Pair',
  exitReason: null,
  openedAt: '2026-10-20T10:00:00.000Z',
  closedAt: null,
  ...overrides,
});

const sample = [
  build({ symbol: 'WIN', pnlSol: 0.3, pnlPct: 100, marketCapUsd: 500_000, openedAt: '2026-10-19T10:00:00.000Z' }),
  build({ symbol: 'LOSS', pnlSol: -0.2, pnlPct: -66, marketCapUsd: 80_000, openedAt: '2026-10-21T10:00:00.000Z' }),
  build({ symbol: 'FLAT', pnlSol: 0.01, pnlPct: 3, status: 'OPEN', marketCapUsd: 250_000, openedAt: '2026-10-20T10:00:00.000Z' }),
];

describe('PositionQueryUtil', () => {
  it('sorts by biggest profit first', () => {
    const result = PositionQueryUtil.apply(sample, { sort: 'profit_desc' });
    expect(result.items.map((p) => p.symbol)).toEqual(['WIN', 'FLAT', 'LOSS']);
  });

  it('sorts by worst percentage change first', () => {
    const result = PositionQueryUtil.apply(sample, { sort: 'pct_asc' });
    expect(result.items[0]?.symbol).toBe('LOSS');
  });

  it('filters by status', () => {
    const result = PositionQueryUtil.apply(sample, { status: 'OPEN' });
    expect(result.items.map((p) => p.symbol)).toEqual(['FLAT']);
  });

  it('filters by market cap range', () => {
    const result = PositionQueryUtil.apply(sample, { minMarketCap: 200_000, maxMarketCap: 600_000, sort: 'mcap_desc' });
    expect(result.items.map((p) => p.symbol)).toEqual(['WIN', 'FLAT']);
  });

  it('filters by percentage change range', () => {
    const result = PositionQueryUtil.apply(sample, { minPnlPct: 0 });
    expect(result.total).toBe(2);
  });

  it('includes the whole end day in a date filter', () => {
    const result = PositionQueryUtil.apply(sample, { from: '2026-10-20', to: '2026-10-20' });
    expect(result.items.map((p) => p.symbol)).toEqual(['FLAT']);
  });

  it('searches by symbol', () => {
    expect(PositionQueryUtil.apply(sample, { search: 'los' }).items).toHaveLength(1);
  });

  it('paginates and clamps the page', () => {
    const page = PositionQueryUtil.apply(sample, { pageSize: 2, page: 2, sort: 'newest' });
    expect(page.items).toHaveLength(1);
    expect(page.pages).toBe(2);
    expect(PositionQueryUtil.apply(sample, { pageSize: 2, page: 99 }).page).toBe(2);
  });
});
