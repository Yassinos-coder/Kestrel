export interface BirdeyeTraderItem {
  owner?: string;
  address?: string;
  wallet?: string;
  tags?: string[] | null;
  realizedPnl?: number | null;
  totalPnl?: number | null;
  trade?: number | null;
}

export interface BirdeyeTradersResponse {
  success?: boolean;
  data?: { items?: BirdeyeTraderItem[] } | BirdeyeTraderItem[];
}

export interface BirdeyeWalletSummaryResponse {
  success?: boolean;
  data?: {
    summary?: {
      unique_tokens?: number;
      counts?: { total_trade?: number; total_win?: number; total_loss?: number; win_rate?: number };
      pnl?: { realized_profit_usd?: number; realized_profit_percent?: number };
    };
  };
}

export interface WalletPerformanceSummary {
  uniqueTokens: number;
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  realizedProfitUsd: number;
  realizedProfitPct: number;
}

export interface TopTrader {
  wallet: string;
  realizedPnlUsd: number | null;
  tags: string[];
}
