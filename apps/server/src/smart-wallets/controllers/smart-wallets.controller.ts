import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { CopyFollowView, Paginated, SmartWalletView, WalletDiscoveryResult } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CopyByAddressDto, FollowDto, SmartWalletQueryDto, UpdateFollowDto } from '../dto/smart-wallets.dto';
import { SmartWalletMapper } from '../mappers/smart-wallet.mapper';
import { CopyFollowRepository, type FollowData, type FollowWithWallet } from '../repositories/copy-follow.repository';
import { SmartWalletRepository } from '../repositories/smart-wallet.repository';
import { CopyFollowStatsService } from '../services/copy-follow-stats.service';
import { CopyStartService } from '../services/copy-start.service';
import { SmartWalletDiscoveryService } from '../services/smart-wallet-discovery.service';
import { SmartWalletQueryUtil } from '../utils/smart-wallet-query.util';

@Controller()
@UseGuards(JwtAuthGuard)
export class SmartWalletsController {
  constructor(
    private readonly wallets: SmartWalletRepository,
    private readonly follows: CopyFollowRepository,
    private readonly stats: CopyFollowStatsService,
    private readonly discovery: SmartWalletDiscoveryService,
    private readonly copyStart: CopyStartService,
  ) {}

  @Get('smart-wallets')
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: SmartWalletQueryDto): Promise<Paginated<SmartWalletView>> {
    const [wallets, follows] = await Promise.all([this.wallets.listActive(), this.follows.listByUser(user.userId)]);
    const byWallet = new Map(follows.map((follow) => [follow.walletId, follow]));
    return SmartWalletQueryUtil.apply(
      wallets.map((wallet) => SmartWalletMapper.toView(wallet, byWallet.get(wallet.id) ?? null)),
      query,
    );
  }

  @Post('smart-wallets/discover')
  discover(): Promise<WalletDiscoveryResult> {
    return this.discovery.runOnce();
  }

  @Post('smart-wallets/:id/follow')
  async follow(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: FollowDto): Promise<CopyFollowView> {
    this.assertConsistent(dto);
    if (!(await this.wallets.findById(id))) throw new NotFoundException('Wallet not found');
    return this.toView(await this.follows.upsert(user.userId, id, dto));
  }

  @Post('copy-follows/by-address')
  copyByAddress(@CurrentUser() user: AuthenticatedUser, @Body() dto: CopyByAddressDto): Promise<CopyFollowView> {
    return this.copyStart.startByAddress(user.userId, dto.address, dto.budgetSol, dto.force);
  }

  @Get('copy-follows')
  async listFollows(@CurrentUser() user: AuthenticatedUser): Promise<CopyFollowView[]> {
    const follows = await this.follows.listByUser(user.userId);
    return Promise.all(follows.map((follow) => this.toView(follow)));
  }

  @Patch('copy-follows/:id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFollowDto): Promise<CopyFollowView> {
    const current = await this.owned(user.userId, id);
    const merged: FollowData = {
      budgetSol: dto.budgetSol ?? current.budgetSol,
      maxPerTradeSol: dto.maxPerTradeSol ?? current.maxPerTradeSol,
      maxLossSol: dto.maxLossSol ?? current.maxLossSol,
      minLiquidityUsd: dto.minLiquidityUsd ?? current.minLiquidityUsd,
      mirrorSells: dto.mirrorSells ?? current.mirrorSells,
      requireSecuredLp: dto.requireSecuredLp ?? current.requireSecuredLp,
    };
    this.assertConsistent(merged);
    return this.toView(await this.follows.update(id, { ...merged, ...(dto.status ? { status: dto.status } : {}) }));
  }

  @Delete('copy-follows/:id')
  async stop(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<CopyFollowView> {
    await this.owned(user.userId, id);
    return this.toView(await this.follows.update(id, { status: 'stopped' }));
  }

  private async owned(userId: string, id: string): Promise<FollowWithWallet> {
    const follow = await this.follows.findById(id);
    if (!follow || follow.userId !== userId) throw new NotFoundException('Copy setup not found');
    return follow;
  }

  private assertConsistent(data: FollowData): void {
    if (data.maxPerTradeSol > data.budgetSol) throw new BadRequestException('The per-trade amount cannot be larger than the total budget');
    if (data.maxLossSol > data.budgetSol) throw new BadRequestException('The loss limit cannot be larger than the total budget');
  }

  private async toView(follow: FollowWithWallet): Promise<CopyFollowView> {
    return SmartWalletMapper.toFollowView(follow, await this.stats.compute(follow.id));
  }
}
