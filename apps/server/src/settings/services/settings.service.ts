import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BotSettingsView } from '@kestrel/shared';
import type { BotSettings } from '../../generated/prisma/client';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { SettingsRepository } from '../repositories/settings.repository';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly configService: ConfigService,
  ) {}

  async getView(userId: string): Promise<BotSettingsView> {
    return this.toView(await this.getRow(userId));
  }

  async update(userId: string, dto: UpdateSettingsDto): Promise<BotSettingsView> {
    const current = await this.getRow(userId);
    await this.assertAllowed(userId, current, dto);
    return this.toView(await this.settings.update(userId, dto));
  }

  isLiveAvailable(): boolean {
    return this.configService.get<boolean>('wallet.liveTradingEnabled') === true && Boolean(this.configService.get<string>('wallet.encryptionKey'));
  }

  isAiAvailable(): boolean {
    return Boolean(this.configService.get<string>('anthropic.apiKey'));
  }

  private async assertAllowed(userId: string, current: BotSettings, dto: UpdateSettingsDto): Promise<void> {
    if (dto.enabled === true && !(await this.settings.isOnboarded(userId))) {
      throw new BadRequestException('Finish onboarding before enabling the bot');
    }
    if (dto.mode && dto.mode !== current.mode) await this.assertModeSwitchAllowed(userId, dto.mode);
  }

  private async assertModeSwitchAllowed(userId: string, target: 'PAPER' | 'LIVE'): Promise<void> {
    if ((await this.settings.countOpenPositions(userId)) > 0) {
      throw new BadRequestException('Close open positions before switching mode');
    }
    if (target === 'PAPER') return;
    if (!this.isLiveAvailable()) throw new BadRequestException('Live trading is not enabled on this server');
    if (!(await this.settings.hasBotWallet(userId))) throw new BadRequestException('Create a bot wallet before going live');
  }

  private async getRow(userId: string): Promise<BotSettings> {
    const row = await this.settings.findByUserId(userId);
    if (!row) throw new NotFoundException('Settings not found');
    return row;
  }

  private toView(row: BotSettings): BotSettingsView {
    return {
      mode: row.mode,
      enabled: row.enabled,
      startingPaperBalanceSol: row.startingPaperBalanceSol,
      paperCashSol: row.paperCashSol,
      autoSweep: row.autoSweep,
      liveBankrollSol: row.liveBankrollSol,
      liveAvailable: this.isLiveAvailable(),
      aiAvailable: this.isAiAvailable(),
    };
  }
}
