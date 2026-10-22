import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '@/services/portfolioService';

export function useBrainQuery() {
  return useQuery({ queryKey: ['brain'], queryFn: () => portfolioService.brain(), refetchInterval: 30_000 });
}

export function useMissedOpportunitiesQuery() {
  return useQuery({ queryKey: ['missed-opportunities'], queryFn: () => portfolioService.missedOpportunities(), refetchInterval: 60_000 });
}

export function useRunReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => portfolioService.runReview(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brain'] }),
  });
}
