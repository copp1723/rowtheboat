import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiKey, ApiKeyInput, apiKeysApi } from '@/lib/api';

export function useApiKeys(service?: string) {
  const queryClient = useQueryClient();
  
  const { data: apiKeys = [], isLoading, error } = useQuery({
    queryKey: ['apiKeys', service],
    queryFn: () => apiKeysApi.getAll(service),
  });
  
  const createApiKey = useMutation({
    mutationFn: (newApiKey: ApiKeyInput) => apiKeysApi.create(newApiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
  
  const updateApiKey = useMutation({
    mutationFn: ({ id, apiKey }: { id: string; apiKey: Partial<ApiKeyInput> }) => 
      apiKeysApi.update(id, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
  
  const deleteApiKey = useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
  
  return {
    apiKeys,
    isLoading,
    error,
    createApiKey,
    updateApiKey,
    deleteApiKey,
  };
}
