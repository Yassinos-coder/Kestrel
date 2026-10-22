import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SelfHealingModule } from '../self-healing/self-healing.module';
import { SettingsModule } from '../settings/settings.module';
import { SmartWalletsModule } from '../smart-wallets/smart-wallets.module';
import { TradingModule } from '../trading/trading.module';
import { TelegramCommandService } from './services/telegram-command.service';

@Module({
  imports: [NotificationsModule, SelfHealingModule, SettingsModule, SmartWalletsModule, TradingModule],
  providers: [TelegramCommandService],
})
export class TelegramCommandsModule {}
