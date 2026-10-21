import type { RuleParams, RuleResult } from '@kestrel/shared';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class TradingLimitsValidator {
  static validate(snapshot: TokenSnapshot, params: RuleParams): RuleResult {
    if (snapshot.ageSeconds < params.minTokenAgeSeconds) {
      return RuleResultFactory.hard('timing-and-limits', false, 'token is too new to enter safely');
    }
    if (snapshot.marketCapUsd < params.minMarketCapUsd) {
      return RuleResultFactory.hard('timing-and-limits', false, 'market cap is below the entry band');
    }
    if (snapshot.marketCapUsd > params.maxMarketCapUsd) {
      return RuleResultFactory.hard('timing-and-limits', false, 'market cap is above the entry band');
    }
    if (snapshot.priceChange5mPct > params.maxPriceChange5mPct) {
      return RuleResultFactory.hard('timing-and-limits', false, 'price spiked too fast, not chasing');
    }
    if (snapshot.portfolio.openPositions >= params.maxOpenPositions) {
      return RuleResultFactory.hard('timing-and-limits', false, 'max open positions reached');
    }
    if (snapshot.portfolio.dailyLossPct >= params.dailyLossLimitPct) {
      return RuleResultFactory.hard('timing-and-limits', false, 'daily loss limit reached');
    }
    return RuleResultFactory.hard('timing-and-limits', true, 'timing and portfolio limits satisfied');
  }
}
