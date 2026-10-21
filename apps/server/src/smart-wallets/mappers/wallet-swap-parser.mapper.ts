import type { EnhancedSwapAmount, EnhancedSwapTransaction, WalletSwap } from '../interfaces/wallet.interface';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const STABLE_MINTS = new Set(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB']);
const LAMPORTS_PER_SOL = 1_000_000_000;

export class WalletSwapParserMapper {
  static parse(transaction: EnhancedSwapTransaction, wallet: string): WalletSwap | null {
    if (transaction.feePayer !== wallet) return null;
    const swap = transaction.events?.swap;
    if (!swap) return WalletSwapParserMapper.parseTransfers(transaction, wallet);

    const inputs = swap.tokenInputs ?? [];
    const outputs = swap.tokenOutputs ?? [];
    const netSolSpent =
      WalletSwapParserMapper.lamports(swap.nativeInput) +
      WalletSwapParserMapper.total(inputs.filter((item) => item.mint === WSOL_MINT)) -
      WalletSwapParserMapper.lamports(swap.nativeOutput) -
      WalletSwapParserMapper.total(outputs.filter((item) => item.mint === WSOL_MINT));

    const tokenIn = WalletSwapParserMapper.byMint(inputs);
    const tokenOut = WalletSwapParserMapper.byMint(outputs);

    if (netSolSpent > 0 && tokenOut.size === 1 && !tokenIn.size) {
      const [mint, tokens] = [...tokenOut.entries()][0]!;
      return WalletSwapParserMapper.build(transaction, mint, tokens, 'buy', netSolSpent);
    }
    if (netSolSpent < 0 && tokenIn.size === 1 && !tokenOut.size) {
      const [mint, tokens] = [...tokenIn.entries()][0]!;
      return WalletSwapParserMapper.build(transaction, mint, tokens, 'sell', -netSolSpent);
    }
    return null;
  }

  private static parseTransfers(transaction: EnhancedSwapTransaction, wallet: string): WalletSwap | null {
    const moves = (transaction.tokenTransfers ?? []).filter((transfer) => transfer.mint && transfer.mint !== WSOL_MINT && !STABLE_MINTS.has(transfer.mint));
    const received = moves.filter((transfer) => transfer.toUserAccount === wallet);
    const sent = moves.filter((transfer) => transfer.fromUserAccount === wallet);
    const mints = new Set(moves.map((transfer) => transfer.mint));
    if (mints.size !== 1 || (received.length > 0 && sent.length > 0)) return null;

    const lamportsOut = (transaction.nativeTransfers ?? []).filter((transfer) => transfer.fromUserAccount === wallet).reduce((sum, transfer) => sum + (transfer.amount ?? 0), 0);
    const lamportsIn = (transaction.nativeTransfers ?? []).filter((transfer) => transfer.toUserAccount === wallet).reduce((sum, transfer) => sum + (transfer.amount ?? 0), 0);
    const mint = [...mints][0]!;

    if (received.length && lamportsOut > 0) {
      return WalletSwapParserMapper.build(transaction, mint, received.reduce((sum, transfer) => sum + (transfer.tokenAmount ?? 0), 0), 'buy', lamportsOut / LAMPORTS_PER_SOL);
    }
    if (sent.length && lamportsIn > 0) {
      return WalletSwapParserMapper.build(transaction, mint, sent.reduce((sum, transfer) => sum + (transfer.tokenAmount ?? 0), 0), 'sell', lamportsIn / LAMPORTS_PER_SOL);
    }
    return null;
  }

  private static build(transaction: EnhancedSwapTransaction, mint: string, tokenAmount: number, side: 'buy' | 'sell', solAmount: number): WalletSwap {
    return { signature: transaction.signature, timestampMs: transaction.timestamp * 1000, mint, side, solAmount, tokenAmount };
  }

  private static byMint(items: EnhancedSwapAmount[]): Map<string, number> {
    const totals = new Map<string, number>();
    for (const item of items) {
      if (item.mint === WSOL_MINT || STABLE_MINTS.has(item.mint)) continue;
      totals.set(item.mint, (totals.get(item.mint) ?? 0) + WalletSwapParserMapper.amount(item));
    }
    return totals;
  }

  private static lamports(side: { amount: string } | null | undefined): number {
    return side ? Number(side.amount) / LAMPORTS_PER_SOL : 0;
  }

  private static total(items: EnhancedSwapAmount[]): number {
    return items.reduce((sum, item) => sum + WalletSwapParserMapper.amount(item), 0);
  }

  private static amount(item: EnhancedSwapAmount): number {
    return Number(item.rawTokenAmount.tokenAmount) / 10 ** item.rawTokenAmount.decimals;
  }
}
