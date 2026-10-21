import type { ReviewRunView, RuleChange } from '@kestrel/shared';
import type { ReviewRun } from '../../generated/prisma/client';

export class ReviewRunMapper {
  static toView(run: ReviewRun): ReviewRunView {
    return {
      id: run.id,
      status: run.status,
      windowStart: run.windowStart.toISOString(),
      windowEnd: run.windowEnd.toISOString(),
      tradesInWindow: run.tradesInWindow,
      tradesReviewed: run.tradesReviewed,
      summary: (run.report as { summary?: string } | null)?.summary ?? null,
      appliedChanges: (run.appliedChanges as unknown as RuleChange[] | null) ?? [],
      rejectedChanges: (run.rejectedChanges as unknown as RuleChange[] | null) ?? [],
      ruleVersionAfter: run.ruleVersionAfter,
      error: run.error,
      startedAt: run.startedAt.toISOString(),
    };
  }
}
