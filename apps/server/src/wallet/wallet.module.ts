import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletController } from './controllers/wallet.controller';
import { BotWalletRepository } from './repositories/bot-wallet.repository';
import { WalletService } from './services/wallet.service';

@Module({
  imports: [MarketDataModule, SettingsModule],
  controllers: [WalletController],
  providers: [BotWalletRepository, WalletService],
  exports: [WalletService],
})
export class WalletModule {}
