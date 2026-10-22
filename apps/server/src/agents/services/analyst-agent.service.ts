import { Injectable } from '@nestjs/common';
import type { ChecklistReport } from '@kestrel/shared';
import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import { ANALYST_AGENT_PROMPT, WRAP_TOKEN_DATA } from '../constants/agent-prompts.constant';
import { AnalystReportSchema, type AnalystReport } from '../schemas/agent-outputs.schema';
import { LlmService } from './llm.service';

@Injectable()
export class AnalystAgentService {
  constructor(private readonly llm: LlmService) {}

  async report(snapshot: TokenMarketSnapshot, checklist: ChecklistReport, userId: string): Promise<AnalystReport | null> {
    const data = {
      symbol: snapshot.symbol,
      ageMinutes: Math.round(snapshot.ageSeconds / 60),
      marketCapUsd: Math.round(snapshot.marketCapUsd),
      liquidityUsd: Math.round(snapshot.liquidity.usd),
      holders: snapshot.holders,
      clusters: snapshot.clusters,
      creator: { hasSold: snapshot.creator.hasSold, priorRugCount: snapshot.creator.priorRugCount },
      activity: snapshot.activity,
      priceChange5mPct: snapshot.priceChange5mPct,
      momentum: snapshot.momentum,
      forensics: snapshot.forensics && {
        freshWalletPct: Math.round(snapshot.forensics.freshWalletPct),
        sameFunderPct: Math.round(snapshot.forensics.sameFunderPct),
        earlyBuyersStillHoldingPct: Math.round(snapshot.forensics.earlyBuyerHoldPct),
        earlyBuyersAlreadySoldPct: Math.round(snapshot.forensics.earlyBuyersSoldPct),
        sellToBuyVolume15m: Number(snapshot.forensics.sellBuyVolumeRatio.toFixed(2)),
      },
      checklist: checklist.results.map((result) => ({ rule: result.rule, status: result.status, reason: result.reason })),
    };
    return this.llm.structured({
      label: `analyst:${snapshot.symbol}`,
      userId,
      model: this.llm.lightModel,
      system: ANALYST_AGENT_PROMPT,
      user: WRAP_TOKEN_DATA(JSON.stringify(data)),
      schema: AnalystReportSchema,
      effort: 'low',
    });
  }
}
