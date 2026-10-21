import { useQuery } from '@tanstack/react-query';
import { healthService } from '@/services/healthService';

export function useHealthQuery() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => healthService.getLive(),
    refetchInterval: 15_000,
  });
}
