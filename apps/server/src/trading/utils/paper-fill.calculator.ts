import { COSTS, FIXED_FEE_PER_LEG_SOL } from '../constants/cost.constant';
import type { Fill, PoolState } from '../interfaces/trading.interface';

export class PaperFillCalculator {
  static buy(solAmount: number, pool: PoolState): Fill {
    const tokenReserve = pool.quoteReserveSol / pool.priceSol;
    const net = Math.max(0, solAmount - FIXED_FEE_PER_LEG_SOL);
    const netAfterFee = net * (1 - COSTS.swapFeeRate);
    const tokensOut = ((tokenReserve * netAfterFee) / (pool.quoteReserveSol + netAfterFee)) * (1 - COSTS.modeledSlippage);

    return {
      tokenAmount: tokensOut,
      solAmount,
      feesSol: FIXED_FEE_PER_LEG_SOL + net * COSTS.swapFeeRate,
      priceSol: tokensOut > 0 ? solAmount / tokensOut : pool.priceSol,
      signature: null,
    };
  }

  static sell(tokenAmount: number, pool: PoolState): Fill {
    const tokenReserve = pool.quoteReserveSol / pool.priceSol;
    const tokensAfterFee = tokenAmount * (1 - COSTS.swapFeeRate);
    const gross = (pool.quoteReserveSol * tokensAfterFee) / (tokenReserve + tokensAfterFee);
    const received = Math.max(0, gross * (1 - COSTS.modeledSlippage) - FIXED_FEE_PER_LEG_SOL);

    return {
      tokenAmount,
      solAmount: received,
      feesSol: FIXED_FEE_PER_LEG_SOL + (tokenAmount - tokensAfterFee) * pool.priceSol,
      priceSol: tokenAmount > 0 ? received / tokenAmount : pool.priceSol,
      signature: null,
    };
  }
}
