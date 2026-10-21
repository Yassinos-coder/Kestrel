import { useState } from 'react';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { cn } from '@/lib/cn';
import { useClosePositionMutation, usePositionDetailQuery, usePositionsQuery } from '@/hooks/usePortfolioQueries';
import { FormatUtils } from '@/utils/FormatUtils';

type Tab = 'ALL' | 'OPEN' | 'CLOSED';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'CLOSED', label: 'Closed' },
];

export function PositionsPage() {
  const [tab, setTab] = useState<Tab>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const positions = usePositionsQuery(tab === 'ALL' ? undefined : tab);
  const detail = usePositionDetailQuery(selectedId);
  const closePosition = useClosePositionMutation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Positions</h1>
        <p className="text-sm text-muted-foreground">Every trade with its fills. Select a row to see the individual buys and sells.</p>
      </div>

      <Card>
        <CardHeader
          title="Trade history"
          action={
            <div className="flex gap-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn('rounded-full px-3 py-1 text-xs font-semibold transition', tab === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />
        <ErrorNote error={positions.error ?? closePosition.error} />
        <PositionsTable
          positions={positions.data ?? []}
          emptyMessage="No trades yet."
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          closingId={closePosition.isPending ? closePosition.variables : null}
          onClose={(id) => closePosition.mutate(id)}
        />
      </Card>

      {selectedId && (
        <Card>
          <CardHeader title={`Fills for ${detail.data?.symbol ?? '…'}`} />
          {detail.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="divide-y text-sm">
              {detail.data?.trades.map((trade) => (
                <li key={trade.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className={cn('w-12 font-semibold', trade.side === 'BUY' ? 'text-success' : 'text-destructive')}>{trade.side}</span>
                  <span className="flex-1 text-muted-foreground">{trade.reason}</span>
                  <span>{FormatUtils.sol(trade.solAmount)}</span>
                  <span className="text-muted-foreground">@ {FormatUtils.price(trade.priceSol)}</span>
                  <span className="text-xs text-muted-foreground">{FormatUtils.dateTime(trade.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
