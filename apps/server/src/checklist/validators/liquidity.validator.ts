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
      const reason =
        lpBurnedOrLockedPct < 1
          ? 'no liquidity is burned or locked, the wallet holding the LP tokens can withdraw it'
          : `only ${lpBurnedOrLockedPct.toFixed(1)}% of liquidity is burned or locked`;
      return RuleResultFactory.hard('liquidity', false, reason);
    }
    if (exitPriceImpactPct > STATIC_LIMITS.maxExitPriceImpactPct) {
      return RuleResultFactory.hard('liquidity', false, `exit price impact ${exitPriceImpactPct.toFixed(1)}% is too high`);
    }
    return RuleResultFactory.hard('liquidity', true, 'liquidity is deep and secured');
  }
}
