import type { BotSettingsView, TradingMode, WalletView } from '@kestrel/shared';
import { BaseApiClient } from '@/services/BaseApiClient';

export interface SettingsPatch {
  mode?: TradingMode;
  enabled?: boolean;
  autoSweep?: boolean;
  liveBankrollSol?: number;
}

class SettingsService extends BaseApiClient {
  get(): Promise<BotSettingsView> {
    return this.request('/settings');
  }

  update(patch: SettingsPatch): Promise<BotSettingsView> {
    return this.request('/settings', { method: 'PATCH', body: patch });
  }

  getWallet(): Promise<WalletView> {
    return this.request('/wallet');
  }

  createWallet(): Promise<WalletView> {
    return this.request('/wallet/create', { method: 'POST' });
  }

  withdraw(amountSol: number): Promise<{ signature: string }> {
    return this.request('/wallet/withdraw', { method: 'POST', body: { amountSol } });
  }

  sweep(): Promise<{ amountSol: number; signature: string }> {
    return this.request('/wallet/sweep', { method: 'POST' });
  }
}

export const settingsService = new SettingsService();
