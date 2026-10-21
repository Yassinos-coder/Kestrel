import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DashboardSummary, TradingMode } from '@kestrel/shared';
import type { Position } from '../../generated/prisma/client';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import { DayWindow } from '../../shared/utils/day-window.util';
import { WalletService } from '../../wallet/services/wallet.service';
import { TradingMapper } from '../mappers/trading.mapper';
import { DecisionRepository } from '../repositories/decision.repository';
import { PositionRepository } from '../repositories/position.repository';
import { TokenScanRepository } from '../repositories/token-scan.repository';
import { EngineStatusService } from './engine-status.service';

const PERCENT = 100;
const MIN_EQUITY = 0.0001;
const RECENT_DECISIONS = 25;

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
    private readonly decisions: DecisionRepository,
    private readonly scans: TokenScanRepository,
    private readonly wallet: WalletService,
    private readonly engine: EngineStatusService,
    private readonly configService: ConfigService,
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
    const [state, settings, decisions, scannedToday] = await Promise.all([
      this.getState(userId),
      this.settings.findByUserId(userId),
      this.decisions.listRecent(userId, RECENT_DECISIONS),
      this.scans.countSince(this.dayStart()),
    ]);

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
      openPositions: state.openPositions.map(TradingMapper.toPositionView),
      recentDecisions: decisions.map(TradingMapper.toDecisionView),
      engine: {
        scoutLastRunAt: this.engine.scoutLastRunAt?.toISOString() ?? null,
        guardianLastRunAt: this.engine.guardianLastRunAt?.toISOString() ?? null,
        watchlistSize: this.engine.watchlistSize,
        scannedToday,
      },
    };
  }

  private dayStart(): Date {
    return DayWindow.startOfDay(this.configService.getOrThrow<string>('engine.timezone'));
  }
}
