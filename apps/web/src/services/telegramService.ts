import type { TelegramStatus } from '@kestrel/shared';
import { BaseApiClient } from '@/services/BaseApiClient';

class TelegramService extends BaseApiClient {
  status(): Promise<TelegramStatus> {
    return this.request('/telegram');
  }

  createLink(): Promise<TelegramStatus> {
    return this.request('/telegram/link', { method: 'POST' });
  }

  sendTest(): Promise<{ sent: true }> {
    return this.request('/telegram/test', { method: 'POST' });
  }

  sendWeeklyReport(): Promise<{ sent: true }> {
    return this.request('/reports/weekly', { method: 'POST' });
  }

  disconnect(): Promise<{ disconnected: true }> {
    return this.request('/telegram/disconnect', { method: 'POST' });
  }
}

export const telegramService = new TelegramService();
