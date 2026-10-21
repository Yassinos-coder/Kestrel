import type { ExitEvidence, ExitSeller } from '@kestrel/shared';
import type { PoolTrade } from '../../market-data/interfaces/market-data.interface';
import type { PositionContext } from '../interfaces/trading.interface';

const WINDOW_MS = 10 * 60_000;
const MINUTE_MS = 60_000;
const TOP_SELLERS = 5;
const PERCENT = 100;
const EPSILON = 1e-9;

export class ExitEvidenceBuilder {
  static build(trades: PoolTrade[], context: PositionContext, openedAtMs: number, nowMs: number): ExitEvidence {
    const sinceMs = Math.max(openedAtMs, nowMs - WINDOW_MS);
    const recent = trades.filter((trade) => trade.timestampMs >= sinceMs).sort((a, b) => b.timestampMs - a.timestampMs);
    const sells = recent.filter((trade) => trade.kind === 'sell');
    const buys = recent.filter((trade) => trade.kind === 'buy');

    const byWallet = new Map<string, number>();
    for (const sell of sells) byWallet.set(sell.wallet, (byWallet.get(sell.wallet) ?? 0) + sell.tokenAmount);
    const totalSold = [...byWallet.values()].reduce((sum, amount) => sum + amount, 0);

    const roles = new Map([...byWallet.keys()].map((wallet) => [wallet, ExitEvidenceBuilder.roleOf(wallet, context)]));
    const topSellers: ExitSeller[] = [...byWallet.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_SELLERS)
      .map(([wallet, tokens]) => ({ wallet, role: roles.get(wallet) ?? 'other', tokens, sharePct: (tokens / Math.max(totalSold, EPSILON)) * PERCENT }));

    const countRole = (role: ExitSeller['role']) => [...roles.values()].filter((value) => value === role).length;

    return {
      sellStreak: ExitEvidenceBuilder.leadingSells(recent),
      uniqueSellers: byWallet.size,
      windowMinutes: Math.max(1, Math.round((nowMs - sinceMs) / MINUTE_MS)),
      sellVsBuyVolume: totalSold / Math.max(buys.reduce((sum, trade) => sum + trade.tokenAmount, 0), EPSILON),
      soldByCreator: countRole('creator') > 0,
      topHoldersSelling: countRole('top-holder'),
      earlyBuyersSelling: countRole('early-buyer'),
      otherSellers: countRole('other'),
      topSellers,
    };
  }

  private static roleOf(wallet: string, context: PositionContext): ExitSeller['role'] {
    if (context.creator && wallet === context.creator) return 'creator';
    if (context.topHolderOwners.includes(wallet)) return 'top-holder';
    if (context.earlyBuyerWallets?.includes(wallet)) return 'early-buyer';
    return 'other';
  }

  private static leadingSells(newestFirst: PoolTrade[]): number {
    let streak = 0;
    for (const trade of newestFirst) {
      if (trade.kind !== 'sell') break;
      streak++;
    }
    return streak;
  }
}
