import type { FollowInput } from '@kestrel/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { smartWalletService, type FollowPatch, type WalletFilters } from '@/services/smartWalletService';

const REFRESH_MS = 15_000;

const DEFAULT_FILTERS: WalletFilters = { sort: 'score', tier: '', minScore: '', search: '' };

export function useSmartWalletsTable(initialPageSize = 10) {
  const [filters, setFilters] = useState<WalletFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const debounced = useDebouncedValue(filters);

  useEffect(() => setPage(1), [debounced, pageSize]);

  const query = useQuery({
    queryKey: ['smart-wallets', debounced, page, pageSize],
    queryFn: () => smartWalletService.list(debounced, page, pageSize),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  });

  return {
    filters,
    setFilters: (patch: Partial<WalletFilters>) => setFilters((current) => ({ ...current, ...patch })),
    reset: () => setFilters(DEFAULT_FILTERS),
    page,
    setPage,
    pageSize,
    setPageSize,
    query,
  };
}

export function useFollowsQuery() {
  return useQuery({ queryKey: ['copy-follows'], queryFn: () => smartWalletService.follows(), refetchInterval: REFRESH_MS });
}

export function useFollowMutations() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['copy-follows'] });
    void queryClient.invalidateQueries({ queryKey: ['smart-wallets'] });
  };

  const follow = useMutation({
    mutationFn: ({ walletId, input }: { walletId: string; input: FollowInput }) => smartWalletService.follow(walletId, input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FollowPatch }) => smartWalletService.updateFollow(id, patch),
    onSuccess: refresh,
  });
  const stop = useMutation({ mutationFn: (id: string) => smartWalletService.stopFollow(id), onSuccess: refresh });
  const discover = useMutation({ mutationFn: () => smartWalletService.discover(), onSuccess: refresh });

  return { follow, update, stop, discover };
}
