const LAMPORTS_PER_SOL = 1_000_000_000;

export const COSTS = {
  swapFeeRate: 0.01,
  modeledSlippage: 0.01,
  priorityFeeSol: 0.0005,
  networkFeeSol: 0.000005,
  jitoTipSol: 0,
  buySlippageToleranceBps: 500,
  sellSlippageToleranceBps: 1_500,
  tokenAccountRentSol: 0.00204,
} as const;

export const FIXED_FEE_PER_LEG_SOL = COSTS.priorityFeeSol + COSTS.networkFeeSol + COSTS.jitoTipSol;
export const PRIORITY_FEE_MAX_LAMPORTS = Math.round(COSTS.priorityFeeSol * LAMPORTS_PER_SOL);
