import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';
import { SettingsModule } from '../settings/settings.module';
import { TradingModule } from '../trading/trading.module';
import { SmartWalletsController } from './controllers/smart-wallets.controller';
import { CopyFollowRepository } from './repositories/copy-follow.repository';
import { SmartWalletRepository } from './repositories/smart-wallet.repository';
import { CopyFollowStatsService } from './services/copy-follow-stats.service';
import { CopyTradingService } from './services/copy-trading.service';
import { SmartWalletDiscoveryService } from './services/smart-wallet-discovery.service';

@Module({
  imports: [MarketDataModule, NotificationsModule, RulesModule, SettingsModule, TradingModule],
  controllers: [SmartWalletsController],
  providers: [SmartWalletRepository, CopyFollowRepository, CopyFollowStatsService, SmartWalletDiscoveryService, CopyTradingService],
  exports: [SmartWalletRepository, CopyFollowRepository, CopyFollowStatsService, SmartWalletDiscoveryService],
})
export class SmartWalletsModule {}
