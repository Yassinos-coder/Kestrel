import { describe, expect, it } from 'vitest';
import type { EnhancedTransaction } from '../interfaces/helius.interface';
import { SwapParserMapper } from './swap-parser.mapper';

const MINT = 'MINT';
const VAULT = 'VAULT';

const tx = (transfers: EnhancedTransaction['tokenTransfers'], error?: unknown): EnhancedTransaction => ({
  signature: 'sig',
  timestamp: 1_800_000_000,
  feePayer: 'RELAYER',
  transactionError: error,
  tokenTransfers: transfers,
});

describe('SwapParserMapper', () => {
  it('reads a sell as tokens flowing into the pool vault, trader is the sender', () => {
    const swap = SwapParserMapper.parse(tx([{ mint: MINT, fromUserAccount: 'TRADER', toUserAccount: 'POOL', fromTokenAccount: 'ata', toTokenAccount: VAULT, tokenAmount: 500 }]), MINT, VAULT);
    expect(swap).toMatchObject({ side: 'sell', wallet: 'TRADER', tokenAmount: 500 });
  });

  it('reads a buy as tokens leaving the vault, trader is the receiver even when a relayer paid fees', () => {
    const swap = SwapParserMapper.parse(tx([{ mint: MINT, fromUserAccount: 'POOL', toUserAccount: 'TRADER', fromTokenAccount: VAULT, toTokenAccount: 'ata', tokenAmount: 120 }]), MINT, VAULT);
    expect(swap).toMatchObject({ side: 'buy', wallet: 'TRADER', tokenAmount: 120 });
  });

  it('ignores failed transactions and other mints', () => {
    const move = [{ mint: MINT, fromUserAccount: 'T', toUserAccount: 'P', fromTokenAccount: 'a', toTokenAccount: VAULT, tokenAmount: 1 }];
    expect(SwapParserMapper.parse(tx(move, { err: 1 }), MINT, VAULT)).toBeNull();
    expect(SwapParserMapper.parse(tx([{ ...move[0]!, mint: 'OTHER' }]), MINT, VAULT)).toBeNull();
  });

  it('skips ambiguous transactions that move tokens both ways', () => {
    const both = [
      { mint: MINT, fromUserAccount: 'T', toUserAccount: 'P', fromTokenAccount: 'a', toTokenAccount: VAULT, tokenAmount: 1 },
      { mint: MINT, fromUserAccount: 'P', toUserAccount: 'T', fromTokenAccount: VAULT, toTokenAccount: 'a', tokenAmount: 1 },
    ];
    expect(SwapParserMapper.parse(tx(both), MINT, VAULT)).toBeNull();
  });
});
