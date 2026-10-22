import { describe, expect, it } from 'vitest';
import type { Decision, DecisionOutcome } from '../../generated/prisma/client';
import { MissedOpportunityMapper } from './missed-opportunity.mapper';

const decision = (id: string): Decision =>
  ({
    id,
    mint: `mint${id}`,
    symbol: id.toUpperCase(),
    confidence: 40,
    reasoning: 'Skipped',
    createdAt: new Date('2026-10-22T10:00:00Z'),
    report: { results: [{ rule: 'organic-activity', status: 'fail', reason: 'few unique traders' }] },
  }) as unknown as Decision;

const outcome = (changes: Partial<DecisionOutcome>): DecisionOutcome =>
  ({ baseMarketCapUsd: 100_000, change1hPct: null, change4hPct: null, change24hPct: null, peakChangePct: null, ...changes }) as DecisionOutcome;

describe('MissedOpportunityMapper', () => {
  it('classifies passes by what the token did next', () => {
    const winner = MissedOpportunityMapper.toItem(decision('a'), outcome({ change1hPct: 120, peakChangePct: 120 }));
    const rug = MissedOpportunityMapper.toItem(decision('b'), outcome({ change1hPct: -70, peakChangePct: -70 }));
    const flat = MissedOpportunityMapper.toItem(decision('c'), outcome({ change1hPct: 5, peakChangePct: 5 }));
    const waiting = MissedOpportunityMapper.toItem(decision('d'), outcome({}));
    expect([winner.verdict, rug.verdict, flat.verdict, waiting.verdict]).toEqual(['missed-winner', 'good-pass', 'flat', 'pending']);
  });

  it('summarises the missed winner rate and the weak rules they shared', () => {
    const items = [
      MissedOpportunityMapper.toItem(decision('a'), outcome({ change1hPct: 120, peakChangePct: 120 })),
      MissedOpportunityMapper.toItem(decision('b'), outcome({ change1hPct: -70, peakChangePct: -70 })),
      MissedOpportunityMapper.toItem(decision('c'), outcome({})),
    ];
    const report = MissedOpportunityMapper.toReport(items);
    expect(report).toMatchObject({ tracked: 2, missedWinners: 1, goodPasses: 1, missedWinnerRatePct: 50 });
    expect(report.commonWeakRules).toEqual([{ rule: 'organic-activity', count: 1 }]);
  });
});
