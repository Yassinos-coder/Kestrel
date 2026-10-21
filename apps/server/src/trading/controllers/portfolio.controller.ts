import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards, NotFoundException } from '@nestjs/common';
import type { DashboardSummary, DecisionView, PositionDetail, PositionView } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { TradingMapper } from '../mappers/trading.mapper';
import { DecisionRepository } from '../repositories/decision.repository';
import { PositionRepository } from '../repositories/position.repository';
import { TradeRepository } from '../repositories/trade.repository';
import { GuardianService } from '../services/guardian.service';
import { PortfolioService } from '../services/portfolio.service';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(
    private readonly portfolio: PortfolioService,
    private readonly positions: PositionRepository,
    private readonly trades: TradeRepository,
    private readonly decisions: DecisionRepository,
    private readonly guardian: GuardianService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser): Promise<DashboardSummary> {
    return this.portfolio.getDashboard(user.userId);
  }

  @Get('positions')
  async listPositions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ): Promise<PositionView[]> {
    const filter = status === 'OPEN' || status === 'CLOSED' ? status : undefined;
    const rows = await this.positions.listByUser(user.userId, filter, this.clamp(limit));
    return rows.map(TradingMapper.toPositionView);
  }

  @Get('positions/:id')
  async getPosition(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<PositionDetail> {
    const position = await this.positions.findById(id);
    if (!position || position.userId !== user.userId) throw new NotFoundException('Position not found');
    const trades = await this.trades.listByPosition(id);
    return { ...TradingMapper.toPositionView(position), trades: trades.map(TradingMapper.toTradeView) };
  }

  @Get('decisions')
  async listDecisions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ): Promise<DecisionView[]> {
    const filter = action === 'BUY' || action === 'SKIP' || action === 'REJECTED' ? action : undefined;
    const rows = await this.decisions.listRecent(user.userId, this.clamp(limit), filter);
    return rows.map(TradingMapper.toDecisionView);
  }

  @Post('positions/:id/close')
  async close(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ closed: true }> {
    await this.guardian.closeNow(user.userId, id);
    return { closed: true };
  }

  private clamp(limit: string | undefined): number {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
    return Math.min(parsed, MAX_LIMIT);
  }
}
