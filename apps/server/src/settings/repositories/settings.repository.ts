import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { BotSettings } from '../../generated/prisma/client';
import type { SettingsUpdate } from '../interfaces/settings-update.interface';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<BotSettings | null> {
    return this.prisma.botSettings.findUnique({ where: { userId } });
  }

  listEnabled(): Promise<BotSettings[]> {
    return this.prisma.botSettings.findMany({ where: { enabled: true } });
  }

  update(userId: string, data: SettingsUpdate): Promise<BotSettings> {
    return this.prisma.botSettings.update({ where: { userId }, data });
  }

  async adjustPaperCash(userId: string, deltaSol: number): Promise<void> {
    await this.prisma.botSettings.update({ where: { userId }, data: { paperCashSol: { increment: deltaSol } } });
  }

  async getTelegramChatId(userId: string): Promise<string | null> {
    const row = await this.prisma.botSettings.findUnique({ where: { userId }, select: { telegramChatId: true } });
    return row?.telegramChatId ?? null;
  }

  async setTelegramLinkCode(userId: string, code: string): Promise<void> {
    await this.prisma.botSettings.update({ where: { userId }, data: { telegramLinkCode: code } });
  }

  async findUserIdByTelegramCode(code: string): Promise<string | null> {
    const row = await this.prisma.botSettings.findUnique({ where: { telegramLinkCode: code }, select: { userId: true } });
    return row?.userId ?? null;
  }

  async completeTelegramLink(userId: string, chatId: string): Promise<void> {
    await this.prisma.botSettings.update({ where: { userId }, data: { telegramChatId: chatId, telegramLinkCode: null } });
  }

  async clearTelegram(userId: string): Promise<void> {
    await this.prisma.botSettings.update({ where: { userId }, data: { telegramChatId: null, telegramLinkCode: null } });
  }

  async hasBotWallet(userId: string): Promise<boolean> {
    return (await this.prisma.botWallet.count({ where: { userId } })) > 0;
  }

  async countOpenPositions(userId: string): Promise<number> {
    return this.prisma.position.count({ where: { userId, status: 'OPEN' } });
  }

  async isOnboarded(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { onboardedAt: true } });
    return Boolean(user?.onboardedAt);
  }
}
