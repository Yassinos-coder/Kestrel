import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ApiKey, User } from '../../generated/prisma/client';

export type ApiKeyWithUser = ApiKey & { user: User };

@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({ where: { userId, revokedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  countActive(userId: string): Promise<number> {
    return this.prisma.apiKey.count({ where: { userId, revokedAt: null } });
  }

  findActiveByHash(keyHash: string): Promise<ApiKeyWithUser | null> {
    return this.prisma.apiKey.findFirst({ where: { keyHash, revokedAt: null }, include: { user: true } });
  }

  create(userId: string, name: string, prefix: string, keyHash: string): Promise<ApiKey> {
    return this.prisma.apiKey.create({ data: { userId, name, prefix, keyHash } });
  }

  async touch(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }

  async revoke(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.apiKey.updateMany({ where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return result.count > 0;
  }
}
