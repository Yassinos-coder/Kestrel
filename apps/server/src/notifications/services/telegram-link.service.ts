import { randomBytes } from 'node:crypto';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import type { TelegramStatus } from '@kestrel/shared';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import type { TelegramUpdate } from '../interfaces/telegram.interface';
import { TelegramService } from './telegram.service';

const POLL_INTERVAL_MS = 4_000;
const CODE_BYTES = 9;
const START_PREFIX = '/start ';
const HELP_MESSAGE = 'Open the Kestrel dashboard, go to Settings and press "Connect Telegram" to link this chat.';
const EXPIRED_MESSAGE = 'That link has expired. Press "Connect Telegram" in Kestrel Settings again.';
const CONNECTED_MESSAGE =
  '✅ <b>Connected.</b> Kestrel will message you here for buys, sells, low funds and the nightly review.';

@Injectable()
export class TelegramLinkService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramLinkService.name);
  private timer: NodeJS.Timeout | null = null;
  private polling = false;
  private nextOffset = 0;

  constructor(
    private readonly telegram: TelegramService,
    private readonly settings: SettingsRepository,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.telegram.isConfigured()) return;
    this.timer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async getStatus(userId: string): Promise<TelegramStatus> {
    const chatId = await this.settings.getTelegramChatId(userId);
    return {
      configured: this.telegram.isConfigured(),
      linked: chatId !== null,
      botUsername: await this.telegram.getBotUsername(),
      linkUrl: null,
    };
  }

  async createLink(userId: string): Promise<TelegramStatus> {
    const botUsername = await this.telegram.getBotUsername();
    const code = randomBytes(CODE_BYTES).toString('hex');
    await this.settings.setTelegramLinkCode(userId, code);
    return {
      configured: this.telegram.isConfigured(),
      linked: false,
      botUsername,
      linkUrl: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    await this.settings.clearTelegram(userId);
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const updates = await this.telegram.getUpdates(this.nextOffset);
      for (const update of updates) {
        this.nextOffset = update.update_id + 1;
        await this.handle(update);
      }
    } catch (error) {
      this.logger.debug(`Telegram poll failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.polling = false;
    }
  }

  private async handle(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message?.text || message.chat.type !== 'private') return;
    const chatId = String(message.chat.id);

    if (!message.text.startsWith(START_PREFIX)) {
      await this.telegram.send(HELP_MESSAGE, chatId);
      return;
    }

    const userId = await this.settings.findUserIdByTelegramCode(message.text.slice(START_PREFIX.length).trim());
    if (!userId) {
      await this.telegram.send(EXPIRED_MESSAGE, chatId);
      return;
    }

    await this.settings.completeTelegramLink(userId, chatId);
    await this.telegram.send(CONNECTED_MESSAGE, chatId);
  }
}
