import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { TelegramCommandHandler } from '../../notifications/interfaces/telegram.interface';
import { TelegramLinkService } from '../../notifications/services/telegram-link.service';
import { TelegramService } from '../../notifications/services/telegram.service';
import { SelfHealingService } from '../../self-healing/services/self-healing.service';
import { SettingsService } from '../../settings/services/settings.service';
import { CopyStartService } from '../../smart-wallets/services/copy-start.service';
import { SuggestionService } from '../../trading/services/suggestion.service';
import { MAX_COPY_BUDGET_SOL, MIN_COPY_BUDGET_SOL } from '../../smart-wallets/constants/copy-defaults.constant';
import { TelegramReplyMapper } from '../mappers/telegram-reply.mapper';
import { TelegramCommandValidator } from '../validators/telegram-command.validator';

const FORCE_KEYWORD = 'force';

@Injectable()
export class TelegramCommandService implements OnModuleInit, TelegramCommandHandler {
  private readonly logger = new Logger(TelegramCommandService.name);
  private readonly reviewing = new Set<string>();

  constructor(
    private readonly link: TelegramLinkService,
    private readonly telegram: TelegramService,
    private readonly settings: SettingsService,
    private readonly suggestions: SuggestionService,
    private readonly selfHealing: SelfHealingService,
    private readonly copyStart: CopyStartService,
  ) {}

  onModuleInit(): void {
    this.link.registerCommandHandler(this);
  }

  async handle(userId: string, chatId: string, text: string): Promise<void> {
    const command = TelegramCommandValidator.parse(text);
    if (!command) {
      await this.telegram.send(TelegramReplyMapper.help(), chatId);
      return;
    }

    try {
      await this.dispatch(userId, chatId, command.name, command.args);
    } catch (error) {
      this.logger.warn(`Telegram command /${command.name} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      const message = error instanceof HttpException ? error.message : 'Something went wrong, try again shortly';
      await this.telegram.send(TelegramReplyMapper.failure(message), chatId);
    }
  }

  private async dispatch(userId: string, chatId: string, name: string, args: string[]): Promise<void> {
    if (name === 'pause') return this.setEnabled(userId, chatId, false);
    if (name === 'resume') return this.setEnabled(userId, chatId, true);
    if (name === 'status') return this.status(userId, chatId);
    if (name === 'suggest') return this.suggest(userId, chatId, args[0]);
    if (name === 'copy') return this.copy(userId, chatId, args);
    if (name === 'review') return this.review(userId, chatId);
    if (name === 'help') {
      await this.telegram.send(TelegramReplyMapper.help(), chatId);
      return;
    }
    await this.telegram.send(TelegramReplyMapper.unknown(), chatId);
  }

  private async status(userId: string, chatId: string): Promise<void> {
    await this.telegram.send(TelegramReplyMapper.status(await this.settings.getView(userId)), chatId);
  }

  private async setEnabled(userId: string, chatId: string, enabled: boolean): Promise<void> {
    await this.settings.update(userId, { enabled });
    await this.telegram.send(enabled ? TelegramReplyMapper.resumed() : TelegramReplyMapper.paused(), chatId);
  }

  private async suggest(userId: string, chatId: string, mint: string | undefined): Promise<void> {
    if (!TelegramCommandValidator.isSolanaAddress(mint)) {
      await this.telegram.send(TelegramReplyMapper.usage('/suggest &lt;contract address&gt;'), chatId);
      return;
    }
    await this.telegram.send('🔎 Evaluating token, this can take a minute...', chatId);
    await this.telegram.send(TelegramReplyMapper.suggestion(await this.suggestions.suggest(userId, mint)), chatId);
  }

  private async copy(userId: string, chatId: string, args: string[]): Promise<void> {
    const force = args.slice(1).some((arg) => arg.toLowerCase() === FORCE_KEYWORD);
    const [address, budgetText] = [args[0], args.slice(1).find((arg) => arg.toLowerCase() !== FORCE_KEYWORD)];
    const budget = TelegramCommandValidator.parseBudget(budgetText, MIN_COPY_BUDGET_SOL, MAX_COPY_BUDGET_SOL);
    if (!TelegramCommandValidator.isSolanaAddress(address) || budget === null) {
      await this.telegram.send(
        TelegramReplyMapper.usage(`/copy &lt;wallet address&gt; [budget ${MIN_COPY_BUDGET_SOL}-${MAX_COPY_BUDGET_SOL} SOL] [force]`),
        chatId,
      );
      return;
    }

    await this.telegram.send('🔎 Analysing wallet...', chatId);
    const view = await this.copyStart.startByAddress(userId, address, budget, force);
    await this.telegram.send(TelegramReplyMapper.copyStarted(view, force), chatId);
  }

  private async review(userId: string, chatId: string): Promise<void> {
    if (this.reviewing.has(userId)) {
      await this.telegram.send(TelegramReplyMapper.failure('A review is already running'), chatId);
      return;
    }
    this.reviewing.add(userId);
    await this.telegram.send(TelegramReplyMapper.reviewStarted(), chatId);
    void this.selfHealing
      .runReview(userId)
      .catch(async (error) => {
        this.logger.error(`Telegram review failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        await this.telegram.send(TelegramReplyMapper.failure('The review failed, check the Brain page'), chatId);
      })
      .finally(() => this.reviewing.delete(userId));
  }
}
