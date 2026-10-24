import { Injectable } from '@nestjs/common';
import type { CopyFollowView } from '@kestrel/shared';
import { COPY_DEFAULTS } from '../constants/copy-defaults.constant';
import { SmartWalletMapper } from '../mappers/smart-wallet.mapper';
import { CopyFollowRepository } from '../repositories/copy-follow.repository';
import { CopyFollowStatsService } from './copy-follow-stats.service';
import { SmartWalletDiscoveryService } from './smart-wallet-discovery.service';

const ROUND = 100;

@Injectable()
export class CopyStartService {
  constructor(
    private readonly discovery: SmartWalletDiscoveryService,
    private readonly follows: CopyFollowRepository,
    private readonly stats: CopyFollowStatsService,
  ) {}

  async startByAddress(userId: string, address: string, budgetSol: number = COPY_DEFAULTS.budgetSol, force = false): Promise<CopyFollowView> {
    const wallet = await this.discovery.addManually(address, force);
    const follow = await this.follows.upsert(userId, wallet.id, {
      budgetSol,
      maxPerTradeSol: Math.round(budgetSol * COPY_DEFAULTS.perTradeShare * ROUND) / ROUND,
      maxLossSol: Math.round(budgetSol * COPY_DEFAULTS.lossShare * ROUND) / ROUND,
      minLiquidityUsd: COPY_DEFAULTS.minLiquidityUsd,
      mirrorSells: COPY_DEFAULTS.mirrorSells,
      requireSecuredLp: COPY_DEFAULTS.requireSecuredLp,
    });
    return SmartWalletMapper.toFollowView(follow, await this.stats.compute(follow.id));
  }
}
