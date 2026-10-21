import { Module } from '@nestjs/common';
import { AiUsageRepository } from './repositories/ai-usage.repository';
import { AnalystAgentService } from './services/analyst-agent.service';
import { ClaudeService } from './services/claude.service';
import { LearningAgentService } from './services/learning-agent.service';
import { TraderAgentService } from './services/trader-agent.service';

@Module({
  providers: [AiUsageRepository, ClaudeService, AnalystAgentService, TraderAgentService, LearningAgentService],
  exports: [AiUsageRepository, ClaudeService, AnalystAgentService, TraderAgentService, LearningAgentService],
})
export class AgentsModule {}
