export interface HolderAccount {
  owner: string;
  amount: number;
}

export interface ParsedSwap {
  signature: string;
  timestampMs: number;
  wallet: string;
  side: 'buy' | 'sell';
  tokenAmount: number;
}

export interface SwapHistory {
  swaps: ParsedSwap[];
  reachedStart: boolean;
}

export interface WalletProfile {
  address: string;
  ageHours: number | null;
  txCount: number;
  oldestSignature: string | null;
}

export interface EnhancedTransfer {
  fromUserAccount: string | null;
  toUserAccount: string | null;
  fromTokenAccount?: string | null;
  toTokenAccount?: string | null;
  tokenAmount?: number;
  amount?: number;
  mint?: string;
}

export interface EnhancedTransaction {
  signature: string;
  timestamp: number;
  feePayer: string;
  transactionError?: unknown;
  tokenTransfers?: EnhancedTransfer[];
  nativeTransfers?: EnhancedTransfer[];
}
