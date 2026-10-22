import { Module } from '@nestjs/common';
import { AiUsageRepository } from './repositories/ai-usage.repository';
import { AnalystAgentService } from './services/analyst-agent.service';
import { LlmService } from './services/llm.service';
import { LearningAgentService } from './services/learning-agent.service';
import { TraderAgentService } from './services/trader-agent.service';

@Module({
  providers: [AiUsageRepository, LlmService, AnalystAgentService, TraderAgentService, LearningAgentService],
  exports: [AiUsageRepository, LlmService, AnalystAgentService, TraderAgentService, LearningAgentService],
})
export class AgentsModule {}
