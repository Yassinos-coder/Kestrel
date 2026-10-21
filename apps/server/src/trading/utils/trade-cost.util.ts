import type { CostEstimateView } from '@kestrel/shared';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';
import { COSTS, FIXED_FEE_PER_LEG_SOL } from '../constants/cost.constant';
import type { PoolState } from '../interfaces/trading.interface';
import { PaperFillCalculator } from './paper-fill.calculator';

const PERCENT = 100;
const LEGS = 2;

export interface CostCheck {
  ok: boolean;
  reason: string | null;
}

export class TradeCostUtil {
  static estimate(sizeSol: number, pool: PoolState): CostEstimateView {
    const buy = PaperFillCalculator.buy(sizeSol, pool);
    const sell = PaperFillCalculator.sell(buy.tokenAmount, pool);
    const roundTripCostSol = sizeSol - sell.solAmount;

    return {
      sizeSol,
      roundTripCostSol,
      roundTripCostPct: sizeSol > 0 ? (roundTripCostSol / sizeSol) * PERCENT : 0,
      breakEvenMovePct: sell.solAmount > 0 ? (sizeSol / sell.solAmount - 1) * PERCENT : PERCENT,
      entryImpactPct: (sizeSol / (pool.quoteReserveSol + sizeSol)) * PERCENT,
      swapFeePct: COSTS.swapFeeRate * LEGS * PERCENT,
      fixedCostSol: FIXED_FEE_PER_LEG_SOL * LEGS,
    };
  }

  static check(estimate: CostEstimateView, firstTargetMultiple: number): CostCheck {
    if (estimate.roundTripCostPct > STATIC_LIMITS.maxRoundTripCostPct) {
      return {
        ok: false,
        reason: `round-trip costs of ${estimate.roundTripCostPct.toFixed(1)}% are too high for a ${estimate.sizeSol.toFixed(3)} SOL position`,
      };
    }
    const targetGainPct = (firstTargetMultiple - 1) * PERCENT;
    if (targetGainPct < estimate.breakEvenMovePct * STATIC_LIMITS.minTargetToCostRatio) {
      return {
        ok: false,
        reason: `the ${targetGainPct.toFixed(0)}% first target does not clear the ${estimate.breakEvenMovePct.toFixed(1)}% break-even move by enough`,
      };
    }
    return { ok: true, reason: null };
  }
}
