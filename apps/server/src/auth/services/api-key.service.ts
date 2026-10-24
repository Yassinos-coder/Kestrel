import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ApiKeyView, CreatedApiKey } from '@kestrel/shared';
import type { ApiKey } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiKeyUtil } from '../utils/api-key.util';

const MAX_ACTIVE_KEYS = 10;
const TOUCH_INTERVAL_MS = 60_000;

@Injectable()
export class ApiKeyService {
  constructor(private readonly keys: ApiKeyRepository) {}

  async list(userId: string): Promise<ApiKeyView[]> {
    return (await this.keys.listByUser(userId)).map((key) => this.toView(key));
  }

  async authenticate(token: string): Promise<AuthenticatedUser | null> {
    const found = await this.keys.findActiveByHash(ApiKeyUtil.hash(token));
    if (!found) return null;
    const stale = !found.lastUsedAt || Date.now() - found.lastUsedAt.getTime() > TOUCH_INTERVAL_MS;
    if (stale) void this.keys.touch(found.id).catch(() => undefined);
    return { userId: found.userId, walletAddress: found.user.walletAddress };
  }

  async create(userId: string, name: string): Promise<CreatedApiKey> {
    if ((await this.keys.countActive(userId)) >= MAX_ACTIVE_KEYS) {
      throw new BadRequestException(`You can have at most ${MAX_ACTIVE_KEYS} active API keys, revoke one first`);
    }
    const generated = ApiKeyUtil.generate();
    const created = await this.keys.create(userId, name, generated.prefix, generated.hash);
    return { ...this.toView(created), key: generated.key };
  }

  async revoke(userId: string, id: string): Promise<void> {
    if (!(await this.keys.revoke(userId, id))) throw new NotFoundException('API key not found');
  }

  private toView(key: ApiKey): ApiKeyView {
    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    };
  }
}
