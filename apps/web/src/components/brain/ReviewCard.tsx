import type { ReviewRunView, RuleChange } from '@kestrel/shared';
import { Badge } from '@/components/ui/Badge';
import { FormatUtils } from '@/utils/FormatUtils';

function describe(change: RuleChange): string {
  if (change.kind === 'param') return `${change.target}: ${change.from} → ${change.to}`;
  if (change.kind === 'playbook-added') return `New playbook "${change.target}"`;
  return `Retired playbook "${change.target}"`;
}

const STATUS_TONE = { completed: 'success', skipped: 'neutral', failed: 'danger', running: 'info' } as const;

export function ReviewCard({ review }: { review: ReviewRunView }) {
  const tone = STATUS_TONE[review.status as keyof typeof STATUS_TONE] ?? 'neutral';

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{review.status}</Badge>
          <span className="text-sm font-semibold">{FormatUtils.dateTime(review.startedAt)}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {review.tradesInWindow} trades, {review.tradesReviewed} studied
          {review.ruleVersionAfter ? ` · rules v${review.ruleVersionAfter}` : ''}
        </span>
      </div>

      {review.summary && <p className="mt-2 text-sm">{review.summary}</p>}
      {review.error && <p className="mt-2 text-sm text-muted-foreground">{review.error}</p>}

      {review.appliedChanges.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {review.appliedChanges.map((change) => (
            <li key={`${change.kind}-${change.target}`}>
              <span className="font-medium text-info">{describe(change)}</span>
              <span className="block text-xs text-muted-foreground">{change.rationale}</span>
            </li>
          ))}
        </ul>
      )}
      {review.rejectedChanges.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{review.rejectedChanges.length} proposed change(s) were blocked by the guardrails.</p>
      )}
    </li>
  );
}
