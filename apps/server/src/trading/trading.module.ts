import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { ChecklistModule } from '../checklist/checklist.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { PortfolioController } from './controllers/portfolio.controller';
import { LiveExecutor } from './executors/live.executor';
import { PaperExecutor } from './executors/paper.executor';
import { DecisionRepository } from './repositories/decision.repository';
import { LessonRepository } from './repositories/lesson.repository';
import { PositionRepository } from './repositories/position.repository';
import { TokenScanRepository } from './repositories/token-scan.repository';
import { TradeRepository } from './repositories/trade.repository';
import { DecisionPipelineService } from './services/decision-pipeline.service';
import { EngineStatusService } from './services/engine-status.service';
import { GuardianService } from './services/guardian.service';
import { LessonService } from './services/lesson.service';
import { PortfolioService } from './services/portfolio.service';
import { PositionService } from './services/position.service';
import { ScoutService } from './services/scout.service';

@Module({
  imports: [AgentsModule, ChecklistModule, MarketDataModule, NotificationsModule, RulesModule, SettingsModule, WalletModule],
  controllers: [PortfolioController],
  providers: [
    PositionRepository,
    TradeRepository,
    DecisionRepository,
    TokenScanRepository,
    LessonRepository,
    PaperExecutor,
    LiveExecutor,
    EngineStatusService,
    PortfolioService,
    LessonService,
    PositionService,
    DecisionPipelineService,
    ScoutService,
    GuardianService,
  ],
  exports: [PositionRepository, TradeRepository, LessonRepository, LessonService, PortfolioService, DecisionRepository],
})
export class TradingModule {}
