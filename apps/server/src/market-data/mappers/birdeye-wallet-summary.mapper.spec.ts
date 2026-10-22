import { describe, expect, it } from 'vitest';
import { BirdeyeWalletSummaryMapper } from './birdeye-wallet-summary.mapper';

describe('BirdeyeWalletSummaryMapper', () => {
  it('maps a wallet profit summary', () => {
    const summary = BirdeyeWalletSummaryMapper.toSummary({
      data: {
        summary: {
          unique_tokens: 35,
          counts: { total_trade: 233, total_win: 10, total_loss: 15, win_rate: 0.4 },
          pnl: { realized_profit_usd: 169070.35, realized_profit_percent: 464.63 },
        },
      },
    });
    expect(summary).toEqual({
      uniqueTokens: 35,
      trades: 233,
      wins: 10,
      losses: 15,
      winRatePct: 40,
      realizedProfitUsd: 169070.35,
      realizedProfitPct: 464.63,
    });
  });

  it('returns null when the response has no summary', () => {
    expect(BirdeyeWalletSummaryMapper.toSummary({})).toBeNull();
    expect(BirdeyeWalletSummaryMapper.toSummary({ data: { summary: {} } })).toBeNull();
  });
});
