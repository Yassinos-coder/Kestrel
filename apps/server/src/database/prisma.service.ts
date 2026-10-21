import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const CONNECTION_TIMEOUT_MS = 5_000;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');

  constructor(configService: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('database.url'),
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
        idleTimeoutMillis: IDLE_TIMEOUT_MS,
        keepAlive: true,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Failed to connect to Postgres');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
