import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ReportsModule } from './reports/reports.module';
import { SelfHealingModule } from './self-healing/self-healing.module';
import { SettingsModule } from './settings/settings.module';
import { SmartWalletsModule } from './smart-wallets/smart-wallets.module';
import { TelegramCommandsModule } from './telegram-commands/telegram-commands.module';
import { TradingModule } from './trading/trading.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env', '../../.env'] }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    WalletModule,
    TradingModule,
    SelfHealingModule,
    ReportsModule,
    SmartWalletsModule,
    TelegramCommandsModule,
  ],
})
export class AppModule {}
