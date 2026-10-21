import type { EnhancedTransaction, ParsedSwap } from '../interfaces/helius.interface';

export class SwapParserMapper {
  static parse(transaction: EnhancedTransaction, mint: string, vault: string): ParsedSwap | null {
    if (transaction.transactionError) return null;

    const moves = (transaction.tokenTransfers ?? []).filter((transfer) => transfer.mint === mint);
    const intoVault = moves.filter((transfer) => transfer.toTokenAccount === vault && transfer.fromUserAccount);
    const outOfVault = moves.filter((transfer) => transfer.fromTokenAccount === vault && transfer.toUserAccount);

    if (intoVault.length && !outOfVault.length) {
      return SwapParserMapper.build(transaction, 'sell', intoVault[0]!.fromUserAccount!, SwapParserMapper.sum(intoVault));
    }
    if (outOfVault.length && !intoVault.length) {
      return SwapParserMapper.build(transaction, 'buy', outOfVault[0]!.toUserAccount!, SwapParserMapper.sum(outOfVault));
    }
    return null;
  }

  private static build(transaction: EnhancedTransaction, side: 'buy' | 'sell', wallet: string, tokenAmount: number): ParsedSwap {
    return { signature: transaction.signature, timestampMs: transaction.timestamp * 1000, wallet, side, tokenAmount };
  }

  private static sum(transfers: Array<{ tokenAmount?: number }>): number {
    return transfers.reduce((total, transfer) => total + (transfer.tokenAmount ?? 0), 0);
  }
}
