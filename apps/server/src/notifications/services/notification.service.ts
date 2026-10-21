import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import type { BuyAlert, DailyLossAlert, LowFundsAlert, ReviewAlert, SellAlert } from '../interfaces/alerts.interface';
import { NotificationMessageMapper } from '../mappers/notification-message.mapper';
import { TelegramService } from './telegram.service';

const THROTTLE_MS = 6 * 60 * 60 * 1000;
const TEST_MESSAGE =
  '✅ <b>Kestrel is connected</b>\nYou will get a message here for every buy, sell, low balance warning and nightly review.';

@Injectable()
export class NotificationService {
  private readonly lastSent = new Map<string, number>();

  constructor(
    private readonly telegram: TelegramService,
    private readonly settings: SettingsRepository,
  ) {}

  async notifyBuy(userId: string, alert: BuyAlert): Promise<void> {
    await this.send(userId, NotificationMessageMapper.buy(alert));
  }

  async notifySell(userId: string, alert: SellAlert): Promise<void> {
    await this.send(userId, NotificationMessageMapper.sell(alert));
  }

  async notifyReview(userId: string, alert: ReviewAlert): Promise<void> {
    await this.send(userId, NotificationMessageMapper.review(alert));
  }

  async notifyLowFunds(userId: string, alert: LowFundsAlert): Promise<void> {
    if (this.isThrottled(`low-funds:${userId}`)) return;
    await this.send(userId, NotificationMessageMapper.lowFunds(alert));
  }

  async notifyDailyLoss(userId: string, alert: DailyLossAlert): Promise<void> {
    if (this.isThrottled(`daily-loss:${userId}:${new Date().toISOString().slice(0, 10)}`)) return;
    await this.send(userId, NotificationMessageMapper.dailyLoss(alert));
  }

  async notifyWarning(userId: string, key: string, html: string): Promise<void> {
    if (this.isThrottled(`warning:${userId}:${key}`)) return;
    await this.send(userId, html);
  }

  sendTest(userId: string): Promise<boolean> {
    return this.send(userId, TEST_MESSAGE);
  }

  private async send(userId: string, html: string): Promise<boolean> {
    const chatId = await this.settings.getTelegramChatId(userId);
    return this.telegram.send(html, chatId);
  }

  private isThrottled(key: string): boolean {
    const now = Date.now();
    const last = this.lastSent.get(key);
    if (last && now - last < THROTTLE_MS) return true;
    this.lastSent.set(key, now);
    return false;
  }
}
