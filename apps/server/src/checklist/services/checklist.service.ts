import { Injectable } from '@nestjs/common';
import type { ChecklistReport, RuleResult } from '@kestrel/shared';
import { CHECKLIST_THRESHOLDS } from '../constants/checklist-thresholds.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { CreatorWalletValidator } from '../validators/creator-wallet.validator';
import { HolderDistributionValidator } from '../validators/holder-distribution.validator';
import { LiquidityValidator } from '../validators/liquidity.validator';
import { MarketActivityValidator } from '../validators/market-activity.validator';
import { SocialNarrativeValidator } from '../validators/social-narrative.validator';
import { TokenContractValidator } from '../validators/token-contract.validator';
import { TradingLimitsValidator } from '../validators/trading-limits.validator';

@Injectable()
export class ChecklistService {
  evaluate(snapshot: TokenSnapshot): ChecklistReport {
    const results = this.runRules(snapshot);
    const hardFailures = results.filter((result) => result.hard && result.status === 'fail').map((result) => result.rule);
    const softScore = this.computeSoftScore(results);

    if (hardFailures.length) return { mint: snapshot.mint, verdict: 'reject', softScore, hardFailures, results };
    if (softScore < CHECKLIST_THRESHOLDS.minSoftScore) {
      return { mint: snapshot.mint, verdict: 'reject', softScore, hardFailures, results };
    }
    return { mint: snapshot.mint, verdict: 'candidate', softScore, hardFailures, results };
  }

  private runRules(snapshot: TokenSnapshot): RuleResult[] {
    return [
      TokenContractValidator.validateAuthorities(snapshot),
      TokenContractValidator.validateExtensions(snapshot),
      LiquidityValidator.validate(snapshot),
      HolderDistributionValidator.validateConcentration(snapshot),
      HolderDistributionValidator.validateBundledSupply(snapshot),
      CreatorWalletValidator.validate(snapshot),
      TokenContractValidator.validateSellability(snapshot),
      MarketActivityValidator.validate(snapshot),
      SocialNarrativeValidator.validate(snapshot),
      TradingLimitsValidator.validate(snapshot),
    ];
  }

  private computeSoftScore(results: RuleResult[]): number {
    const scored = results.filter((result) => !result.hard);
    if (!scored.length) return 100;
    return scored.reduce((sum, result) => sum + result.score, 0) / scored.length;
  }
}
