import type { BrainView, DashboardSummary, DecisionView, PositionDetail, PositionView, ReviewRunView } from '@kestrel/shared';
import { BaseApiClient } from '@/services/BaseApiClient';

class PortfolioService extends BaseApiClient {
  dashboard(): Promise<DashboardSummary> {
    return this.request('/portfolio/dashboard');
  }

  positions(status?: 'OPEN' | 'CLOSED'): Promise<PositionView[]> {
    return this.request(`/portfolio/positions?limit=100${status ? `&status=${status}` : ''}`);
  }

  position(id: string): Promise<PositionDetail> {
    return this.request(`/portfolio/positions/${id}`);
  }

  decisions(limit = 100): Promise<DecisionView[]> {
    return this.request(`/portfolio/decisions?limit=${limit}`);
  }

  closePosition(id: string): Promise<{ closed: true }> {
    return this.request(`/portfolio/positions/${id}/close`, { method: 'POST' });
  }

  brain(): Promise<BrainView> {
    return this.request('/brain');
  }

  runReview(): Promise<ReviewRunView> {
    return this.request('/brain/review', { method: 'POST' });
  }
}

export const portfolioService = new PortfolioService();
