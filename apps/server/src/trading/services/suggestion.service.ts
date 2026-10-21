import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SuggestionResult } from '@kestrel/shared';
import { DexScreenerClient } from '../../market-data/clients/dexscreener.client';
import { TokenSnapshotBuilderService } from '../../market-data/services/token-snapshot-builder.service';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import { TradingMapper } from '../mappers/trading.mapper';
import { DecisionRepository } from '../repositories/decision.repository';
import { PositionRepository } from '../repositories/position.repository';
import { TokenScanRepository } from '../repositories/token-scan.repository';
import { DecisionPipelineService } from './decision-pipeline.service';
import { TradingGateService } from './trading-gate.service';

@Injectable()
export class SuggestionService {
  constructor(
    private readonly dexScreener: DexScreenerClient,
    private readonly snapshots: TokenSnapshotBuilderService,
    private readonly scans: TokenScanRepository,
    private readonly pipeline: DecisionPipelineService,
    private readonly settings: SettingsRepository,
    private readonly decisions: DecisionRepository,
    private readonly positions: PositionRepository,
    private readonly gate: TradingGateService,
  ) {}

  async suggest(userId: string, mint: string): Promise<SuggestionResult> {
    if (this.gate.isPaused()) throw new BadRequestException('New entries are paused while the nightly review runs, try again shortly');
    const settings = await this.settings.findByUserId(userId);
    if (!settings) throw new NotFoundException('Settings not found');
    if (await this.positions.hasOpenForMint(userId, mint)) throw new BadRequestException('You already hold an open position in this token');

    const pair = await this.dexScreener.getBestPairForToken(mint);
    if (!pair) throw new NotFoundException('No Solana trading pair was found for this contract address');

    const snapshot = await this.snapshots.build(pair, null);
    const scan = await this.scans.upsert(snapshot.mint, {
      pairAddress: snapshot.pairAddress,
      symbol: snapshot.symbol,
      name: snapshot.name,
      snapshot,
    });
    const startedAt = new Date();
    await this.pipeline.suggest(settings, snapshot, scan);

    const decision = await this.decisions.findLatestForMint(userId, mint);
    if (!decision || decision.createdAt < startedAt) throw new BadRequestException('The token could not be evaluated, try again');
    return { decision: TradingMapper.toDecisionView(decision), positionOpened: decision.action === 'BUY' };
  }
}
