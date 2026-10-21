import { BadRequestException, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { WeeklyReportService } from '../services/weekly-report.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly weekly: WeeklyReportService) {}

  @Post('weekly')
  async sendWeekly(@CurrentUser() user: AuthenticatedUser): Promise<{ sent: true }> {
    if (!(await this.weekly.send(user.userId))) {
      throw new BadRequestException('Could not send. Connect Telegram first on the Settings page.');
    }
    return { sent: true };
  }
}
