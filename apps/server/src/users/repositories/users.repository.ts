import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { User } from '../../generated/prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  upsertByWallet(walletAddress: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress, settings: { create: {} } },
    });
  }

  completeOnboarding(id: string, displayName: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { displayName, onboardedAt: new Date() } });
  }

  async setStartingPaperBalance(userId: string, balanceSol: number): Promise<void> {
    await this.prisma.botSettings.update({
      where: { userId },
      data: { startingPaperBalanceSol: balanceSol, paperCashSol: balanceSol },
    });
  }

  async countPaperPositions(userId: string): Promise<number> {
    return this.prisma.position.count({ where: { userId, mode: 'PAPER' } });
  }
}
