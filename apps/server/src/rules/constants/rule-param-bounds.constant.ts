import type { RuleParamKey } from '@kestrel/shared';
import type { ParamBounds } from '../interfaces/param-bounds.interface';

export const RULE_PARAM_BOUNDS: Record<RuleParamKey, ParamBounds> = {
  minLiquidityUsd: { min: 8_000, max: 80_000 },
  maxTop10HolderPct: { min: 15, max: 50 },
  maxTop1HolderPct: { min: 5, max: 35 },
  maxBundledSupplyPct: { min: 5, max: 35 },
  maxSniperSupplyPct: { min: 5, max: 35 },
  minTokenAgeSeconds: { min: 120, max: 1_800, integer: true },
  minMarketCapUsd: { min: 20_000, max: 500_000 },
  maxMarketCapUsd: { min: 500_000, max: 10_000_000 },
  maxPriceChange5mPct: { min: 50, max: 400 },
  minUniqueTraders5m: { min: 10, max: 200, integer: true },
  minBuySellRatio5m: { min: 0.5, max: 1 },
  maxBuySellRatio5m: { min: 1.5, max: 6 },
  minSoftScore: { min: 40, max: 80 },
  minConfidence: { min: 50, max: 85, integer: true },
  maxPositionPct: { min: 0.5, max: 5 },
  maxOpenPositions: { min: 1, max: 8, integer: true },
  dailyLossLimitPct: { min: 3, max: 15 },
  stopLossPct: { min: 20, max: 60 },
  trailingStopPct: { min: 15, max: 50 },
  maxHoldMinutes: { min: 10, max: 1_440, integer: true },
  sellStreakExit: { min: 5, max: 20, integer: true },
  takeProfit1Multiple: { min: 1.3, max: 4 },
  takeProfit1SellPct: { min: 25, max: 75 },
  takeProfit2Multiple: { min: 2, max: 12 },
  takeProfit2SellPct: { min: 10, max: 50 },
};

export const MAX_PARAM_STEP_PCT = 25;
export const MAX_PARAM_CHANGES_PER_REVIEW = 5;
export const MAX_ACTIVE_PLAYBOOKS = 12;
