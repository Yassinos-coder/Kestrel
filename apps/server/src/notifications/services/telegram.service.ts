import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import type { TelegramUpdate } from '../interfaces/telegram.interface';

const TELEGRAM_TIMEOUT_MS = 8_000;

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
}

interface BotInfo {
  username: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string | undefined;
  private readonly defaultChatId: string | undefined;
  private botUsername: string | null = null;

  constructor(configService: ConfigService) {
    this.botToken = configService.get<string>('telegram.botToken') || undefined;
    this.defaultChatId = configService.get<string>('telegram.chatId') || undefined;
    if (!this.botToken) this.logger.warn('TELEGRAM_BOT_TOKEN is not set, Telegram alerts are disabled');
  }

  isConfigured(): boolean {
    return Boolean(this.botToken);
  }

  async send(html: string, chatId: string | null | undefined): Promise<boolean> {
    const target = chatId ?? this.defaultChatId;
    if (!this.botToken || !target) return false;
    try {
      await this.call('sendMessage', { chat_id: target, text: html, parse_mode: 'HTML', disable_web_page_preview: true });
      return true;
    } catch (error) {
      this.logger.warn(`Telegram delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    }
  }

  async getBotUsername(): Promise<string | null> {
    if (this.botUsername) return this.botUsername;
    if (!this.botToken) return null;
    try {
      const info = await this.call<BotInfo>('getMe', {});
      this.botUsername = info.username;
      return this.botUsername;
    } catch {
      return null;
    }
  }

  getUpdates(offset: number): Promise<TelegramUpdate[]> {
    return this.call<TelegramUpdate[]>('getUpdates', { offset, timeout: 0, allowed_updates: ['message'] });
  }

  private async call<T>(method: string, body: object): Promise<T> {
    const response = await HttpFetcher.json<TelegramResponse<T>>(`https://api.telegram.org/bot${this.botToken}/${method}`, {
      method: 'POST',
      body,
      timeoutMs: TELEGRAM_TIMEOUT_MS,
      retries: 1,
    });
    return response.result;
  }
}
