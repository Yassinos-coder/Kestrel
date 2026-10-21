import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FilterField, FilterInput, FilterSelect } from '@/components/ui/FilterField';
import type { PositionFilters } from '@/services/portfolioService';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'profit_desc', label: 'Biggest profit' },
  { value: 'profit_asc', label: 'Biggest loss' },
  { value: 'pct_desc', label: 'Highest % change' },
  { value: 'pct_asc', label: 'Lowest % change' },
  { value: 'mcap_desc', label: 'Largest market cap' },
  { value: 'mcap_asc', label: 'Smallest market cap' },
];

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

interface PositionFilterBarProps {
  filters: PositionFilters;
  onChange: (patch: Partial<PositionFilters>) => void;
  onReset: () => void;
  hideStatus?: boolean;
}

export function PositionFilterBar({ filters, onChange, onReset, hideStatus }: PositionFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label="Search token">
          <FilterInput placeholder="Name or address" value={filters.search} onChange={(event) => onChange({ search: event.target.value })} />
        </FilterField>
        {!hideStatus && (
          <FilterField label="Status">
            <FilterSelect value={filters.status} onChange={(value) => onChange({ status: value as PositionFilters['status'] })} options={STATUSES} />
          </FilterField>
        )}
        <FilterField label="Sort by">
          <FilterSelect value={filters.sort} onChange={(value) => onChange({ sort: value })} options={SORTS} />
        </FilterField>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Fewer filters' : 'More filters'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/50 p-3">
          <FilterField label="Opened from">
            <FilterInput type="date" value={filters.from} onChange={(event) => onChange({ from: event.target.value })} />
          </FilterField>
          <FilterField label="Opened to">
            <FilterInput type="date" value={filters.to} onChange={(event) => onChange({ to: event.target.value })} />
          </FilterField>
          <FilterField label="Min change %">
            <FilterInput type="number" className="h-9 w-28 rounded-lg border bg-background px-2.5 text-sm" placeholder="-50" value={filters.minPnlPct} onChange={(event) => onChange({ minPnlPct: event.target.value })} />
          </FilterField>
          <FilterField label="Max change %">
            <FilterInput type="number" className="h-9 w-28 rounded-lg border bg-background px-2.5 text-sm" placeholder="200" value={filters.maxPnlPct} onChange={(event) => onChange({ maxPnlPct: event.target.value })} />
          </FilterField>
          <FilterField label="Min market cap $">
            <FilterInput type="number" className="h-9 w-32 rounded-lg border bg-background px-2.5 text-sm" placeholder="50000" value={filters.minMarketCap} onChange={(event) => onChange({ minMarketCap: event.target.value })} />
          </FilterField>
          <FilterField label="Max market cap $">
            <FilterInput type="number" className="h-9 w-32 rounded-lg border bg-background px-2.5 text-sm" placeholder="2000000" value={filters.maxMarketCap} onChange={(event) => onChange({ maxMarketCap: event.target.value })} />
          </FilterField>
        </div>
      )}
    </div>
  );
}
