import { Injectable } from '@nestjs/common';
import { TRADER_AGENT_PROMPT, WRAP_TOKEN_DATA } from '../constants/agent-prompts.constant';
import type { TraderInput } from '../interfaces/agent-inputs.interface';
import { TraderDecisionSchema, type TraderDecision } from '../schemas/agent-outputs.schema';
import { ClaudeService } from './claude.service';

@Injectable()
export class TraderAgentService {
  constructor(private readonly claude: ClaudeService) {}

  decide(input: TraderInput): Promise<TraderDecision | null> {
    const { snapshot, report, analyst, portfolio, rules, matchedPlaybooks, lessons } = input;
    const data = {
      token: {
        symbol: snapshot.symbol,
        ageMinutes: Math.round(snapshot.ageSeconds / 60),
        marketCapUsd: Math.round(snapshot.marketCapUsd),
        liquidityUsd: Math.round(snapshot.liquidity.usd),
        priceChange5mPct: snapshot.priceChange5mPct,
        momentum: snapshot.momentum,
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
    };

    return this.claude.structured({
      label: `trader:${snapshot.symbol}`,
      model: this.claude.traderModel,
      system: TRADER_AGENT_PROMPT,
      user: WRAP_TOKEN_DATA(JSON.stringify(data)),
      schema: TraderDecisionSchema,
      effort: 'medium',
      maxTokens: 12_000,
    });
  }
}
