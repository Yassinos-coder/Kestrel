import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { BotWallet } from '../../generated/prisma/client';
import type { EncryptedSecret } from '../interfaces/encrypted-secret.interface';

@Injectable()
export class BotWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<BotWallet | null> {
    return this.prisma.botWallet.findUnique({ where: { userId } });
  }

  create(userId: string, publicKey: string, secret: EncryptedSecret): Promise<BotWallet> {
    return this.prisma.botWallet.create({ data: { userId, publicKey, ...secret } });
  }

  async recordSweep(userId: string, amountSol: number, signature: string): Promise<void> {
    await this.prisma.profitSweep.create({ data: { userId, amountSol, signature } });
  }
}
