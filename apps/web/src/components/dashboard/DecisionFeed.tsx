import type { DecisionView } from '@kestrel/shared';
import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { TokenLink } from '@/components/ui/TokenLink';
import { cn } from '@/lib/cn';
import { FormatUtils } from '@/utils/FormatUtils';

const TONES = { BUY: 'success', SKIP: 'warning', REJECTED: 'neutral' } as const;
const LABELS = { BUY: 'Bought', SKIP: 'Skipped', REJECTED: 'Rejected' } as const;

function DecisionRow({ decision }: { decision: DecisionView }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-t first:border-t-0">
      <div className="flex w-full items-start gap-3 py-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <Badge tone={TONES[decision.action]}>{LABELS[decision.action]}</Badge>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2">
              <TokenLink symbol={decision.symbol} pairAddress={decision.pairAddress} mint={decision.mint} />
              <span className="text-xs font-normal text-muted-foreground">
                {FormatUtils.timeAgo(decision.createdAt)}
                {decision.marketCapUsd !== null ? ` · ${FormatUtils.usdCompact(decision.marketCapUsd)} mkt cap` : ''}
              </span>
            </p>
            <p className="truncate text-sm text-muted-foreground">{decision.reasoning}</p>
          </div>
          {decision.sizeSol !== null && <span className="text-sm font-semibold">{FormatUtils.sol(decision.sizeSol, 3)}</span>}
          <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
        </button>
      </div>

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
  if (!decisions.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches. The bot checks tokens continuously and lists every decision here.</p>;
  }
  return (
    <ul>
      {decisions.map((decision) => (
        <DecisionRow key={decision.id} decision={decision} />
      ))}
    </ul>
  );
}
