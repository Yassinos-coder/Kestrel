import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { BotSettingsView } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { SettingsService } from '../services/settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<BotSettingsView> {
    return this.settings.getView(user.userId);
  }

  @Patch()
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto): Promise<BotSettingsView> {
    return this.settings.update(user.userId, dto);
  }
}
