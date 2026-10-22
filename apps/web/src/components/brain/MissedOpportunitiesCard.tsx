import type { MissedOpportunitiesView, MissedOpportunityItem, MissedVerdict } from '@kestrel/shared';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { TokenLink } from '@/components/ui/TokenLink';
import { cn } from '@/lib/cn';
import { FormatUtils } from '@/utils/FormatUtils';

interface MissedOpportunitiesCardProps {
  report: MissedOpportunitiesView | undefined;
  error: unknown;
}

const VERDICT_LABEL: Record<MissedVerdict, string> = {
  'missed-winner': 'Missed winner',
  'good-pass': 'Good pass',
  flat: 'Flat',
  pending: 'Waiting',
};

const VERDICT_TONE: Record<MissedVerdict, 'success' | 'danger' | 'neutral' | 'warning'> = {
  'missed-winner': 'warning',
  'good-pass': 'success',
  flat: 'neutral',
  pending: 'neutral',
};

function Change({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="text-xs text-muted-foreground">
      {label}{' '}
      <span className={cn('font-semibold', value === null ? '' : value >= 0 ? 'text-success' : 'text-destructive')}>
        {value === null ? '—' : FormatUtils.pct(value, 0)}
      </span>
    </span>
  );
}

function ItemRow({ item }: { item: MissedOpportunityItem }) {
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <TokenLink symbol={item.symbol} pairAddress={null} mint={item.mint} />
        <Badge tone={VERDICT_TONE[item.verdict]}>{VERDICT_LABEL[item.verdict]}</Badge>
        <span className="text-xs text-muted-foreground">passed at {FormatUtils.usdCompact(item.marketCapUsd)} · {FormatUtils.timeAgo(item.passedAt)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-3">
        <Change label="1h" value={item.change1hPct} />
        <Change label="4h" value={item.change4hPct} />
        <Change label="24h" value={item.change24hPct} />
      </div>
      <p className="mt-1 text-muted-foreground">{item.reasoning}</p>
    </li>
  );
}

export function MissedOpportunitiesCard({ report, error }: MissedOpportunitiesCardProps) {
  const description = `Tokens the AI passed on and what they did next, over the last ${report?.windowHours ?? 48} hours. The nightly review uses this to check whether the bot is too strict.`;
  return (
    <Card>
      <CardHeader title="Missed opportunities" description={description} />
      <ErrorNote error={error} />
      {report && report.tracked > 0 ? (
        <>
          <p className="mb-2 text-sm">
            <span className="font-semibold">{report.missedWinners}</span> of {report.tracked} passes rose 50% or more ({report.missedWinnerRatePct}%),{' '}
            <span className="font-semibold">{report.goodPasses}</span> fell 50% or more.
          </p>
          {report.commonWeakRules.length ? (
            <p className="mb-2 text-xs text-muted-foreground">
              Weakest checks on the winners: {report.commonWeakRules.map((rule) => `${rule.rule} (${rule.count})`).join(', ')}
            </p>
          ) : null}
          <ul className="divide-y">
            {report.items.map((item) => (
              <ItemRow key={item.decisionId} item={item} />
            ))}
          </ul>
        </>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">Nothing tracked yet. Passed tokens are checked again after 1, 4 and 24 hours.</p>
      )}
    </Card>
  );
}
