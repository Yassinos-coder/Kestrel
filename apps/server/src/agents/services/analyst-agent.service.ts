import { Injectable } from '@nestjs/common';
import type { ChecklistReport } from '@kestrel/shared';
import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import { ANALYST_AGENT_PROMPT, WRAP_TOKEN_DATA } from '../constants/agent-prompts.constant';
import { AnalystReportSchema, type AnalystReport } from '../schemas/agent-outputs.schema';
import { ClaudeService } from './claude.service';

@Injectable()
export class AnalystAgentService {
  constructor(private readonly claude: ClaudeService) {}

  async report(snapshot: TokenMarketSnapshot, checklist: ChecklistReport): Promise<AnalystReport | null> {
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
      checklist: checklist.results.map((result) => ({ rule: result.rule, status: result.status, reason: result.reason })),
    };
    return this.claude.structured({
      label: `analyst:${snapshot.symbol}`,
      model: this.claude.lightModel,
      system: ANALYST_AGENT_PROMPT,
      user: WRAP_TOKEN_DATA(JSON.stringify(data)),
      schema: AnalystReportSchema,
      effort: 'low',
    });
  }
}
