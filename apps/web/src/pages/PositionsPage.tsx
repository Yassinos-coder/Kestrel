import { useState } from 'react';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { PositionFilterBar } from '@/components/tables/PositionFilterBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { useClosePositionMutation, usePositionDetailQuery, usePositionsTable } from '@/hooks/usePortfolioQueries';
import { FormatUtils } from '@/utils/FormatUtils';

const ROLE_LABELS = { creator: 'creator', 'top-holder': 'top holder', 'early-buyer': 'early buyer', other: 'other' } as const;

export function PositionsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const table = usePositionsTable();
  const detail = usePositionDetailQuery(selectedId);
  const closePosition = useClosePositionMutation();
  const page = table.query.data;
  const evidence = detail.data?.exitEvidence;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Positions</h1>
        <p className="text-sm text-muted-foreground">Every trade. Filter and sort, tap a row for its fills, tap a token name to open its chart.</p>
      </div>

      <Card>
        <CardHeader title="Trade history" />
        <PositionFilterBar filters={table.filters} onChange={table.setFilters} onReset={table.reset} />
        <ErrorNote error={table.query.error ?? closePosition.error} />
        <PositionsTable
          positions={page?.items ?? []}
          emptyMessage="No trades match these filters."
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          closingId={closePosition.isPending ? closePosition.variables : null}
          onClose={(id) => closePosition.mutate(id)}
        />
        {page && (
          <Pagination page={page.page} pages={page.pages} total={page.total} pageSize={page.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        )}
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

          {evidence && (
            <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
              <p className="font-semibold">Exit evidence</p>
              <p className="mt-1 text-muted-foreground">
                {evidence.sellStreak} sells in a row, {evidence.uniqueSellers} different sellers in the last {evidence.windowMinutes} min, sell volume {evidence.sellVsBuyVolume.toFixed(1)}x buy volume.
                {evidence.soldByCreator ? ' The creator sold.' : ''} {evidence.topHoldersSelling} top holders and {evidence.earlyBuyersSelling} early buyers were among the sellers.
              </p>
              <ul className="mt-2 space-y-1">
                {evidence.topSellers.map((seller) => (
                  <li key={seller.wallet} className="flex justify-between gap-3">
                    <span>
                      <code>{FormatUtils.shortAddress(seller.wallet)}</code> <span className="text-muted-foreground">({ROLE_LABELS[seller.role]})</span>
                    </span>
                    <span>{seller.sharePct.toFixed(0)}% of sells</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
