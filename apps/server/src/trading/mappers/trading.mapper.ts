import type { ChecklistReport, DecisionView, LessonView, PositionPlan, PositionView, TradeView } from '@kestrel/shared';
import type { Decision, Position, Trade, TradeLesson } from '../../generated/prisma/client';

const PERCENT = 100;

export class TradingMapper {
  static toPositionView(position: Position): PositionView {
    const currentValueSol = position.tokensHeld * position.lastPriceSol;
    const pnlSol = position.realizedSol + currentValueSol - position.entrySol;
    return {
      id: position.id,
      mode: position.mode,
      mint: position.mint,
      symbol: position.symbol,
      status: position.status,
      entrySol: position.entrySol,
      entryPriceSol: position.entryPriceSol,
      lastPriceSol: position.lastPriceSol,
      tokensHeld: position.tokensHeld,
      currentValueSol,
      realizedSol: position.realizedSol,
      pnlSol,
      pnlPct: position.entrySol > 0 ? (pnlSol / position.entrySol) * PERCENT : 0,
      plan: position.plan as unknown as PositionPlan,
      exitReason: position.exitReason,
      openedAt: position.openedAt.toISOString(),
      closedAt: position.closedAt?.toISOString() ?? null,
    };
  }

  static toTradeView(trade: Trade): TradeView {
    return {
      id: trade.id,
      side: trade.side,
      reason: trade.reason,
      priceSol: trade.priceSol,
      solAmount: trade.solAmount,
      tokenAmount: trade.tokenAmount,
      feesSol: trade.feesSol,
      signature: trade.signature,
      createdAt: trade.createdAt.toISOString(),
    };
  }

  static toDecisionView(decision: Decision): DecisionView {
    return {
      id: decision.id,
      mint: decision.mint,
      symbol: decision.symbol,
      action: decision.action,
      confidence: decision.confidence,
      sizeSol: decision.sizeSol,
      reasoning: decision.reasoning,
      report: decision.report as unknown as ChecklistReport,
      plan: decision.plan as unknown as PositionPlan | null,
      createdAt: decision.createdAt.toISOString(),
    };
  }

  static toLessonView(lesson: TradeLesson): LessonView {
    return {
      id: lesson.id,
      symbol: lesson.symbol,
      outcomePct: lesson.outcomePct,
      exitReason: lesson.exitReason,
      lesson: lesson.lesson,
      tags: lesson.tags,
      createdAt: lesson.createdAt.toISOString(),
    };
  }
}
