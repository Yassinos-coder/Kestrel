import type { DexPair, MintOnChain, PoolCandidate, PoolTrade, RugReport, SwapQuote } from './market-data.interface';

export interface SnapshotInputs {
  pair: DexPair;
  candidate: PoolCandidate | null;
  rug: RugReport;
  onchain: MintOnChain;
  exitQuote: SwapQuote | null;
  trades: PoolTrade[];
  previousHolders: number | null;
  nowMs: number;
}
