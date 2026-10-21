import type { RuleResult } from '@kestrel/shared';
import type { TokenSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import { CreatorWalletValidator } from '../../checklist/validators/creator-wallet.validator';
import { RuleResultFactory } from '../../checklist/validators/rule-result.factory';
import { TokenContractValidator } from '../../checklist/validators/token-contract.validator';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';

const MAX_COPY_EXIT_IMPACT_PCT = 6;

export interface CopyGateOptions {
  minLiquidityUsd: number;
  requireSecuredLp: boolean;
}

export interface CopyGateResult {
  passed: boolean;
  results: RuleResult[];
}

export class CopyGateValidator {
  static validate(snapshot: TokenSnapshot, options: CopyGateOptions): CopyGateResult {
    const results = [
      TokenContractValidator.validateAuthorities(snapshot),
      TokenContractValidator.validateExtensions(snapshot),
      TokenContractValidator.validateSellability(snapshot),
      CreatorWalletValidator.validate(snapshot),
      CopyGateValidator.liquidity(snapshot, options),
    ];
    return { passed: results.every((result) => result.status !== 'fail'), results };
  }

  private static liquidity(snapshot: TokenSnapshot, options: CopyGateOptions): RuleResult {
    const { usd, lpBurnedOrLockedPct, exitPriceImpactPct } = snapshot.liquidity;
    if (usd < options.minLiquidityUsd) {
      return RuleResultFactory.hard('liquidity', false, `liquidity $${Math.round(usd)} is below your $${options.minLiquidityUsd} minimum`);
    }
    if (options.requireSecuredLp && lpBurnedOrLockedPct < STATIC_LIMITS.minLpBurnedOrLockedPct) {
      return RuleResultFactory.hard('liquidity', false, 'liquidity is not burned or locked and you required it to be');
    }
    if (exitPriceImpactPct > MAX_COPY_EXIT_IMPACT_PCT) {
      return RuleResultFactory.hard('liquidity', false, `exit price impact ${exitPriceImpactPct.toFixed(1)}% is too high`);
    }
    return RuleResultFactory.hard('liquidity', true, 'liquidity is deep enough to exit');
  }
}
