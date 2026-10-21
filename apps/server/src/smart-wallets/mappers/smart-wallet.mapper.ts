import type { CopyFollowView, SmartWalletView, WalletStatsView, WalletTier } from '@kestrel/shared';
import type { SmartWallet } from '../../generated/prisma/client';
import type { FollowWithWallet } from '../repositories/copy-follow.repository';
import type { FollowStats } from '../services/copy-follow-stats.service';

export class SmartWalletMapper {
  static toView(wallet: SmartWallet, follow: { id: string; status: string } | null): SmartWalletView {
    return {
      id: wallet.id,
      address: wallet.address,
      tier: wallet.tier as WalletTier,
      score: wallet.score,
      stats: wallet.stats as unknown as WalletStatsView,
      lastActiveAt: wallet.lastActiveAt?.toISOString() ?? null,
      followId: follow?.id ?? null,
      followStatus: follow?.status ?? null,
    };
  }

  static toFollowView(follow: FollowWithWallet, stats: FollowStats): CopyFollowView {
    return {
      id: follow.id,
      walletId: follow.walletId,
      walletAddress: follow.wallet.address,
      tier: follow.wallet.tier as WalletTier,
      score: follow.wallet.score,
      budgetSol: follow.budgetSol,
      maxPerTradeSol: follow.maxPerTradeSol,
      maxLossSol: follow.maxLossSol,
      minLiquidityUsd: follow.minLiquidityUsd,
      mirrorSells: follow.mirrorSells,
      requireSecuredLp: follow.requireSecuredLp,
      status: follow.status,
      deployedSol: stats.deployedSol,
      realizedPnlSol: stats.realizedPnlSol,
      openPnlSol: stats.openPnlSol,
      openPositions: stats.openPositions,
      closedTrades: stats.closedTrades,
      winRatePct: stats.winRatePct,
      createdAt: follow.createdAt.toISOString(),
    };
  }
}
