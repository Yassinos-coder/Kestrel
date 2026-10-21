import type { Fill, PoolState } from '../interfaces/trading.interface';

const SWAP_FEE_RATE = 0.01;
const EXTRA_SLIPPAGE = 0.01;
const FIXED_FEE_SOL = 0.002;

export class PaperFillCalculator {
  static buy(solAmount: number, pool: PoolState): Fill {
    const tokenReserve = pool.quoteReserveSol / pool.priceSol;
    const net = Math.max(0, solAmount - FIXED_FEE_SOL);
    const netAfterFee = net * (1 - SWAP_FEE_RATE);
    const tokensOut = ((tokenReserve * netAfterFee) / (pool.quoteReserveSol + netAfterFee)) * (1 - EXTRA_SLIPPAGE);

    return {
      tokenAmount: tokensOut,
      solAmount,
      feesSol: FIXED_FEE_SOL + net * SWAP_FEE_RATE,
      priceSol: tokensOut > 0 ? solAmount / tokensOut : pool.priceSol,
      signature: null,
    };
  }

  static sell(tokenAmount: number, pool: PoolState): Fill {
    const tokenReserve = pool.quoteReserveSol / pool.priceSol;
    const tokensAfterFee = tokenAmount * (1 - SWAP_FEE_RATE);
    const gross = (pool.quoteReserveSol * tokensAfterFee) / (tokenReserve + tokensAfterFee);
    const received = Math.max(0, gross * (1 - EXTRA_SLIPPAGE) - FIXED_FEE_SOL);

    return {
      tokenAmount,
      solAmount: received,
      feesSol: FIXED_FEE_SOL + (tokenAmount - tokensAfterFee) * pool.priceSol,
      priceSol: tokenAmount > 0 ? received / tokenAmount : pool.priceSol,
      signature: null,
    };
  }
}
