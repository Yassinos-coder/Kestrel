import { Injectable } from '@nestjs/common';
import type { ChecklistReport, RuleParams, RuleResult } from '@kestrel/shared';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { CreatorWalletValidator } from '../validators/creator-wallet.validator';
import { HolderDistributionValidator } from '../validators/holder-distribution.validator';
import { LiquidityValidator } from '../validators/liquidity.validator';
import { MarketActivityValidator } from '../validators/market-activity.validator';
import { MomentumQualityValidator } from '../validators/momentum-quality.validator';
import { TokenContractValidator } from '../validators/token-contract.validator';
import { TradingLimitsValidator } from '../validators/trading-limits.validator';

@Injectable()
export class ChecklistService {
  screen(snapshot: TokenSnapshot, params: RuleParams): ChecklistReport {
    const results = this.runHardRules(snapshot, params);
    return this.buildReport(snapshot.mint, results, params, false);
  }

  evaluate(snapshot: TokenSnapshot, params: RuleParams): ChecklistReport {
    const results = [
      ...this.runHardRules(snapshot, params),
      MarketActivityValidator.validate(snapshot, params),
      MomentumQualityValidator.validate(snapshot),
    ];
    return this.buildReport(snapshot.mint, results, params, true);
  }

  private runHardRules(snapshot: TokenSnapshot, params: RuleParams): RuleResult[] {
    return [
      TokenContractValidator.validateAuthorities(snapshot),
      TokenContractValidator.validateExtensions(snapshot),
      LiquidityValidator.validate(snapshot, params),
      HolderDistributionValidator.validateConcentration(snapshot, params),
      HolderDistributionValidator.validateBundledSupply(snapshot, params),
      CreatorWalletValidator.validate(snapshot),
      TokenContractValidator.validateSellability(snapshot),
      TradingLimitsValidator.validate(snapshot, params),
    ];
  }

  private buildReport(mint: string, results: RuleResult[], params: RuleParams, scoreSoft: boolean): ChecklistReport {
    const hardFailures = results.filter((result) => result.hard && result.status === 'fail').map((result) => result.rule);
    const softScore = this.computeSoftScore(results);

    if (hardFailures.length) return { mint, verdict: 'reject', softScore, hardFailures, results };
    if (scoreSoft && softScore < params.minSoftScore) return { mint, verdict: 'reject', softScore, hardFailures, results };
    return { mint, verdict: 'candidate', softScore, hardFailures, results };
  }

  private computeSoftScore(results: RuleResult[]): number {
    const scored = results.filter((result) => !result.hard);
    if (!scored.length) return 100;
    return scored.reduce((sum, result) => sum + result.score, 0) / scored.length;
  }
}
