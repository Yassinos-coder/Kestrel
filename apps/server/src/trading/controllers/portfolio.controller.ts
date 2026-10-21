import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import type { DashboardSummary, DecisionView, Paginated, PositionDetail, PositionView } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { DecisionQueryDto, PositionQueryDto } from '../dto/table-query.dto';
import type { PositionContext } from '../interfaces/trading.interface';
import { TradingMapper } from '../mappers/trading.mapper';
import { PositionRepository } from '../repositories/position.repository';
import { TradeRepository } from '../repositories/trade.repository';
import { GuardianService } from '../services/guardian.service';
import { PortfolioService } from '../services/portfolio.service';
import { TableQueryService } from '../services/table-query.service';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(
    private readonly portfolio: PortfolioService,
    private readonly positions: PositionRepository,
    private readonly trades: TradeRepository,
    private readonly tables: TableQueryService,
    private readonly guardian: GuardianService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser): Promise<DashboardSummary> {
    return this.portfolio.getDashboard(user.userId);
  }

  @Get('positions')
  listPositions(@CurrentUser() user: AuthenticatedUser, @Query() query: PositionQueryDto): Promise<Paginated<PositionView>> {
    return this.tables.listPositions(user.userId, query);
  }

  @Get('positions/:id')
  async getPosition(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<PositionDetail> {
    const position = await this.positions.findById(id);
    if (!position || position.userId !== user.userId) throw new NotFoundException('Position not found');
    const trades = await this.trades.listByPosition(id);
    const context = position.context as unknown as PositionContext;
    return { ...TradingMapper.toPositionView(position), trades: trades.map(TradingMapper.toTradeView), exitEvidence: context.exitEvidence ?? null };
  }

  @Get('decisions')
  listDecisions(@CurrentUser() user: AuthenticatedUser, @Query() query: DecisionQueryDto): Promise<Paginated<DecisionView>> {
    return this.tables.listDecisions(user.userId, query);
  }

  @Post('positions/:id/close')
  async close(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ closed: true }> {
    await this.guardian.closeNow(user.userId, id);
    return { closed: true };
  }

}
