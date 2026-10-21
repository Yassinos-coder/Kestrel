import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentsModule } from '../agents/agents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';
import { TradingModule } from '../trading/trading.module';
import { BrainController } from './controllers/brain.controller';
import { ReviewRunRepository } from './repositories/review-run.repository';
import { ReviewAgentService } from './services/review-agent.service';
import { SelfHealingScheduler } from './services/self-healing.scheduler';
import { SelfHealingService } from './services/self-healing.service';

@Module({
  imports: [ScheduleModule.forRoot(), AgentsModule, NotificationsModule, RulesModule, TradingModule],
  controllers: [BrainController],
  providers: [ReviewRunRepository, ReviewAgentService, SelfHealingService, SelfHealingScheduler],
  exports: [ReviewRunRepository],
})
export class SelfHealingModule {}
