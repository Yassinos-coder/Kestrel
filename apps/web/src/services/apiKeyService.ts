import type { ApiKeyView, CreatedApiKey } from '@kestrel/shared';
import { BaseApiClient } from '@/services/BaseApiClient';

class ApiKeyService extends BaseApiClient {
  list(): Promise<ApiKeyView[]> {
    return this.request('/api-keys');
  }

  create(name: string): Promise<CreatedApiKey> {
    return this.request('/api-keys', { method: 'POST', body: { name } });
  }

  revoke(id: string): Promise<{ revoked: true }> {
    return this.request(`/api-keys/${id}`, { method: 'DELETE' });
  }
}

export const apiKeyService = new ApiKeyService();
