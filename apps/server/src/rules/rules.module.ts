import { Module } from '@nestjs/common';
import { RuleSetRepository } from './repositories/rule-set.repository';
import { RuleSetService } from './services/rule-set.service';

@Module({
  providers: [RuleSetRepository, RuleSetService],
  exports: [RuleSetService],
})
export class RulesModule {}
