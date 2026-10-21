import type { RuleResult } from '@kestrel/shared';
import { CHECKLIST_THRESHOLDS } from '../constants/checklist-thresholds.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class LiquidityValidator {
  static validate(snapshot: TokenSnapshot): RuleResult {
    const { usd, lpBurnedOrLockedPct, exitPriceImpactPct } = snapshot.liquidity;
    if (usd < CHECKLIST_THRESHOLDS.minLiquidityUsd) {
      return RuleResultFactory.hard('liquidity', false, `liquidity $${usd} is below the minimum`);
    }
    if (lpBurnedOrLockedPct < CHECKLIST_THRESHOLDS.minLpBurnedOrLockedPct) {
      return RuleResultFactory.hard('liquidity', false, `only ${lpBurnedOrLockedPct}% of LP is burned or locked`);
    }
    if (exitPriceImpactPct > CHECKLIST_THRESHOLDS.maxExitPriceImpactPct) {
      return RuleResultFactory.hard('liquidity', false, `exit price impact ${exitPriceImpactPct}% is too high`);
    }
    return RuleResultFactory.hard('liquidity', true, 'liquidity is deep and secured');
  }
}
