import type { RuleParams } from '@kestrel/shared';
import { STATIC_LIMITS } from '../../rules/constants/static-limits.constant';

const PERCENT = 100;
const LIVE_RESERVE_SOL = 0.02;

export interface SizingInput {
  params: RuleParams;
  equitySol: number;
  cashSol: number;
  sizeFraction: number;
  playbookMultiplier: number;
  live: boolean;
}

export interface SizingResult {
  sizeSol: number;
  tooSmall: boolean;
  neededSol: number;
}

export class PositionSizer {
  static size(input: SizingInput): SizingResult {
    const ceilingPct = Math.min(input.params.maxPositionPct, STATIC_LIMITS.absoluteMaxPositionPct);
    const fraction = Math.min(1, Math.max(0.25, input.sizeFraction));
    const wanted = input.equitySol * (ceilingPct / PERCENT) * fraction * input.playbookMultiplier;
    const spendable = Math.max(0, input.cashSol - (input.live ? LIVE_RESERVE_SOL : 0));
    const sizeSol = Math.min(wanted, spendable);

    return {
      sizeSol,
      tooSmall: sizeSol < STATIC_LIMITS.minTradeSol,
      neededSol: Math.max(wanted, STATIC_LIMITS.minTradeSol),
    };
  }
}
