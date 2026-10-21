import type { ExitAction, ExitSignals, OpenPositionState } from '../interfaces/trading.interface';

const MINUTE_MS = 60_000;
const PERCENT = 100;
const TOP_HOLDER_SELL_EXIT_COUNT = 3;
const LIQUIDITY_DROP_EXIT_PCT = 35;

export class ExitRulesEvaluator {
  static evaluate(
    state: OpenPositionState,
    signals: ExitSignals,
    priceSol: number,
    nowMs: number,
  ): ExitAction | null {
    return (
      ExitRulesEvaluator.rugSignals(state, signals) ??
      ExitRulesEvaluator.stops(state, priceSol, nowMs) ??
      ExitRulesEvaluator.takeProfit(state, priceSol)
    );
  }

  private static rugSignals(state: OpenPositionState, signals: ExitSignals): ExitAction | null {
    const plan = state.context.exitPlan;
    if (signals.creatorSold) return ExitRulesEvaluator.fullExit('creator wallet sold');
    if (signals.sellStreak >= plan.sellStreakExit) {
      return ExitRulesEvaluator.fullExit(`${signals.sellStreak} consecutive sells with no buyers`);
    }
    if (signals.topHoldersSelling >= TOP_HOLDER_SELL_EXIT_COUNT) {
      return ExitRulesEvaluator.fullExit(`${signals.topHoldersSelling} top holders are selling`);
    }
    const entryLiquidity = state.context.entryLiquidityUsd;
    if (entryLiquidity > 0 && signals.liquidityUsd > 0) {
      const dropPct = ((entryLiquidity - signals.liquidityUsd) / entryLiquidity) * PERCENT;
      if (dropPct >= LIQUIDITY_DROP_EXIT_PCT) return ExitRulesEvaluator.fullExit(`liquidity fell ${dropPct.toFixed(0)}%`);
    }
    return null;
  }

  private static stops(state: OpenPositionState, priceSol: number, nowMs: number): ExitAction | null {
    const plan = state.context.exitPlan;
    const stopPrice = state.entryPriceSol * (1 - plan.stopLossPct / PERCENT);
    if (priceSol <= stopPrice) return ExitRulesEvaluator.fullExit(`stop loss -${plan.stopLossPct}%`);

    if (nowMs - state.openedAtMs >= plan.maxHoldMinutes * MINUTE_MS) {
      return ExitRulesEvaluator.fullExit(`hold limit of ${plan.maxHoldMinutes} minutes reached`);
    }

    const trailing = state.peakPriceSol * (1 - plan.trailingStopPct / PERCENT);
    if (state.context.tp1Done && priceSol <= trailing) {
      return ExitRulesEvaluator.fullExit(`trailing stop -${plan.trailingStopPct}% from the peak`);
    }
    return null;
  }

  private static takeProfit(state: OpenPositionState, priceSol: number): ExitAction | null {
    const { exitPlan, tp1Done, tp2Done } = state.context;
    const multiple = priceSol / state.entryPriceSol;

    if (!tp1Done && multiple >= exitPlan.tp1Multiple) {
      return ExitRulesEvaluator.partial(state, exitPlan.tp1SellPct, `first target ${exitPlan.tp1Multiple}x reached`, 'tp1');
    }
    if (tp1Done && !tp2Done && multiple >= exitPlan.tp2Multiple) {
      return ExitRulesEvaluator.partial(state, exitPlan.tp2SellPct, `second target ${exitPlan.tp2Multiple}x reached`, 'tp2');
    }
    return null;
  }

  private static partial(state: OpenPositionState, sellPctOfBought: number, reason: string, step: 'tp1' | 'tp2'): ExitAction {
    const tokensToSell = state.tokensBought * (sellPctOfBought / PERCENT);
    const fraction = Math.min(1, tokensToSell / state.tokensHeld);
    return {
      sellFraction: fraction,
      full: fraction >= 1,
      reason,
      markTp1: step === 'tp1' ? true : undefined,
      markTp2: step === 'tp2' ? true : undefined,
    };
  }

  private static fullExit(reason: string): ExitAction {
    return { sellFraction: 1, full: true, reason };
  }
}
