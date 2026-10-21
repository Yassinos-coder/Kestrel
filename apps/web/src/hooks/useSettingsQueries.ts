import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService, type SettingsPatch } from '@/services/settingsService';

export function useSettingsQuery() {
  return useQuery({ queryKey: ['settings'], queryFn: () => settingsService.get() });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => settingsService.update(patch),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useWalletQuery() {
  return useQuery({ queryKey: ['wallet'], queryFn: () => settingsService.getWallet(), refetchInterval: 30_000 });
}

export function useCreateWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsService.createWallet(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  });
}

export function useWithdrawMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountSol: number) => settingsService.withdraw(amountSol),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  });
}

export function useSweepMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsService.sweep(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  });
}
