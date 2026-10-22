import { Injectable } from '@nestjs/common';
import { TRADER_AGENT_PROMPT, WRAP_TOKEN_DATA } from '../constants/agent-prompts.constant';
import type { TraderInput } from '../interfaces/agent-inputs.interface';
import { TraderDecisionSchema, type TraderDecision } from '../schemas/agent-outputs.schema';
import { LlmService } from './llm.service';

@Injectable()
export class TraderAgentService {
  constructor(private readonly llm: LlmService) {}

  decide(input: TraderInput): Promise<TraderDecision | null> {
    const { snapshot, report, analyst, portfolio, rules, matchedPlaybooks, lessons, costs } = input;
    const data = {
      token: {
        symbol: snapshot.symbol,
        ageMinutes: Math.round(snapshot.ageSeconds / 60),
        kind: snapshot.ageSeconds > 12 * 3600 ? "established (more than 12 hours old)" : "new launch",
        marketCapUsd: Math.round(snapshot.marketCapUsd),
        liquidityUsd: Math.round(snapshot.liquidity.usd),
        priceChange5mPct: snapshot.priceChange5mPct,
        momentum: snapshot.momentum,
        forensics: snapshot.forensics && {
          holders: snapshot.forensics.holderCount,
          freshWalletPct: Math.round(snapshot.forensics.freshWalletPct),
          sameFunderPct: Math.round(snapshot.forensics.sameFunderPct),
          earlyBuyersStillHoldingPct: Math.round(snapshot.forensics.earlyBuyerHoldPct),
          earlyBuyersAlreadySoldPct: Math.round(snapshot.forensics.earlyBuyersSoldPct),
          launchVisible: snapshot.forensics.launchVisible,
          uniqueBuyers: snapshot.forensics.uniqueBuyers,
          uniqueSellers: snapshot.forensics.uniqueSellers,
          sellToBuyVolume15m: Number(snapshot.forensics.sellBuyVolumeRatio.toFixed(2)),
        },
        holders: snapshot.holders,
        clusters: snapshot.clusters,
        activity: snapshot.activity,
        creator: { hasSold: snapshot.creator.hasSold, priorTokenCount: snapshot.creator.priorTokenCount },
      },
      checklist: { verdict: report.verdict, softScore: report.softScore, results: report.results.map((r) => `${r.rule}: ${r.status} (${r.reason})`) },
      analyst,
      portfolio,
      rules: {
        version: rules.version,
        minConfidence: rules.params.minConfidence,
        maxHoldMinutes: rules.params.maxHoldMinutes,
        stopLossPct: rules.params.stopLossPct,
        takeProfit1Multiple: rules.params.takeProfit1Multiple,
      },
      matchedPlaybooks: matchedPlaybooks.map((playbook) => ({ name: playbook.name, effect: playbook.effect, why: playbook.rationale })),
      similarPastTrades: lessons,
      tradingCosts: {
        swapFeePerLegPct: 1,
        priorityAndNetworkFeePerLegSol: 0.0005,
        modeledSlippagePerLegPct: 1,
        maxEntrySlippagePct: 5,
        maxExitSlippagePct: 15,
        bySizeFraction: costs.map((item) => ({
          sizeFraction: item.sizeFraction,
          sizeSol: Number(item.cost.sizeSol.toFixed(4)),
          roundTripCostPct: Number(item.cost.roundTripCostPct.toFixed(1)),
          priceMustRisePctToBreakEven: Number(item.cost.breakEvenMovePct.toFixed(1)),
          entryPriceImpactPct: Number(item.cost.entryImpactPct.toFixed(2)),
        })),
      },
    };

    return this.llm.structured({
      label: `trader:${snapshot.symbol}`,
      userId: input.userId,
      model: this.llm.traderModel,
      system: TRADER_AGENT_PROMPT,
      user: WRAP_TOKEN_DATA(JSON.stringify(data)),
      schema: TraderDecisionSchema,
      effort: 'medium',
      maxTokens: 12_000,
    });
  }
}
