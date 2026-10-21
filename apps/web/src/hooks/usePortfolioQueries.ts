import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { portfolioService, type DecisionFilters, type PositionFilters } from '@/services/portfolioService';

const REFRESH_MS = 10_000;

export const DEFAULT_POSITION_FILTERS: PositionFilters = {
  status: '',
  sort: 'newest',
  search: '',
  from: '',
  to: '',
  minPnlPct: '',
  maxPnlPct: '',
  minMarketCap: '',
  maxMarketCap: '',
};

export const DEFAULT_DECISION_FILTERS: DecisionFilters = {
  action: '',
  sort: 'newest',
  search: '',
  from: '',
  to: '',
  minMarketCap: '',
  maxMarketCap: '',
};

export function useDashboardQuery() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => portfolioService.dashboard(), refetchInterval: REFRESH_MS });
}

export function usePositionsTable(initial: Partial<PositionFilters> = {}, initialPageSize = 10) {
  const [filters, setFilters] = useState<PositionFilters>({ ...DEFAULT_POSITION_FILTERS, ...initial });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const debounced = useDebouncedValue(filters);

  useEffect(() => setPage(1), [debounced, pageSize]);

  const query = useQuery({
    queryKey: ['positions', debounced, page, pageSize],
    queryFn: () => portfolioService.positions(debounced, page, pageSize),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  });

  return {
    filters,
    setFilters: (patch: Partial<PositionFilters>) => setFilters((current) => ({ ...current, ...patch })),
    reset: () => setFilters({ ...DEFAULT_POSITION_FILTERS, ...initial }),
    page,
    setPage,
    pageSize,
    setPageSize,
    query,
  };
}

export function useDecisionsTable(initialPageSize = 10) {
  const [filters, setFilters] = useState<DecisionFilters>(DEFAULT_DECISION_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const debounced = useDebouncedValue(filters);

  useEffect(() => setPage(1), [debounced, pageSize]);

  const query = useQuery({
    queryKey: ['decisions', debounced, page, pageSize],
    queryFn: () => portfolioService.decisions(debounced, page, pageSize),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  });

  return {
    filters,
    setFilters: (patch: Partial<DecisionFilters>) => setFilters((current) => ({ ...current, ...patch })),
    reset: () => setFilters(DEFAULT_DECISION_FILTERS),
    page,
    setPage,
    pageSize,
    setPageSize,
    query,
  };
}

export function usePositionDetailQuery(id: string | null) {
  return useQuery({ queryKey: ['position', id], queryFn: () => portfolioService.position(id!), enabled: id !== null });
}

export function useClosePositionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => portfolioService.closePosition(id),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
