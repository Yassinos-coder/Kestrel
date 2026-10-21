import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../database/prisma.service';
import { SelfHealingService } from './self-healing.service';

const JOB_NAME = 'nightly-self-healing';

@Injectable()
export class SelfHealingScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SelfHealingScheduler.name);
  private running = false;

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly selfHealing: SelfHealingService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>('engine.enabled')) return;

    const expression = this.configService.getOrThrow<string>('engine.reviewCron');
    const timezone = this.configService.getOrThrow<string>('engine.timezone');
    const job = CronJob.from({ cronTime: expression, onTick: () => void this.runForAllUsers(), start: true, timeZone: timezone });
    this.registry.addCronJob(JOB_NAME, job);
    this.logger.log(`Nightly self-healing scheduled "${expression}" (${timezone})`);
  }

  private async runForAllUsers(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const users = await this.prisma.botSettings.findMany({ select: { userId: true } });
      for (const { userId } of users) {
        await this.selfHealing.runReview(userId).catch((error: unknown) => {
          this.logger.error(`Review failed for ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`);
        });
      }
    } finally {
      this.running = false;
    }
  }
}
