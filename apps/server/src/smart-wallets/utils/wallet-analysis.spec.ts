import { describe, expect, it } from 'vitest';
import type { EnhancedSwapTransaction, WalletSwap } from '../interfaces/wallet.interface';
import { WalletSwapParserMapper } from '../mappers/wallet-swap-parser.mapper';
import { WalletPerformanceAnalyzer } from './wallet-performance.analyzer';
import { WalletScorer } from './wallet-scorer';

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const WALLET = 'WALLET';

const swap = (mint: string, side: 'buy' | 'sell', hoursAgo: number, sol: number, tokens = 1000): WalletSwap => ({
  signature: `${mint}-${side}-${hoursAgo}`,
  timestampMs: NOW - hoursAgo * HOUR,
  mint,
  side,
  solAmount: sol,
  tokenAmount: tokens,
});

const trader = (): WalletSwap[] => {
  const swaps: WalletSwap[] = [];
  for (let index = 0; index < 12; index++) {
    const win = index % 4 !== 0;
    const start = 200 - index * 12;
    swaps.push(swap(`T${index}`, 'buy', start, 1), swap(`T${index}`, 'sell', start - 2, win ? 1.8 : 0.5));
  }
  return swaps;
};

const created = new Map(Array.from({ length: 12 }, (_, index) => [`T${index}`, NOW - (200 - index * 12 + 0.2) * HOUR] as const));

