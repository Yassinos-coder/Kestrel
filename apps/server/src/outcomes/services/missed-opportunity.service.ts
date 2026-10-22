import { Injectable } from '@nestjs/common';
import type { MissedOpportunitiesView } from '@kestrel/shared';
import { REPORT_WINDOW_HOURS } from '../constants/outcome.constant';
import { MissedOpportunityMapper } from '../mappers/missed-opportunity.mapper';
import { DecisionOutcomeRepository } from '../repositories/decision-outcome.repository';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class MissedOpportunityService {
  constructor(private readonly outcomes: DecisionOutcomeRepository) {}

  async getReport(userId: string): Promise<MissedOpportunitiesView> {
    return MissedOpportunityMapper.toReport(await this.items(userId));
  }

  async getDigest(userId: string): Promise<MissedOpportunitiesView> {
    return MissedOpportunityMapper.toDigest(await this.items(userId));
  }

  private async items(userId: string) {
    const tracked = await this.outcomes.listTrackedSince(userId, new Date(Date.now() - REPORT_WINDOW_HOURS * HOUR_MS));
    return tracked.map((decision) => MissedOpportunityMapper.toItem(decision, decision.outcome));
  }
}
