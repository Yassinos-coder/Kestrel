import type { BrainView, DashboardSummary, DecisionView, MissedOpportunitiesView, Paginated, PositionDetail, PositionView, ReviewRunView, SuggestionResult } from '@kestrel/shared';
import { BaseApiClient } from '@/services/BaseApiClient';
import { QueryString } from '@/utils/QueryString';

export interface PositionFilters {
  status: '' | 'OPEN' | 'CLOSED';
  sort: string;
  search: string;
  from: string;
  to: string;
  minPnlPct: string;
  maxPnlPct: string;
  minMarketCap: string;
  maxMarketCap: string;
}

export interface DecisionFilters {
  action: '' | 'BUY' | 'SKIP' | 'REJECTED';
  sort: string;
  search: string;
  from: string;
  to: string;
  minMarketCap: string;
  maxMarketCap: string;
}

class PortfolioService extends BaseApiClient {
  dashboard(): Promise<DashboardSummary> {
    return this.request('/portfolio/dashboard');
  }

  positions(filters: PositionFilters, page: number, pageSize: number): Promise<Paginated<PositionView>> {
    const query = QueryString.build({
      page,
      pageSize,
      status: filters.status,
      sort: filters.sort,
      search: filters.search.trim(),
      from: filters.from,
      to: filters.to,
      minPnlPct: QueryString.number(filters.minPnlPct),
      maxPnlPct: QueryString.number(filters.maxPnlPct),
      minMarketCap: QueryString.number(filters.minMarketCap),
      maxMarketCap: QueryString.number(filters.maxMarketCap),
    });
    return this.request(`/portfolio/positions${query}`);
  }

  position(id: string): Promise<PositionDetail> {
    return this.request(`/portfolio/positions/${id}`);
  }

  decisions(filters: DecisionFilters, page: number, pageSize: number): Promise<Paginated<DecisionView>> {
    const query = QueryString.build({
      page,
      pageSize,
      action: filters.action,
      sort: filters.sort,
      search: filters.search.trim(),
      from: filters.from,
      to: filters.to,
      minMarketCap: QueryString.number(filters.minMarketCap),
      maxMarketCap: QueryString.number(filters.maxMarketCap),
    });
    return this.request(`/portfolio/decisions${query}`);
  }

  closePosition(id: string): Promise<{ closed: true }> {
    return this.request(`/portfolio/positions/${id}/close`, { method: 'POST' });
  }

  suggest(mint: string): Promise<SuggestionResult> {
    return this.request('/suggestions', { method: 'POST', body: { mint } });
  }

  brain(): Promise<BrainView> {
    return this.request('/brain');
  }

  missedOpportunities(): Promise<MissedOpportunitiesView> {
    return this.request('/missed-opportunities');
  }

  runReview(): Promise<ReviewRunView> {
    return this.request('/brain/review', { method: 'POST' });
  }
}

export const portfolioService = new PortfolioService();
