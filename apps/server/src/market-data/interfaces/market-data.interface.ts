export interface PoolCandidate {
  pairAddress: string;
  mint: string;
  name: string;
  dexId: string;
  createdAtMs: number;
  buys5m: number;
  sells5m: number;
  buyers5m: number;
  sellers5m: number;
}

export interface TrendingWinner extends PoolCandidate {
  change24hPct: number;
  volume24hUsd: number;
}

export interface PoolTrade {
  kind: 'buy' | 'sell';
  wallet: string;
  tokenAmount: number;
  solAmount: number;
  timestampMs: number;
}

export interface DexPair {
  pairAddress: string;
  dexId: string;
  mint: string;
  symbol: string;
  name: string;
  priceSol: number;
  priceUsd: number;
  liquidityUsd: number;
  liquidityQuoteSol: number;
  marketCapUsd: number;
  priceChange5mPct: number;
  priceChange1hPct: number;
  buys5m: number;
  sells5m: number;
  volume5mUsd: number;
  volume1hUsd: number;
  createdAtMs: number;
}

export interface RugReport {
  mint: string;
  tokenProgram: string;
  creator: string | null;
  creatorBalance: number;
  rugged: boolean;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  supply: number;
  totalHolders: number;
  transferFeePct: number;
  hasTransferHook: boolean;
  hasPermanentDelegate: boolean;
  topHolders: Array<{ owner: string; address: string; pct: number; insider: boolean }>;
  ammAccounts: Set<string>;
  lpLockedPct: number;
  insiderNetworkHolding: number;
  insiderNetworkCount: number;
  creatorTokenCount: number;
  creatorRugCount: number;
}

export interface SwapQuote {
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  raw: Record<string, unknown>;
}

export interface MintOnChain {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  tokenProgram: 'token' | 'token-2022';
  extensions: string[];
  decimals: number;
}
