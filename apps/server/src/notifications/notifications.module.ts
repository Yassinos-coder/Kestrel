import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { TelegramController } from './controllers/telegram.controller';
import { NotificationService } from './services/notification.service';
import { TelegramLinkService } from './services/telegram-link.service';
import { TelegramService } from './services/telegram.service';

@Module({
  imports: [SettingsModule],
  controllers: [TelegramController],
  providers: [TelegramService, NotificationService, TelegramLinkService],
  exports: [NotificationService, TelegramService, TelegramLinkService],
})
export class NotificationsModule {}
