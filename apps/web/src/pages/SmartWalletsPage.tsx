import type { SmartWalletView } from '@kestrel/shared';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { CopyModal } from '@/components/smart-wallets/CopyModal';
import { FollowsList } from '@/components/smart-wallets/FollowsList';
import { WalletCard } from '@/components/smart-wallets/WalletCard';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { FilterField, FilterInput, FilterSelect } from '@/components/ui/FilterField';
import { Pagination } from '@/components/ui/Pagination';
import { useFollowMutations, useFollowsQuery, useSmartWalletsTable } from '@/hooks/useSmartWallets';

const SORT_OPTIONS = [
  { value: 'score', label: 'Best score' },
  { value: 'profit', label: 'Highest profit' },
  { value: 'winrate', label: 'Win rate' },
  { value: 'recent', label: 'Most recently active' },
  { value: 'early', label: 'Earliest entries' },
];
const TIER_OPTIONS = [
  { value: '', label: 'All tiers' },
  { value: 'A', label: 'Tier A' },
  { value: 'B', label: 'Tier B' },
  { value: 'C', label: 'Tier C' },
];

export function SmartWalletsPage() {
  const table = useSmartWalletsTable(10);
  const follows = useFollowsQuery();
  const { follow, update, stop, discover } = useFollowMutations();
  const [selected, setSelected] = useState<SmartWalletView | null>(null);

  const wallets = table.query.data;
  const activeFollows = (follows.data ?? []).filter((item) => item.status !== 'stopped');
  const busyId = update.isPending ? update.variables?.id ?? null : stop.isPending ? stop.variables ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Smart wallets</h1>
          <p className="text-sm text-muted-foreground">Wallets that consistently profit on Solana meme coins. Copy the ones you trust, with your own limits.</p>
        </div>
        <Button variant="secondary" disabled={discover.isPending} onClick={() => discover.mutate()}>
          <Search className="h-4 w-4" />
          {discover.isPending ? 'Searching…' : 'Find wallets now'}
        </Button>
      </div>
      <ErrorNote error={discover.error ?? update.error ?? stop.error} />

      <Card>
        <CardHeader title="Your copy setups" description="Each one has its own budget and loss limit. Copying pauses itself when the limit is hit." />
        <FollowsList
          follows={activeFollows}
          busyId={busyId}
          onToggle={(item) => update.mutate({ id: item.id, patch: { status: item.status === 'active' ? 'paused' : 'active' } })}
          onStop={(item) => stop.mutate(item.id)}
        />
      </Card>

      <Card>
        <CardHeader title="Suggested wallets" description="Found automatically from tokens that recently ran, then scored on win rate, profit, consistency and whether they look like a bot." />
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <FilterField label="Search address">
            <FilterInput value={table.filters.search} onChange={(event) => table.setFilters({ search: event.target.value })} placeholder="Address" />
          </FilterField>
          <FilterField label="Sort by">
            <FilterSelect value={table.filters.sort} onChange={(sort) => table.setFilters({ sort })} options={SORT_OPTIONS} />
          </FilterField>
          <FilterField label="Tier">
            <FilterSelect value={table.filters.tier} onChange={(tier) => table.setFilters({ tier: tier as 'A' | 'B' | 'C' | '' })} options={TIER_OPTIONS} />
          </FilterField>
          <FilterField label="Min score">
            <FilterInput type="number" inputMode="numeric" value={table.filters.minScore} onChange={(event) => table.setFilters({ minScore: event.target.value })} placeholder="0" />
          </FilterField>
        </div>

        {table.query.isPending ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading wallets…</p>
        ) : table.query.error ? (
          <ErrorNote error={table.query.error} />
        ) : wallets && wallets.items.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {wallets.items.map((wallet) => (
              <WalletCard key={wallet.id} wallet={wallet} onCopy={setSelected} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No qualified wallets yet. The bot searches every 30 minutes and only keeps wallets that pass strict filters. Press “Find wallets now” to search immediately.
          </p>
        )}
        {wallets && wallets.total > 0 && (
          <Pagination page={wallets.page} pages={wallets.pages} total={wallets.total} pageSize={wallets.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        )}
      </Card>

      {selected && (
        <CopyModal
          wallet={selected}
          pending={follow.isPending}
          error={follow.error}
          onClose={() => setSelected(null)}
          onSubmit={(input) => follow.mutate({ walletId: selected.id, input }, { onSuccess: () => setSelected(null) })}
        />
      )}
    </div>
  );
}
