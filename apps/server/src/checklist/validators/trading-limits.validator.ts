import type { RuleResult } from '@kestrel/shared';
import { CHECKLIST_THRESHOLDS } from '../constants/checklist-thresholds.constant';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class TradingLimitsValidator {
  static validate(snapshot: TokenSnapshot): RuleResult {
    if (snapshot.ageSeconds < CHECKLIST_THRESHOLDS.minTokenAgeSeconds) {
      return RuleResultFactory.hard('timing-and-limits', false, 'token is too new to enter safely');
    }
    if (snapshot.marketCapUsd < CHECKLIST_THRESHOLDS.minMarketCapUsd) {
      return RuleResultFactory.hard('timing-and-limits', false, 'market cap is below the entry band');
    }
    if (snapshot.marketCapUsd > CHECKLIST_THRESHOLDS.maxMarketCapUsd) {
      return RuleResultFactory.hard('timing-and-limits', false, 'market cap is above the entry band');
    }
    if (snapshot.priceChange5mPct > CHECKLIST_THRESHOLDS.maxPriceChange5mPct) {
      return RuleResultFactory.hard('timing-and-limits', false, 'price spiked too fast, not chasing');
    }
    if (snapshot.portfolio.openPositions >= CHECKLIST_THRESHOLDS.maxOpenPositions) {
      return RuleResultFactory.hard('timing-and-limits', false, 'max open positions reached');
    }
    if (snapshot.portfolio.dailyLossPct >= CHECKLIST_THRESHOLDS.maxDailyLossPct) {
      return RuleResultFactory.hard('timing-and-limits', false, 'daily loss limit reached');
    }
    return RuleResultFactory.hard('timing-and-limits', true, 'timing and portfolio limits satisfied');
  }
}
