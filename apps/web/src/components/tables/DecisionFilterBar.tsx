import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FilterField, FilterInput, FilterSelect } from '@/components/ui/FilterField';
import type { DecisionFilters } from '@/services/portfolioService';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'mcap_desc', label: 'Largest market cap' },
  { value: 'mcap_asc', label: 'Smallest market cap' },
  { value: 'confidence_desc', label: 'Highest confidence' },
];

const ACTIONS = [
  { value: '', label: 'All' },
  { value: 'BUY', label: 'Bought' },
  { value: 'SKIP', label: 'Skipped' },
  { value: 'REJECTED', label: 'Rejected' },
];

interface DecisionFilterBarProps {
  filters: DecisionFilters;
  onChange: (patch: Partial<DecisionFilters>) => void;
  onReset: () => void;
}

export function DecisionFilterBar({ filters, onChange, onReset }: DecisionFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label="Search token">
          <FilterInput placeholder="Name or address" value={filters.search} onChange={(event) => onChange({ search: event.target.value })} />
        </FilterField>
        <FilterField label="Outcome">
          <FilterSelect value={filters.action} onChange={(value) => onChange({ action: value as DecisionFilters['action'] })} options={ACTIONS} />
        </FilterField>
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
          <FilterField label="From">
            <FilterInput type="date" value={filters.from} onChange={(event) => onChange({ from: event.target.value })} />
          </FilterField>
          <FilterField label="To">
            <FilterInput type="date" value={filters.to} onChange={(event) => onChange({ to: event.target.value })} />
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
