export interface WalletSwap {
  signature: string;
  timestampMs: number;
  mint: string;
  side: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: number;
}

export interface WalletStats {
  swapsAnalyzed: number;
  solSidedPct: number;
  tokensTraded: number;
  closedTokens: number;
  winRatePct: number;
  totalPnlSol: number;
  avgPnlPerTokenSol: number;
  bestTokenSharePct: number;
  medianHoldMinutes: number;
  swapsPerDay: number;
  spanDays: number;
  avgBuySol: number;
  earlyEntryPct: number | null;
  lastActiveMs: number;
}

export type WalletTier = 'A' | 'B' | 'C';

export interface WalletAssessment {
  stats: WalletStats;
  score: number;
  tier: WalletTier | null;
  rejectReasons: string[];
}

export interface EnhancedSwapAmount {
  userAccount?: string;
  mint: string;
  rawTokenAmount: { tokenAmount: string; decimals: number };
}

export interface TransferLeg {
  fromUserAccount: string | null;
  toUserAccount: string | null;
  tokenAmount?: number;
  amount?: number;
  mint?: string;
}

export interface EnhancedSwapTransaction {
  signature: string;
  timestamp: number;
  feePayer: string;
  tokenTransfers?: TransferLeg[];
  nativeTransfers?: TransferLeg[];
  events?: {
    swap?: {
      nativeInput?: { account?: string; amount: string } | null;
      nativeOutput?: { account?: string; amount: string } | null;
      tokenInputs?: EnhancedSwapAmount[];
      tokenOutputs?: EnhancedSwapAmount[];
    };
  };
}
