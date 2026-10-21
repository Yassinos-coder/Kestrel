import { BotControlCard } from '@/components/dashboard/BotControlCard';
import { DecisionFeed } from '@/components/dashboard/DecisionFeed';
import { ProfitabilityCard } from '@/components/dashboard/ProfitabilityCard';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { DecisionFilterBar } from '@/components/tables/DecisionFilterBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { Pagination } from '@/components/ui/Pagination';
import { StatCard } from '@/components/ui/StatCard';
import { useClosePositionMutation, useDashboardQuery, useDecisionsTable, usePositionsTable } from '@/hooks/usePortfolioQueries';
import { useUpdateSettingsMutation } from '@/hooks/useSettingsQueries';
import { useAuthStore } from '@/store/authStore';
import { FormatUtils } from '@/utils/FormatUtils';

const OPEN_PAGE_SIZE = 5;

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data, isPending, error } = useDashboardQuery();
  const settings = useUpdateSettingsMutation();
  const closePosition = useClosePositionMutation();
  const openTable = usePositionsTable({ status: 'OPEN', sort: 'newest' }, OPEN_PAGE_SIZE);
  const decisionTable = useDecisionsTable(10);

  if (isPending) return <p className="text-muted-foreground">Loading your desk…</p>;
  if (error || !data) return <ErrorNote error={error ?? new Error('Dashboard unavailable')} />;

  const growth = ((data.equitySol - data.startingBalanceSol) / data.startingBalanceSol) * 100;
  const open = openTable.query.data;
  const decisions = decisionTable.query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi {user?.displayName}</h1>
        <p className="text-sm text-muted-foreground">Everything the bot is doing, live.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <BotControlCard
            enabled={data.enabled}
            mode={data.mode}
            engine={data.engine}
            pending={settings.isPending}
            onToggle={(enabled) => settings.mutate({ enabled })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard label="Equity" value={FormatUtils.sol(data.equitySol, 3)} hint={`${FormatUtils.pct(growth)} since start`} tone={growth >= 0 ? 'positive' : 'negative'} />
          <StatCard label="Today" value={FormatUtils.signedSol(data.todayPnlSol)} tone={data.todayPnlSol >= 0 ? 'positive' : 'negative'} />
          <StatCard label="Realized P&L" value={FormatUtils.signedSol(data.realizedPnlSol)} hint={`${data.closedTrades} closed trades`} tone={data.realizedPnlSol >= 0 ? 'positive' : 'negative'} />
          <StatCard label="Win rate" value={data.closedTrades ? `${data.winRatePct.toFixed(0)}%` : '—'} hint={`Cash ${FormatUtils.sol(data.cashSol, 3)}`} />
        </div>
      </div>
      <ErrorNote error={settings.error ?? closePosition.error} />

      <ProfitabilityCard data={data.profitability} />

      <Card>
        <CardHeader title="Open positions" description="The guardian watches these every few seconds and exits on its own rules." />
        <PositionsTable
          positions={open?.items ?? []}
          emptyMessage="No open positions. The bot only buys when a token passes every safety rule."
          closingId={closePosition.isPending ? closePosition.variables : null}
          onClose={(id) => closePosition.mutate(id)}
        />
        {open && open.total > OPEN_PAGE_SIZE && (
          <Pagination page={open.page} pages={open.pages} total={open.total} pageSize={open.pageSize} onPage={openTable.setPage} />
        )}
      </Card>

      <Card>
        <CardHeader title="Decisions" description="Every token the bot looked at, with the reasons. Tap a row to see the ten rule checklist; tap a token name to open its chart." />
        <DecisionFilterBar filters={decisionTable.filters} onChange={decisionTable.setFilters} onReset={decisionTable.reset} />
        <DecisionFeed decisions={decisions?.items ?? []} />
        {decisions && (
          <Pagination
            page={decisions.page}
            pages={decisions.pages}
            total={decisions.total}
            pageSize={decisions.pageSize}
            onPage={decisionTable.setPage}
            onPageSize={decisionTable.setPageSize}
          />
        )}
      </Card>
    </div>
  );
}
