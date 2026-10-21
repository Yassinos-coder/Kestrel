import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DashboardSummary, ProfitabilityView, TradingMode } from '@kestrel/shared';
import { AiUsageRepository } from '../../agents/repositories/ai-usage.repository';
import type { Position } from '../../generated/prisma/client';
import { SolPriceService } from '../../market-data/services/sol-price.service';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import { DayWindow } from '../../shared/utils/day-window.util';
import { WalletService } from '../../wallet/services/wallet.service';
import { PositionRepository } from '../repositories/position.repository';
import { TradeRepository } from '../repositories/trade.repository';
import { TokenScanRepository } from '../repositories/token-scan.repository';
import { EngineStatusService } from './engine-status.service';
import { TradingGateService } from './trading-gate.service';

const PERCENT = 100;
const MIN_EQUITY = 0.0001;

export interface PortfolioState {
  mode: TradingMode;
  startingBalanceSol: number;
  cashSol: number;
  openValueSol: number;
  equitySol: number;
  openPositions: Position[];
  dailyPnlSol: number;
  dailyLossPct: number;
  realizedPnlSol: number;
  closedTrades: number;
  winRatePct: number;
}

@Injectable()
export class PortfolioService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly positions: PositionRepository,
    private readonly scans: TokenScanRepository,
    private readonly wallet: WalletService,
    private readonly engine: EngineStatusService,
    private readonly gate: TradingGateService,
    private readonly configService: ConfigService,
    private readonly aiUsage: AiUsageRepository,
    private readonly trades: TradeRepository,
    private readonly solPrice: SolPriceService,
  ) {}

  async getState(userId: string): Promise<PortfolioState> {
    const settings = await this.settings.findByUserId(userId);
    if (!settings) throw new NotFoundException('Settings not found');

    const [open, closedToday, closedAll] = await Promise.all([
      this.positions.findOpenByUser(userId),
      this.positions.listClosedSince(userId, this.dayStart()),
      this.positions.listClosedAll(userId),
    ]);
    const mode = settings.mode;
    const openInMode = open.filter((position) => position.mode === mode);
    const cashSol = mode === 'PAPER' ? settings.paperCashSol : await this.wallet.getBalanceSol(userId).catch(() => 0);

    const openValueSol = openInMode.reduce((sum, position) => sum + position.tokensHeld * position.lastPriceSol, 0);
    const equitySol = cashSol + openValueSol;
    const openPnl = openInMode.reduce((sum, p) => sum + p.realizedSol + p.tokensHeld * p.lastPriceSol - p.entrySol, 0);
    const closedTodayPnl = closedToday.filter((p) => p.mode === mode).reduce((sum, p) => sum + p.realizedSol - p.entrySol, 0);
    const dailyPnlSol = closedTodayPnl + openPnl;
    const startEquity = Math.max(equitySol - dailyPnlSol, MIN_EQUITY);

    const closedInMode = closedAll.filter((position) => position.mode === mode);
    const wins = closedInMode.filter((position) => position.realizedSol > position.entrySol).length;

    return {
      mode,
      startingBalanceSol: settings.startingPaperBalanceSol,
      cashSol,
      openValueSol,
      equitySol,
      openPositions: openInMode,
      dailyPnlSol,
      dailyLossPct: dailyPnlSol < 0 ? (-dailyPnlSol / startEquity) * PERCENT : 0,
      realizedPnlSol: closedInMode.reduce((sum, p) => sum + p.realizedSol - p.entrySol, 0),
      closedTrades: closedInMode.length,
      winRatePct: closedInMode.length ? (wins / closedInMode.length) * PERCENT : 0,
    };
  }

  async getDashboard(userId: string): Promise<DashboardSummary> {
    const [state, settings, scannedToday] = await Promise.all([
      this.getState(userId),
      this.settings.findByUserId(userId),
      this.scans.countSince(this.dayStart()),
    ]);
    const profitability = await this.getProfitability(userId, state);

    return {
      mode: state.mode,
      enabled: settings?.enabled ?? false,
      equitySol: state.equitySol,
      cashSol: state.cashSol,
      openValueSol: state.openValueSol,
      startingBalanceSol: state.startingBalanceSol,
      realizedPnlSol: state.realizedPnlSol,
      todayPnlSol: state.dailyPnlSol,
      winRatePct: state.winRatePct,
      closedTrades: state.closedTrades,
      openPositionCount: state.openPositions.length,
      profitability,
      engine: {
        scoutLastRunAt: this.engine.scoutLastRunAt?.toISOString() ?? null,
        guardianLastRunAt: this.engine.guardianLastRunAt?.toISOString() ?? null,
        entriesPausedReason: this.gate.getPauseReason(),
        watchlistSize: this.engine.watchlistSize,
        scannedToday,
      },
    };
  }

  private async getProfitability(userId: string, state: PortfolioState): Promise<ProfitabilityView> {
    const [ai, aiToday, tradingFeesSol, solUsd] = await Promise.all([
      this.aiUsage.totals(userId),
      this.aiUsage.totals(userId, this.dayStart()),
      this.trades.sumFees(userId),
      this.solPrice.getUsd(),
    ]);
    const aiCostSol = solUsd > 0 ? ai.costUsd / solUsd : 0;
    const aiTodaySol = solUsd > 0 ? aiToday.costUsd / solUsd : 0;
    const netProfitSol = state.realizedPnlSol - aiCostSol;

    return {
      tradingPnlSol: state.realizedPnlSol,
      tradingFeesSol,
      aiCostSol,
      aiCostUsd: ai.costUsd,
      aiCalls: ai.calls,
      netProfitSol,
      todayNetProfitSol: state.dailyPnlSol - aiTodaySol,
      profitable: netProfitSol > 0,
    };
  }

  private dayStart(): Date {
    return DayWindow.startOfDay(this.configService.getOrThrow<string>('engine.timezone'));
  }
}
