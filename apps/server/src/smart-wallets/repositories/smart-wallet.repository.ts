import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { SmartWallet } from '../../generated/prisma/client';
import type { WalletAssessment } from '../interfaces/wallet.interface';

const ACTIVE = 'active';
const STALE = 'stale';
const MAX_LISTED = 2_000;

@Injectable()
export class SmartWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(address: string, assessment: WalletAssessment): Promise<SmartWallet> {
    const data = {
      score: assessment.score,
      tier: assessment.tier ?? 'C',
      stats: assessment.stats as unknown as object,
      status: ACTIVE,
      lastActiveAt: assessment.stats.lastActiveMs ? new Date(assessment.stats.lastActiveMs) : null,
    };
    return this.prisma.smartWallet.upsert({ where: { address }, create: { address, ...data }, update: data });
  }

  listActive(): Promise<SmartWallet[]> {
    return this.prisma.smartWallet.findMany({ where: { status: ACTIVE }, orderBy: { score: 'desc' }, take: MAX_LISTED });
  }

  findById(id: string): Promise<SmartWallet | null> {
    return this.prisma.smartWallet.findUnique({ where: { id } });
  }

  listOldestUpdated(take: number): Promise<SmartWallet[]> {
    return this.prisma.smartWallet.findMany({ where: { status: ACTIVE }, orderBy: { updatedAt: 'asc' }, take });
  }

  async markStale(address: string): Promise<void> {
    await this.prisma.smartWallet.updateMany({ where: { address }, data: { status: STALE } });
  }
}
