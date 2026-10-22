import { describe, expect, it } from 'vitest';
import type { PumpFunCoin } from '../interfaces/pumpfun.interface';
import { PumpFunCandidateMapper } from './pumpfun-candidate.mapper';

const coin = (overrides: Partial<PumpFunCoin> = {}): PumpFunCoin => ({
  mint: 'MintAddressxxxxxxxxxxxxxxxxxxxxxxxxxxpump',
  name: 'Example',
  symbol: 'EXM',
  created_timestamp: 1_700_000_000_000,
  complete: true,
  pump_swap_pool: 'PoolAddressxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  ...overrides,
});

describe('PumpFunCandidateMapper', () => {
  it('maps a graduated coin to a pumpswap candidate', () => {
    const [candidate] = PumpFunCandidateMapper.toCandidates([coin()]);
    expect(candidate).toMatchObject({
      pairAddress: 'PoolAddressxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      mint: 'MintAddressxxxxxxxxxxxxxxxxxxxxxxxxxxpump',
      dexId: 'pumpswap',
      createdAtMs: 1_700_000_000_000,
    });
  });

  it('skips coins without a pool, still on the curve, or banned', () => {
    const result = PumpFunCandidateMapper.toCandidates([
      coin({ pump_swap_pool: null }),
      coin({ complete: false }),
      coin({ is_banned: true }),
    ]);
    expect(result).toEqual([]);
  });
});
