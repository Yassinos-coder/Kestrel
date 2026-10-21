import type { TradingMode } from '../../generated/prisma/client';

export interface SettingsUpdate {
  mode?: TradingMode;
  enabled?: boolean;
  autoSweep?: boolean;
  liveBankrollSol?: number;
}
