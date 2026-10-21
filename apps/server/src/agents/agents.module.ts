import { Module } from '@nestjs/common';
import { AnalystAgentService } from './services/analyst-agent.service';
import { ClaudeService } from './services/claude.service';
import { LearningAgentService } from './services/learning-agent.service';
import { TraderAgentService } from './services/trader-agent.service';

@Module({
  providers: [ClaudeService, AnalystAgentService, TraderAgentService, LearningAgentService],
  exports: [ClaudeService, AnalystAgentService, TraderAgentService, LearningAgentService],
})
export class AgentsModule {}
