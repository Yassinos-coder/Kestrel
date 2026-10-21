import type { RuleParams, RuleResult } from '@kestrel/shared';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class HolderDistributionValidator {
  static validateConcentration(snapshot: TokenSnapshot, params: RuleParams): RuleResult {
    const { top10Pct, top1Pct } = snapshot.holders;
    if (top10Pct > params.maxTop10HolderPct) {
      return RuleResultFactory.hard('holder-concentration', false, `top 10 holders own ${top10Pct.toFixed(1)}%`);
    }
    if (top1Pct > params.maxTop1HolderPct) {
      return RuleResultFactory.hard('holder-concentration', false, `largest holder owns ${top1Pct.toFixed(1)}%`);
    }
    return RuleResultFactory.hard(
      'holder-concentration',
      true,
      `top 10 own ${top10Pct.toFixed(1)}%, top 1 owns ${top1Pct.toFixed(1)}%`,
    );
  }

  static validateBundledSupply(snapshot: TokenSnapshot, params: RuleParams): RuleResult {
    const { bundledSupplyPct, sniperSupplyPct } = snapshot.clusters;
    if (bundledSupplyPct > params.maxBundledSupplyPct) {
      return RuleResultFactory.hard('bundled-supply', false, `${bundledSupplyPct.toFixed(1)}% of supply is bundled`);
    }
    if (sniperSupplyPct > params.maxSniperSupplyPct) {
      return RuleResultFactory.hard('bundled-supply', false, `snipers hold ${sniperSupplyPct.toFixed(1)}% of supply`);
    }
    return RuleResultFactory.hard('bundled-supply', true, 'bundled and sniper supply within limits');
  }
}
