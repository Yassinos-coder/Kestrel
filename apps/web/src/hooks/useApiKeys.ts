import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeyService } from '@/services/apiKeyService';

export function useApiKeys() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['api-keys'] });

  const keys = useQuery({ queryKey: ['api-keys'], queryFn: () => apiKeyService.list() });
  const create = useMutation({ mutationFn: (name: string) => apiKeyService.create(name), onSuccess: refresh });
  const revoke = useMutation({ mutationFn: (id: string) => apiKeyService.revoke(id), onSuccess: refresh });

  return { keys, create, revoke };
}
