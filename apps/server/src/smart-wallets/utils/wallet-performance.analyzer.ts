import type { WalletStats, WalletSwap } from '../interfaces/wallet.interface';

const PERCENT = 100;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const EARLY_ENTRY_MS = 30 * MINUTE_MS;
const MIN_KNOWN_FOR_EARLINESS = 5;

interface TokenLedger {
  solIn: number;
  solOut: number;
  tokensBought: number;
  tokensSold: number;
  firstBuyMs: number;
  lastSellMs: number;
}

export interface AnalysisInput {
  swaps: WalletSwap[];
  totalSwapTransactions: number;
  pairCreatedAtMs: Map<string, number>;
}

export class WalletPerformanceAnalyzer {
  static analyze(input: AnalysisInput): WalletStats {
    const ledgers = WalletPerformanceAnalyzer.buildLedgers(input.swaps);
    const closed = [...ledgers.entries()].filter(([, ledger]) => ledger.tokensBought > 0 && ledger.tokensSold > 0);
    const pnls = closed.map(([, ledger]) => WalletPerformanceAnalyzer.realizedPnl(ledger));
    const wins = pnls.filter((pnl) => pnl > 0);
    const positive = wins.reduce((sum, pnl) => sum + pnl, 0);

    const times = input.swaps.map((swap) => swap.timestampMs);
    const spanMs = times.length ? Math.max(...times) - Math.min(...times) : 0;
    const spanDays = spanMs / DAY_MS;
    const buys = input.swaps.filter((swap) => swap.side === 'buy');

    return {
      swapsAnalyzed: input.swaps.length,
      solSidedPct: input.totalSwapTransactions ? (input.swaps.length / input.totalSwapTransactions) * PERCENT : 0,
      tokensTraded: ledgers.size,
      closedTokens: closed.length,
      winRatePct: closed.length ? (wins.length / closed.length) * PERCENT : 0,
      totalPnlSol: pnls.reduce((sum, pnl) => sum + pnl, 0),
      avgPnlPerTokenSol: closed.length ? pnls.reduce((sum, pnl) => sum + pnl, 0) / closed.length : 0,
      bestTokenSharePct: positive > 0 ? (Math.max(...wins) / positive) * PERCENT : 100,
      medianHoldMinutes: WalletPerformanceAnalyzer.median(closed.map(([, ledger]) => (ledger.lastSellMs - ledger.firstBuyMs) / MINUTE_MS)),
      swapsPerDay: input.swaps.length / Math.max(spanDays, 1 / 24),
      spanDays,
      avgBuySol: buys.length ? buys.reduce((sum, swap) => sum + swap.solAmount, 0) / buys.length : 0,
      earlyEntryPct: WalletPerformanceAnalyzer.earlyEntryPct(ledgers, input.pairCreatedAtMs),
      lastActiveMs: times.length ? Math.max(...times) : 0,
    };
  }

  private static buildLedgers(swaps: WalletSwap[]): Map<string, TokenLedger> {
    const ledgers = new Map<string, TokenLedger>();
    for (const swap of [...swaps].sort((a, b) => a.timestampMs - b.timestampMs)) {
      const ledger = ledgers.get(swap.mint) ?? { solIn: 0, solOut: 0, tokensBought: 0, tokensSold: 0, firstBuyMs: 0, lastSellMs: 0 };
      if (swap.side === 'buy') {
        ledger.solIn += swap.solAmount;
        ledger.tokensBought += swap.tokenAmount;
        ledger.firstBuyMs = ledger.firstBuyMs || swap.timestampMs;
      } else {
        ledger.solOut += swap.solAmount;
        ledger.tokensSold += swap.tokenAmount;
        ledger.lastSellMs = swap.timestampMs;
      }
      ledgers.set(swap.mint, ledger);
    }
    return ledgers;
  }

  private static realizedPnl(ledger: TokenLedger): number {
    const soldShare = Math.min(1, ledger.tokensSold / ledger.tokensBought);
    return ledger.solOut - ledger.solIn * soldShare;
  }

  private static earlyEntryPct(ledgers: Map<string, TokenLedger>, created: Map<string, number>): number | null {
    const known = [...ledgers.entries()].filter(([mint, ledger]) => ledger.firstBuyMs > 0 && created.has(mint));
    if (known.length < MIN_KNOWN_FOR_EARLINESS) return null;
    const early = known.filter(([mint, ledger]) => ledger.firstBuyMs - (created.get(mint) ?? 0) <= EARLY_ENTRY_MS);
    return (early.length / known.length) * PERCENT;
  }

  private static median(values: number[]): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }
}
