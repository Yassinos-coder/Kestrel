import type { RuleParams, RuleResult } from '@kestrel/shared';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class LiquidityValidator {
  static validate(snapshot: TokenSnapshot, params: RuleParams): RuleResult {
    const { usd, lpBurnedOrLockedPct, exitPriceImpactPct } = snapshot.liquidity;
    if (usd < params.minLiquidityUsd) {
      return RuleResultFactory.hard('liquidity', false, `liquidity $${Math.round(usd)} is below the minimum`);
    }
    if (lpBurnedOrLockedPct < STATIC_LIMITS.minLpBurnedOrLockedPct) {
      return RuleResultFactory.hard('liquidity', false, `only ${lpBurnedOrLockedPct}% of LP is burned or locked`);
    }
    if (exitPriceImpactPct > STATIC_LIMITS.maxExitPriceImpactPct) {
      return RuleResultFactory.hard('liquidity', false, `exit price impact ${exitPriceImpactPct.toFixed(1)}% is too high`);
    }
    return RuleResultFactory.hard('liquidity', true, 'liquidity is deep and secured');
  }
}
