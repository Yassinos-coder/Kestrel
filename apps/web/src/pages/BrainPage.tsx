import { ReviewCard } from '@/components/brain/ReviewCard';
import { PlaybookCard } from '@/components/brain/PlaybookCard';
import { RuleParamsGrid } from '@/components/brain/RuleParamsGrid';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { cn } from '@/lib/cn';
import { useBrainQuery, useRunReviewMutation } from '@/hooks/useBrainQueries';
import { FormatUtils } from '@/utils/FormatUtils';

export function BrainPage() {
  const { data, isPending, error } = useBrainQuery();
  const review = useRunReviewMutation();

  if (isPending) return <p className="text-muted-foreground">Loading the brain…</p>;
  if (error || !data) return <ErrorNote error={error ?? new Error('Brain unavailable')} />;

  const { activeRules, versions, reviews, lessons } = data;
  const previous = versions.find((version) => version.version === activeRules.version - 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">The brain</h1>
          <p className="text-sm text-muted-foreground">
            The AI owns these rules. Every night it studies its trades, ignores noise, and tunes itself inside hard guardrails.
          </p>
        </div>
        <Button variant="secondary" disabled={review.isPending} onClick={() => review.mutate()}>
          {review.isPending ? 'Reviewing…' : 'Run the review now'}
        </Button>
      </div>
      <ErrorNote error={review.error} />

      <Card>
        <CardHeader
          title={`Rules in force · v${activeRules.version}`}
          description={activeRules.summary}
          action={<Badge tone={activeRules.source === 'seed' ? 'neutral' : 'success'}>{activeRules.source === 'seed' ? 'defaults' : 'self-tuned'}</Badge>}
        />
        <RuleParamsGrid params={activeRules.params} previous={previous?.params} />
        <p className="mt-4 text-xs text-muted-foreground">
          Highlighted values changed in the latest version. Mint and freeze authority, sellability and token extension checks can never be changed by the AI.
        </p>
      </Card>

      <Card>
        <CardHeader title="Playbooks" description="Patterns the AI learned from its own trades. They shape size, hold time and targets, or block a setup entirely." />
        {activeRules.playbooks.length ? (
          <ul className="space-y-3">
            {activeRules.playbooks.map((playbook) => (
              <PlaybookCard key={playbook.id} playbook={playbook} />
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">None yet. Playbooks appear after a nightly review finds a repeating pattern with evidence.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Nightly reviews" description="What the AI concluded and changed after each day." />
        {reviews.length ? (
          <ul className="space-y-3">
            {reviews.map((item) => (
              <ReviewCard key={item.id} review={item} />
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">No review has run yet. The first one runs tonight, or press the button above.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Lessons learned" description="A post-mortem is written for every closed trade and reused when a similar setup shows up." />
        {lessons.length ? (
          <ul className="divide-y text-sm">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{lesson.symbol}</span>
                  <span className={cn('font-semibold', lesson.outcomePct >= 0 ? 'text-success' : 'text-destructive')}>{FormatUtils.pct(lesson.outcomePct, 0)}</span>
                  {lesson.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <p className="mt-1 text-muted-foreground">{lesson.lesson}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">Lessons appear as soon as the first trade closes.</p>
        )}
      </Card>
    </div>
  );
}
