import type { RuleResult } from '@kestrel/shared';
import type { TokenSnapshot } from '../interfaces/token-snapshot.interface';
import { RuleResultFactory } from './rule-result.factory';

export class TokenContractValidator {
  static validateAuthorities(snapshot: TokenSnapshot): RuleResult {
    const { mintRevoked, freezeRevoked } = snapshot.authorities;
    if (!mintRevoked) return RuleResultFactory.hard('token-authorities', false, 'mint authority is still active');
    if (!freezeRevoked) return RuleResultFactory.hard('token-authorities', false, 'freeze authority is still active');
    return RuleResultFactory.hard('token-authorities', true, 'mint and freeze authority revoked');
  }

  static validateExtensions(snapshot: TokenSnapshot): RuleResult {
    const { transferFee, transferHook, permanentDelegate } = snapshot.extensions;
    if (transferFee) return RuleResultFactory.hard('token-extensions', false, 'token charges a transfer fee');
    if (transferHook) return RuleResultFactory.hard('token-extensions', false, 'token has a transfer hook');
    if (permanentDelegate) return RuleResultFactory.hard('token-extensions', false, 'token has a permanent delegate');
    return RuleResultFactory.hard('token-extensions', true, 'no risky token extensions');
  }

  static validateSellability(snapshot: TokenSnapshot): RuleResult {
    const { routeExists, simulatedSellOk } = snapshot.sellability;
    if (!routeExists) return RuleResultFactory.hard('sellability', false, 'no sell route available');
    if (!simulatedSellOk) return RuleResultFactory.hard('sellability', false, 'simulated sell failed');
    return RuleResultFactory.hard('sellability', true, 'sell route confirmed by simulation');
  }
}
