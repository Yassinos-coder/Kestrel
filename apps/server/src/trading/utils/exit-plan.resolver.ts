import type { PositionPlan, RuleParams } from '@kestrel/shared';
import type { MergedPlaybookEffect } from '../../rules/interfaces/rule-proposals.interface';
import type { ExitPlan } from '../interfaces/trading.interface';

const SCALP_MAX_HOLD_MINUTES = 30;
const SCALP_DEFAULT_TARGET = 1.5;
const SCALP_FIRST_SELL_PCT = 80;
const SCALP_SECOND_SELL_PCT = 10;
const SCALP_TRAILING_PCT = 20;
const MIN_TARGET = 1.1;
const MIN_STOP_LOSS = 15;
const MIN_HOLD_MINUTES = 5;
const TP2_OVER_TP1 = 1.6;
const RECOUP_COST_BUFFER = 1.05;

export interface ProposedPlan {
  style: 'scalp' | 'swing' | 'runner';
  maxHoldMinutes: number;
  takeProfitMultiple: number;
  stopLossPct: number;
}

export interface ResolvedPlan {
  plan: PositionPlan;
  exitPlan: ExitPlan;
}

export class ExitPlanResolver {
  static resolve(params: RuleParams, proposed: ProposedPlan | null, effect: MergedPlaybookEffect): ResolvedPlan {
    const scalp = effect.scalp || proposed?.style === 'scalp';
    const style = scalp ? 'scalp' : (proposed?.style ?? 'swing');

    const maxHold = ExitPlanResolver.limit(
      scalp ? SCALP_MAX_HOLD_MINUTES : params.maxHoldMinutes,
      proposed?.maxHoldMinutes,
      effect.maxHoldMinutes,
      params.maxHoldMinutes,
      MIN_HOLD_MINUTES,
    );
    const target = ExitPlanResolver.limit(
      scalp ? SCALP_DEFAULT_TARGET : params.takeProfit1Multiple,
      proposed?.takeProfitMultiple,
      effect.takeProfitMultiple,
      params.takeProfit2Multiple,
      MIN_TARGET,
    );
    const stopLoss = ExitPlanResolver.limit(params.stopLossPct, proposed?.stopLossPct, effect.stopLossPct, params.stopLossPct, MIN_STOP_LOSS);

    return {
      plan: { style, maxHoldMinutes: Math.round(maxHold), takeProfitMultiple: round2(target), stopLossPct: round2(stopLoss) },
      exitPlan: {
        tp1Multiple: round2(target),
        tp1SellPct: Math.max(scalp ? SCALP_FIRST_SELL_PCT : params.takeProfit1SellPct, ExitPlanResolver.recoupPct(target)),
        tp2Multiple: round2(Math.max(params.takeProfit2Multiple, target * TP2_OVER_TP1)),
        tp2SellPct: scalp ? SCALP_SECOND_SELL_PCT : params.takeProfit2SellPct,
        stopLossPct: round2(stopLoss),
        trailingStopPct: scalp ? Math.min(params.trailingStopPct, SCALP_TRAILING_PCT) : params.trailingStopPct,
        maxHoldMinutes: Math.round(maxHold),
        sellStreakExit: params.sellStreakExit,
      },
    };
  }

  static recoupPct(targetMultiple: number): number {
    return Math.min(100, Math.ceil((100 * RECOUP_COST_BUFFER) / targetMultiple));
  }

  private static limit(
    base: number,
    proposed: number | undefined,
    playbook: number | null,
    ceiling: number,
    floor: number,
  ): number {
    const candidates = [proposed ?? base, playbook ?? Number.POSITIVE_INFINITY];
    const chosen = Math.min(...candidates);
    return Math.min(Math.max(chosen, floor), ceiling);
  }
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
