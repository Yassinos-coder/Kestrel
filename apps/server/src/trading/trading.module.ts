import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { ChecklistModule } from '../checklist/checklist.module';
import { ForensicsModule } from '../forensics/forensics.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { SuggestionController } from './controllers/suggestion.controller';
import { SuggestionService } from './services/suggestion.service';
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
import { TableQueryService } from './services/table-query.service';
import { TradingGateService } from './services/trading-gate.service';

@Module({
  imports: [AgentsModule, ChecklistModule, ForensicsModule, MarketDataModule, NotificationsModule, RulesModule, SettingsModule, WalletModule],
  controllers: [PortfolioController, SuggestionController],
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
    TableQueryService,
    TradingGateService,
    DecisionPipelineService,
    ScoutService,
    GuardianService,
    SuggestionService,
  ],
  exports: [
    PositionRepository,
    TradeRepository,
    LessonRepository,
    LessonService,
    PortfolioService,
    DecisionRepository,
    TokenScanRepository,
    PositionService,
    TradingGateService,
  ],
})
export class TradingModule {}
