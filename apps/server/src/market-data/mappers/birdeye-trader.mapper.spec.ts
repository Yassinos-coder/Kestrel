import { describe, expect, it } from 'vitest';
import { BirdeyeTraderMapper } from './birdeye-trader.mapper';

const A = 'ARu4n5mFdZogZAravu7CcizaojWnS6oqka37gdLT5SZn';
const B = 'D5YqVMoSxnqeZAKAUUE1Dm3bmjtdxQ5DCF356ozqN9cM';
const C = 'HgQ8PHh9vdLpo9ZdjzRFhrjeksA5Yq6qHp4jnnMh5pZd';

describe('BirdeyeTraderMapper', () => {
  it('reads the wallet, realized profit and tags from the items list', () => {
    const traders = BirdeyeTraderMapper.toTraders({
      data: { items: [{ owner: A, realizedPnl: 5200.5, tags: ['Smart_Trader'] }, { address: B, totalPnl: 90 }] },
    });
    expect(traders).toEqual([
      { wallet: A, realizedPnlUsd: 5200.5, tags: ['smart_trader'] },
      { wallet: B, realizedPnlUsd: 90, tags: [] },
    ]);
  });

  it('drops developer and bundler wallets and invalid addresses', () => {
    const traders = BirdeyeTraderMapper.toTraders({
      data: { items: [{ owner: A, tags: ['dev'] }, { owner: B, tags: ['bundler'] }, { owner: 'not-a-wallet' }, { owner: C, tags: ['sniper'] }] },
    });
    expect(traders.map((trader) => trader.wallet)).toEqual([C]);
  });

  it('accepts a bare array and an empty response', () => {
    expect(BirdeyeTraderMapper.toTraders({ data: [{ owner: A }] })).toHaveLength(1);
    expect(BirdeyeTraderMapper.toTraders({})).toEqual([]);
  });
});
