import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '@/services/portfolioService';

const REFRESH_MS = 10_000;

export function useDashboardQuery() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => portfolioService.dashboard(), refetchInterval: REFRESH_MS });
}

export function usePositionsQuery(status?: 'OPEN' | 'CLOSED') {
  return useQuery({ queryKey: ['positions', status ?? 'ALL'], queryFn: () => portfolioService.positions(status), refetchInterval: REFRESH_MS });
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
