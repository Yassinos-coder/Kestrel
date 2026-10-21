import { Injectable } from '@nestjs/common';
import { PositionRepository } from '../../trading/repositories/position.repository';

const PERCENT = 100;

export interface FollowStats {
  deployedSol: number;
  realizedPnlSol: number;
  openPnlSol: number;
  openPositions: number;
  closedTrades: number;
  winRatePct: number;
}

@Injectable()
export class CopyFollowStatsService {
  constructor(private readonly positions: PositionRepository) {}

  async compute(followId: string): Promise<FollowStats> {
    const positions = await this.positions.listByFollow(followId);
    const open = positions.filter((position) => position.status === 'OPEN');
    const closed = positions.filter((position) => position.status === 'CLOSED');
    const wins = closed.filter((position) => position.realizedSol > position.entrySol);

    return {
      deployedSol: open.reduce((sum, position) => sum + position.entrySol, 0),
      realizedPnlSol: closed.reduce((sum, position) => sum + position.realizedSol - position.entrySol, 0),
      openPnlSol: open.reduce((sum, position) => sum + position.realizedSol + position.tokensHeld * position.lastPriceSol - position.entrySol, 0),
      openPositions: open.length,
      closedTrades: closed.length,
      winRatePct: closed.length ? (wins.length / closed.length) * PERCENT : 0,
    };
  }
}
