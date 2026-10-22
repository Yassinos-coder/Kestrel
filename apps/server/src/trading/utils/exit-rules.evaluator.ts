import {
  EXTENSION_MAX_FACTOR,
  EXTENSION_MAX_MINUTES,
  EXTENSION_TRAILING_PCT,
  FLOW_GRACE_MS,
  MIN_FLOW_TRADES,
  SELLER_DOMINANCE_RATIO,
} from '../constants/flow-exit.constant';
import type { ExitAction, ExitSignals, FlowSignal, OpenPositionState } from '../interfaces/trading.interface';

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
      ExitRulesEvaluator.sellerFlow(state, signals, nowMs) ??
      ExitRulesEvaluator.stops(state, signals, priceSol, nowMs) ??
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

  private static sellerFlow(state: OpenPositionState, signals: ExitSignals, nowMs: number): ExitAction | null {
    const flow = signals.flow;
    if (!flow || nowMs - state.openedAtMs < FLOW_GRACE_MS) return null;
    if (!ExitRulesEvaluator.sellersDominate(flow)) return null;
    return ExitRulesEvaluator.fullExit(`sellers outnumber buyers ${flow.sellers} to ${flow.buyers} in the last 5 minutes`);
  }

  private static sellersDominate(flow: FlowSignal): boolean {
    if (flow.trades < MIN_FLOW_TRADES) return false;
    return flow.sellers >= flow.buyers * SELLER_DOMINANCE_RATIO && flow.sellVolumeSol >= flow.buyVolumeSol;
  }

  private static buyersHold(flow: FlowSignal | null): boolean {
    return flow !== null && flow.trades >= MIN_FLOW_TRADES && flow.buyers >= flow.sellers;
  }

  private static stops(state: OpenPositionState, signals: ExitSignals, priceSol: number, nowMs: number): ExitAction | null {
    const plan = state.context.exitPlan;
    const stopPrice = state.entryPriceSol * (1 - plan.stopLossPct / PERCENT);
    if (priceSol <= stopPrice) return ExitRulesEvaluator.fullExit(`stop loss -${plan.stopLossPct}%`);

    const heldMs = nowMs - state.openedAtMs;
    if (heldMs >= plan.maxHoldMinutes * MINUTE_MS) {
      const holdExit = ExitRulesEvaluator.holdLimit(state, signals, priceSol, heldMs);
      if (holdExit) return holdExit;
    }

    const trailing = state.peakPriceSol * (1 - plan.trailingStopPct / PERCENT);
    if (state.context.tp1Done && priceSol <= trailing) {
      return ExitRulesEvaluator.fullExit(`trailing stop -${plan.trailingStopPct}% from the peak`);
    }
    return null;
  }

  private static holdLimit(state: OpenPositionState, signals: ExitSignals, priceSol: number, heldMs: number): ExitAction | null {
    const plan = state.context.exitPlan;
    const hardLimitMinutes = Math.min(plan.maxHoldMinutes * EXTENSION_MAX_FACTOR, EXTENSION_MAX_MINUTES);
    const reached = ExitRulesEvaluator.fullExit(`hold limit of ${plan.maxHoldMinutes} minutes reached`);
    if (heldMs >= hardLimitMinutes * MINUTE_MS) return reached;
    if (state.context.tp1Done) return null;

    const profitable = priceSol > state.entryPriceSol;
    if (!profitable || !ExitRulesEvaluator.buyersHold(signals.flow)) return reached;

    const trailing = state.peakPriceSol * (1 - EXTENSION_TRAILING_PCT / PERCENT);
    if (priceSol <= trailing) return ExitRulesEvaluator.fullExit(`price fell ${EXTENSION_TRAILING_PCT}% from the peak after the planned hold`);
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
