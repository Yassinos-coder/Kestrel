import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';
import { SelfHealingModule } from '../self-healing/self-healing.module';
import { SettingsModule } from '../settings/settings.module';
import { TradingModule } from '../trading/trading.module';
import { ReportsController } from './controllers/reports.controller';
import { WeeklyReportScheduler } from './services/weekly-report.scheduler';
import { WeeklyReportService } from './services/weekly-report.service';

@Module({
  imports: [MarketDataModule, NotificationsModule, RulesModule, SelfHealingModule, SettingsModule, TradingModule],
  controllers: [ReportsController],
  providers: [WeeklyReportService, WeeklyReportScheduler],
})
export class ReportsModule {}
