import type { MissedOpportunitiesView, MissedOpportunityItem, MissedVerdict } from '@kestrel/shared';
import type { Decision, DecisionOutcome } from '../../generated/prisma/client';
import {
  DIGEST_GOOD_PASSES,
  DIGEST_WINNERS,
  GOOD_PASS_PCT,
  MAX_REPORT_ITEMS,
  MISSED_WINNER_PCT,
  REASONING_LIMIT,
  REPORT_WINDOW_HOURS,
} from '../constants/outcome.constant';

const PERCENT = 100;
const TOP_WEAK_RULES = 6;

interface ReportResult {
  rule: string;
  status: string;
  reason: string;
}

export class MissedOpportunityMapper {
  static toItem(decision: Decision, outcome: DecisionOutcome): MissedOpportunityItem {
    const known = [outcome.change1hPct, outcome.change4hPct, outcome.change24hPct].filter((value): value is number => value !== null);
    const best = outcome.peakChangePct ?? (known.length ? Math.max(...known) : null);
    const latest = outcome.change24hPct ?? outcome.change4hPct ?? outcome.change1hPct;

    return {
      decisionId: decision.id,
      mint: decision.mint,
      symbol: decision.symbol,
      passedAt: decision.createdAt.toISOString(),
      marketCapUsd: outcome.baseMarketCapUsd,
      confidence: decision.confidence,
      reasoning: (decision.reasoning ?? '').slice(0, REASONING_LIMIT),
      weakRules: MissedOpportunityMapper.weakRules(decision),
      change1hPct: outcome.change1hPct,
      change4hPct: outcome.change4hPct,
      change24hPct: outcome.change24hPct,
      bestChangePct: best,
      verdict: MissedOpportunityMapper.verdict(best, latest),
    };
  }

  static toDigest(items: MissedOpportunityItem[]): MissedOpportunitiesView {
    const view = MissedOpportunityMapper.summarise(items);
    const winners = MissedOpportunityMapper.rank(items.filter((item) => item.verdict === 'missed-winner')).slice(0, DIGEST_WINNERS);
    const goodPasses = items.filter((item) => item.verdict === 'good-pass').slice(0, DIGEST_GOOD_PASSES);
    return { ...view, items: [...winners, ...goodPasses] };
  }

  static toReport(items: MissedOpportunityItem[]): MissedOpportunitiesView {
    const view = MissedOpportunityMapper.summarise(items);
    return { ...view, items: items.slice(0, MAX_REPORT_ITEMS) };
  }

  private static summarise(items: MissedOpportunityItem[]): MissedOpportunitiesView {
    const judged = items.filter((item) => item.verdict !== 'pending');
    const winners = items.filter((item) => item.verdict === 'missed-winner');
    return {
      windowHours: REPORT_WINDOW_HOURS,
      tracked: judged.length,
      missedWinners: winners.length,
      goodPasses: items.filter((item) => item.verdict === 'good-pass').length,
      missedWinnerRatePct: judged.length ? Math.round((winners.length / judged.length) * PERCENT) : 0,
      commonWeakRules: MissedOpportunityMapper.commonWeakRules(winners),
      items: [],
    };
  }

  private static rank(items: MissedOpportunityItem[]): MissedOpportunityItem[] {
    return [...items].sort((a, b) => (b.bestChangePct ?? 0) - (a.bestChangePct ?? 0));
  }

  private static verdict(best: number | null, latest: number | null): MissedVerdict {
    if (best === null) return 'pending';
    if (best >= MISSED_WINNER_PCT) return 'missed-winner';
    if (latest !== null && latest <= GOOD_PASS_PCT) return 'good-pass';
    return 'flat';
  }

  private static weakRules(decision: Decision): string[] {
    const results = ((decision.report as { results?: ReportResult[] }).results ?? []).filter((result) => result.status !== 'pass');
    return results.map((result) => `${result.rule}: ${result.reason}`);
  }

  private static commonWeakRules(winners: MissedOpportunityItem[]): Array<{ rule: string; count: number }> {
    const counts = new Map<string, number>();
    for (const winner of winners) {
      for (const weak of winner.weakRules) {
        const rule = weak.split(':')[0] ?? weak;
        counts.set(rule, (counts.get(rule) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_WEAK_RULES);
  }
}
