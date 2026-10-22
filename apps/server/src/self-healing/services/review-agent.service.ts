import { Injectable } from '@nestjs/common';
import type { MissedOpportunitiesView, Playbook, RuleParams } from '@kestrel/shared';
import { ClaudeService } from '../../agents/services/claude.service';
import { REVIEW_AGENT_PROMPT, WRAP_TOKEN_DATA } from '../../agents/constants/agent-prompts.constant';
import { RULE_PARAM_BOUNDS } from '../../rules/constants/rule-param-bounds.constant';
import type { DayStats, FeatureComparison, RejectionStats, ScoredTrade } from '../interfaces/review.interface';
import { ReviewOutputSchema, type ReviewOutput } from '../schemas/review-output.schema';

export interface ReviewDigest {
  windowLabel: string;
  stats: DayStats;
  featureComparison: FeatureComparison[];
  rejections: RejectionStats;
  missedOpportunities: MissedOpportunitiesView;
  costs: { tradingFeesSol: number; aiCostUsd: number; aiCalls: number };
  rules: { version: number; params: RuleParams; playbooks: Playbook[] };
  trades: Array<{
    id: string;
    symbol: string;
    whyItMatters: string[];
    result: { pnlPct: number; peakMultiple: number; heldMinutes: number; exitReason: string; style: string };
    setup: Record<string, number>;
    matchedPlaybooks: string[];
    exitEvidence: unknown;
    similarPastLessons: Array<{ symbol: string; outcomePct: number; lesson: string }>;
  }>;
}

@Injectable()
export class ReviewAgentService {
  constructor(private readonly claude: ClaudeService) {}

  isAvailable(): boolean {
    return this.claude.isAvailable();
  }

  review(digest: ReviewDigest, userId: string): Promise<ReviewOutput | null> {
    const payload = {
      ...digest,
      allowedParameterRanges: RULE_PARAM_BOUNDS,
      guardrails: 'Each parameter can move at most 25% per review and must stay inside its range. At most 5 parameter changes.',
    };
    return this.claude.structured({
      label: 'nightly-review',
      userId,
      model: this.claude.traderModel,
      system: REVIEW_AGENT_PROMPT,
      user: WRAP_TOKEN_DATA(JSON.stringify(payload)),
      schema: ReviewOutputSchema,
      effort: 'high',
      maxTokens: 16_000,
    });
  }
}
