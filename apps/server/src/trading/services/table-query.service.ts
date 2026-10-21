import { Injectable } from '@nestjs/common';
import type { DecisionView, Paginated, PositionView } from '@kestrel/shared';
import { DecisionQueryDto, PositionQueryDto } from '../dto/table-query.dto';
import { TradingMapper } from '../mappers/trading.mapper';
import { DecisionRepository } from '../repositories/decision.repository';
import { PositionRepository } from '../repositories/position.repository';
import { PositionQueryUtil } from '../utils/position-query.util';

@Injectable()
export class TableQueryService {
  constructor(
    private readonly positions: PositionRepository,
    private readonly decisions: DecisionRepository,
  ) {}

  async listPositions(userId: string, query: PositionQueryDto): Promise<Paginated<PositionView>> {
    const rows = await this.positions.listAllByUser(userId);
    return PositionQueryUtil.apply(rows.map(TradingMapper.toPositionView), query);
  }

  async listDecisions(userId: string, query: DecisionQueryDto): Promise<Paginated<DecisionView>> {
    const page = await this.decisions.listPage(userId, query);
    return { ...page, items: page.items.map(TradingMapper.toDecisionView) };
  }
}
