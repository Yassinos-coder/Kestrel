import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../database/prisma.service';
import { WeeklyReportService } from './weekly-report.service';

const JOB_NAME = 'weekly-telegram-report';

@Injectable()
export class WeeklyReportScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(WeeklyReportScheduler.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly report: WeeklyReportService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>('engine.enabled')) return;

    const expression = this.configService.getOrThrow<string>('engine.weeklyReportCron');
    const timezone = this.configService.getOrThrow<string>('engine.timezone');
    const job = CronJob.from({ cronTime: expression, onTick: () => void this.sendForAllUsers(), start: true, timeZone: timezone });
    this.registry.addCronJob(JOB_NAME, job);
    this.logger.log(`Weekly report scheduled "${expression}" (${timezone})`);
  }

  private async sendForAllUsers(): Promise<void> {
    const users = await this.prisma.botSettings.findMany({ select: { userId: true } });
    for (const { userId } of users) {
      await this.report.send(userId).catch((error: unknown) => {
        this.logger.error(`Weekly report failed for ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`);
      });
    }
  }
}
