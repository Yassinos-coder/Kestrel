import { Controller, Get, UseGuards } from '@nestjs/common';
import type { MissedOpportunitiesView } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { MissedOpportunityService } from '../services/missed-opportunity.service';

@Controller('missed-opportunities')
@UseGuards(JwtAuthGuard)
export class MissedOpportunitiesController {
  constructor(private readonly missed: MissedOpportunityService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<MissedOpportunitiesView> {
    return this.missed.getReport(user.userId);
  }
}
