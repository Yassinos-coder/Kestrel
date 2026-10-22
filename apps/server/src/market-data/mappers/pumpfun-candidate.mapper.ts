import type { PoolCandidate } from '../interfaces/market-data.interface';
import type { PumpFunCoin } from '../interfaces/pumpfun.interface';

const PUMPSWAP_DEX_ID = 'pumpswap';

export class PumpFunCandidateMapper {
  static toCandidates(coins: PumpFunCoin[]): PoolCandidate[] {
    return coins.flatMap((coin) => {
      const candidate = PumpFunCandidateMapper.toCandidate(coin);
      return candidate ? [candidate] : [];
    });
  }

  private static toCandidate(coin: PumpFunCoin): PoolCandidate | null {
    if (!coin.complete || coin.is_banned || !coin.pump_swap_pool) return null;
    return {
      pairAddress: coin.pump_swap_pool,
      mint: coin.mint,
      name: `${coin.symbol} / SOL`,
      dexId: PUMPSWAP_DEX_ID,
      createdAtMs: coin.created_timestamp,
      buys5m: 0,
      sells5m: 0,
      buyers5m: 0,
      sellers5m: 0,
    };
  }
}