describe('WalletSwapParserMapper', () => {
  const buy: EnhancedSwapTransaction = {
    signature: 's1',
    timestamp: 1_800_000_000,
    feePayer: WALLET,
    events: { swap: { nativeInput: { account: WALLET, amount: '1500000000' }, tokenOutputs: [{ userAccount: WALLET, mint: 'MEME', rawTokenAmount: { tokenAmount: '2000000', decimals: 6 } }] } },
  };

  it('reads a SOL to token swap as a buy', () => {
    expect(WalletSwapParserMapper.parse(buy, WALLET)).toMatchObject({ side: 'buy', mint: 'MEME', solAmount: 1.5, tokenAmount: 2 });
  });

  it('reads token to SOL as a sell, including wrapped SOL', () => {
    const sell: EnhancedSwapTransaction = {
      ...buy,
      events: {
        swap: {
          tokenInputs: [{ userAccount: WALLET, mint: 'MEME', rawTokenAmount: { tokenAmount: '2000000', decimals: 6 } }],
          tokenOutputs: [{ userAccount: WALLET, mint: 'So11111111111111111111111111111111111111112', rawTokenAmount: { tokenAmount: '900000000', decimals: 9 } }],
        },
      },
    };
    expect(WalletSwapParserMapper.parse(sell, WALLET)).toMatchObject({ side: 'sell', solAmount: 0.9 });
  });

  it('reads swaps whose legs belong to router or temporary accounts', () => {
    const routed: EnhancedSwapTransaction = {
      ...buy,
      events: { swap: { nativeInput: { account: 'TEMP', amount: '500000000' }, tokenOutputs: [{ userAccount: 'ROUTER', mint: 'MEME', rawTokenAmount: { tokenAmount: '1000000', decimals: 6 } }] } },
    };
    expect(WalletSwapParserMapper.parse(routed, WALLET)).toMatchObject({ side: 'buy', solAmount: 0.5, tokenAmount: 1 });
  });

  it('merges split legs of the same token', () => {
    const split: EnhancedSwapTransaction = {
      ...buy,
      events: {
        swap: {
          nativeOutput: { account: WALLET, amount: '1000000000' },
          tokenInputs: [
            { mint: 'MEME', rawTokenAmount: { tokenAmount: '1000000', decimals: 6 } },
            { mint: 'MEME', rawTokenAmount: { tokenAmount: '3000000', decimals: 6 } },
          ],
        },
      },
    };
    expect(WalletSwapParserMapper.parse(split, WALLET)).toMatchObject({ side: 'sell', solAmount: 1, tokenAmount: 4 });
  });

  it('ignores stablecoin swaps and swaps made by someone else', () => {
    const usdc: EnhancedSwapTransaction = {
      ...buy,
      events: { swap: { nativeInput: { account: WALLET, amount: '1000000000' }, tokenOutputs: [{ mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', rawTokenAmount: { tokenAmount: '100000000', decimals: 6 } }] } },
    };
    expect(WalletSwapParserMapper.parse(usdc, WALLET)).toBeNull();
    expect(WalletSwapParserMapper.parse({ ...buy, feePayer: 'SOMEONE' }, WALLET)).toBeNull();
  });

  it('falls back to plain transfers for trades without a swap event', () => {
    const transfersOnly: EnhancedSwapTransaction = {
      signature: 's2',
      timestamp: 1_800_000_000,
      feePayer: WALLET,
      tokenTransfers: [{ mint: 'MEME', fromUserAccount: 'CURVE', toUserAccount: WALLET, tokenAmount: 5000 }],
      nativeTransfers: [
        { fromUserAccount: WALLET, toUserAccount: 'CURVE', amount: 800_000_000 },
        { fromUserAccount: WALLET, toUserAccount: 'FEE', amount: 8_000_000 },
      ],
    };
    expect(WalletSwapParserMapper.parse(transfersOnly, WALLET)).toMatchObject({ side: 'buy', mint: 'MEME', tokenAmount: 5000, solAmount: 0.808 });
  });

  it('skips token to token swaps', () => {
    const tokenToToken: EnhancedSwapTransaction = {
      ...buy,
      events: { swap: { tokenInputs: [{ mint: 'A', rawTokenAmount: { tokenAmount: '1', decimals: 0 } }], tokenOutputs: [{ mint: 'B', rawTokenAmount: { tokenAmount: '1', decimals: 0 } }] } },
    };
    expect(WalletSwapParserMapper.parse(tokenToToken, WALLET)).toBeNull();
  });
});

describe('WalletPerformanceAnalyzer and WalletScorer', () => {
  const stats = WalletPerformanceAnalyzer.analyze({ swaps: trader(), totalSwapTransactions: 26, pairCreatedAtMs: created });
  const assessment = WalletScorer.assess(stats, NOW);

  it('measures win rate, profit and earliness', () => {
    expect(stats.closedTokens).toBe(12);
    expect(stats.winRatePct).toBeCloseTo(75, 0);
    expect(stats.totalPnlSol).toBeGreaterThan(5);
    expect(stats.earlyEntryPct).toBe(100);
    expect(stats.medianHoldMinutes).toBeCloseTo(120, 0);
  });

  it('qualifies a consistent, early, human-paced trader', () => {
    expect(assessment.rejectReasons).toEqual([]);
    expect(assessment.tier).not.toBeNull();
    expect(assessment.score).toBeGreaterThan(60);
  });

  it('rejects a bot that makes hundreds of swaps in a few hours', () => {
    const botSwaps = Array.from({ length: 300 }, (_, index) => swap(`B${index % 30}`, index % 2 ? 'sell' : 'buy', index * 0.01, 1, 10));
    const bot = WalletScorer.assess(WalletPerformanceAnalyzer.analyze({ swaps: botSwaps, totalSwapTransactions: 300, pairCreatedAtMs: new Map() }), NOW);
    expect(bot.tier).toBeNull();
    expect(bot.rejectReasons.some((reason) => reason.includes('bot'))).toBe(true);
  });

  it('rejects a wallet whose profit is one lucky token', () => {
    const swaps = trader().map((entry) => (entry.mint === 'T1' && entry.side === 'sell' ? { ...entry, solAmount: 80 } : entry));
    const lucky = WalletScorer.assess(WalletPerformanceAnalyzer.analyze({ swaps, totalSwapTransactions: 26, pairCreatedAtMs: created }), NOW);
    expect(lucky.rejectReasons).toContain('profit comes from one lucky token');
  });

  it('rejects a wallet that has gone quiet', () => {
    const quiet = WalletScorer.assess(stats, NOW + 10 * 24 * HOUR);
    expect(quiet.rejectReasons).toContain('no recent activity');
  });
});
