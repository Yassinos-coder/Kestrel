import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CopyFollow, SmartWallet } from '../../generated/prisma/client';

export type FollowWithWallet = CopyFollow & { wallet: SmartWallet };

export interface FollowData {
  budgetSol: number;
  maxPerTradeSol: number;
  maxLossSol: number;
  minLiquidityUsd: number;
  mirrorSells: boolean;
  requireSecuredLp: boolean;
}

@Injectable()
export class CopyFollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(userId: string, walletId: string, data: FollowData): Promise<FollowWithWallet> {
    return this.prisma.copyFollow.upsert({
      where: { userId_walletId: { userId, walletId } },
      create: { userId, walletId, ...data },
      update: { ...data, status: 'active' },
      include: { wallet: true },
    });
  }

  findById(id: string): Promise<FollowWithWallet | null> {
    return this.prisma.copyFollow.findUnique({ where: { id }, include: { wallet: true } });
  }

  listByUser(userId: string): Promise<FollowWithWallet[]> {
    return this.prisma.copyFollow.findMany({ where: { userId }, include: { wallet: true }, orderBy: { createdAt: 'desc' } });
  }

  listWithStatus(status: string): Promise<FollowWithWallet[]> {
    return this.prisma.copyFollow.findMany({ where: { status }, include: { wallet: true } });
  }

  update(id: string, data: Partial<FollowData> & { status?: string }): Promise<FollowWithWallet> {
    return this.prisma.copyFollow.update({ where: { id }, data, include: { wallet: true } });
  }

  async setCursor(id: string, signature: string): Promise<void> {
    await this.prisma.copyFollow.update({ where: { id }, data: { lastSignature: signature } });
  }
}
