import type { CopyFollowView, FollowInput, Paginated, SmartWalletView } from '@kestrel/shared';
import { BaseApiClient } from '@/services/BaseApiClient';
import { QueryString } from '@/utils/QueryString';

export interface WalletFilters {
  sort: string;
  tier: '' | 'A' | 'B' | 'C';
  minScore: string;
  search: string;
}

export interface FollowPatch extends Partial<FollowInput> {
  status?: 'active' | 'paused';
}

class SmartWalletService extends BaseApiClient {
  list(filters: WalletFilters, page: number, pageSize: number): Promise<Paginated<SmartWalletView>> {
    const query = QueryString.build({
      page,
      pageSize,
      sort: filters.sort,
      tier: filters.tier,
      minScore: QueryString.number(filters.minScore),
      search: filters.search.trim(),
    });
    return this.request(`/smart-wallets${query}`);
  }

  discover(): Promise<unknown> {
    return this.request('/smart-wallets/discover', { method: 'POST' });
  }

  follow(walletId: string, input: FollowInput): Promise<CopyFollowView> {
    return this.request(`/smart-wallets/${walletId}/follow`, { method: 'POST', body: input });
  }

  follows(): Promise<CopyFollowView[]> {
    return this.request('/copy-follows');
  }

  updateFollow(id: string, patch: FollowPatch): Promise<CopyFollowView> {
    return this.request(`/copy-follows/${id}`, { method: 'PATCH', body: patch });
  }

  stopFollow(id: string): Promise<CopyFollowView> {
    return this.request(`/copy-follows/${id}`, { method: 'DELETE' });
  }
}

export const smartWalletService = new SmartWalletService();
