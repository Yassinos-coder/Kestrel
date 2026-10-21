import type { DecisionView } from '@kestrel/shared';
import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { FormatUtils } from '@/utils/FormatUtils';

type Filter = 'ALL' | 'BUY' | 'SKIP' | 'REJECTED';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'BUY', label: 'Bought' },
  { id: 'SKIP', label: 'Skipped' },
  { id: 'REJECTED', label: 'Rejected' },
];

const TONES = { BUY: 'success', SKIP: 'warning', REJECTED: 'neutral' } as const;
const LABELS = { BUY: 'Bought', SKIP: 'Skipped', REJECTED: 'Rejected' } as const;

function DecisionRow({ decision }: { decision: DecisionView }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-t first:border-t-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 py-3 text-left">
        <Badge tone={TONES[decision.action]}>{LABELS[decision.action]}</Badge>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {decision.symbol}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{FormatUtils.timeAgo(decision.createdAt)}</span>
          </p>
          <p className="truncate text-sm text-muted-foreground">{decision.reasoning}</p>
        </div>
        {decision.sizeSol !== null && <span className="text-sm font-semibold">{FormatUtils.sol(decision.sizeSol, 3)}</span>}
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mb-3 space-y-3 rounded-lg bg-muted/60 p-3 text-sm">
          {decision.plan && (
            <p>
              Plan: <strong>{decision.plan.style}</strong>, hold up to {decision.plan.maxHoldMinutes} minutes, first target {decision.plan.takeProfitMultiple}x, stop -{decision.plan.stopLossPct}%.
            </p>
          )}
          <ul className="grid gap-1.5 md:grid-cols-2">
            {decision.report.results.map((result) => (
              <li key={result.rule} className="flex items-start gap-2">
                {result.status === 'pass' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <span>
                  <span className="font-medium">{result.rule.replace(/-/g, ' ')}</span>
                  <span className="block text-xs text-muted-foreground">{result.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function DecisionFeed({ decisions }: { decisions: DecisionView[] }) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const visible = decisions.filter((decision) => filter === 'ALL' || decision.action === filter);

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn('rounded-full px-3 py-1 text-xs font-semibold transition', filter === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length ? (
        <ul>
          {visible.map((decision) => (
            <DecisionRow key={decision.id} decision={decision} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet. The bot checks new tokens continuously and lists every decision.</p>
      )}
    </div>
  );
}
