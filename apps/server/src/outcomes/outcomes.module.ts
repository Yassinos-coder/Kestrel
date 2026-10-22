import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { MissedOpportunitiesController } from './controllers/missed-opportunities.controller';
import { DecisionOutcomeRepository } from './repositories/decision-outcome.repository';
import { MissedOpportunityService } from './services/missed-opportunity.service';
import { OutcomeTrackerService } from './services/outcome-tracker.service';

@Module({
  imports: [MarketDataModule],
  controllers: [MissedOpportunitiesController],
  providers: [DecisionOutcomeRepository, OutcomeTrackerService, MissedOpportunityService],
  exports: [MissedOpportunityService],
})
export class OutcomesModule {}
