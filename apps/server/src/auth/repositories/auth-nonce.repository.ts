import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthNonce } from '../../generated/prisma/client';

@Injectable()
export class AuthNonceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByNonce(nonce: string): Promise<AuthNonce | null> {
    return this.prisma.authNonce.findUnique({ where: { nonce } });
  }

  create(walletAddress: string, nonce: string, expiresAt: Date): Promise<AuthNonce> {
    return this.prisma.authNonce.create({ data: { walletAddress, nonce, expiresAt } });
  }

  async deleteByNonce(nonce: string): Promise<void> {
    await this.prisma.authNonce.deleteMany({ where: { nonce } });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.authNonce.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
