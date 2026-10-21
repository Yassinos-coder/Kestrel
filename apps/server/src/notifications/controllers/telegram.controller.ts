import { BadRequestException, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { TelegramStatus } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { NotificationService } from '../services/notification.service';
import { TelegramLinkService } from '../services/telegram-link.service';

@Controller('telegram')
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(
    private readonly link: TelegramLinkService,
    private readonly notifications: NotificationService,
  ) {}

  @Get()
  status(@CurrentUser() user: AuthenticatedUser): Promise<TelegramStatus> {
    return this.link.getStatus(user.userId);
  }

  @Post('link')
  createLink(@CurrentUser() user: AuthenticatedUser): Promise<TelegramStatus> {
    return this.link.createLink(user.userId);
  }

  @Post('test')
  async test(@CurrentUser() user: AuthenticatedUser): Promise<{ sent: true }> {
    if (!(await this.notifications.sendTest(user.userId))) {
      throw new BadRequestException('Could not send. Connect Telegram first and check the bot token on the server.');
    }
    return { sent: true };
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: AuthenticatedUser): Promise<{ disconnected: true }> {
    await this.link.disconnect(user.userId);
    return { disconnected: true };
  }
}
