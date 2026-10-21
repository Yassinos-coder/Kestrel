import type { RuleResult } from '@kestrel/shared';
import { CHECKLIST_THRESHOLDS } from '../constants/checklist-thresholds.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class HolderDistributionValidator {
  static validateConcentration(snapshot: TokenSnapshot): RuleResult {
    const { top10Pct } = snapshot.holders;
    if (top10Pct > CHECKLIST_THRESHOLDS.maxTop10HolderPct) {
      return RuleResultFactory.hard('holder-concentration', false, `top 10 holders own ${top10Pct}%`);
    }
    return RuleResultFactory.hard('holder-concentration', true, `top 10 holders own ${top10Pct}%`);
  }

  static validateBundledSupply(snapshot: TokenSnapshot): RuleResult {
    const { bundledSupplyPct, sniperSupplyPct } = snapshot.clusters;
    if (bundledSupplyPct > CHECKLIST_THRESHOLDS.maxBundledSupplyPct) {
      return RuleResultFactory.hard('bundled-supply', false, `${bundledSupplyPct}% of supply is bundled`);
    }
    if (sniperSupplyPct > CHECKLIST_THRESHOLDS.maxSniperSupplyPct) {
      return RuleResultFactory.hard('bundled-supply', false, `snipers hold ${sniperSupplyPct}% of supply`);
    }
    return RuleResultFactory.hard('bundled-supply', true, 'bundled and sniper supply within limits');
  }
}
