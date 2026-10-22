import type { BotSettingsView, CopyFollowView, SuggestionResult } from '@kestrel/shared';

const PERCENT = 100;

export class TelegramReplyMapper {
  static help(): string {
    return [
      '<b>Kestrel commands</b>',
      '/status - bot state',
      '/pause - stop opening new trades',
      '/resume - start trading again',
      '/suggest &lt;contract&gt; - have the AI evaluate a token',
      '/copy &lt;wallet&gt; [budget SOL] - copy a wallet',
      '/review - run the review now',
    ].join('\n');
  }

  static status(settings: BotSettingsView): string {
    return [
      `<b>Kestrel is ${settings.enabled ? 'trading' : 'paused'}</b>`,
      `Mode: ${settings.mode}`,
      `Paper cash: ${settings.paperCashSol.toFixed(3)} SOL`,
      `AI: ${settings.aiAvailable ? 'available' : 'not configured'}`,
    ].join('\n');
  }

  static paused(): string {
    return '⏸ <b>Trading paused.</b> No new entries. Open positions are still managed. Send /resume to start again.';
  }

  static resumed(): string {
    return '▶️ <b>Trading started.</b>';
  }

  static suggestion(result: SuggestionResult): string {
    const { decision } = result;
    const confidence = decision.confidence === null ? '' : ` (${Math.round(decision.confidence * PERCENT)}% confidence)`;
    return [
      `<b>${TelegramReplyMapper.escape(decision.symbol)}</b>: ${decision.action}${confidence}`,
      result.positionOpened ? `Position opened${decision.sizeSol ? ` for ${decision.sizeSol} SOL` : ''}.` : 'No position opened.',
      decision.reasoning ? TelegramReplyMapper.escape(decision.reasoning) : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  static copyStarted(follow: CopyFollowView): string {
    return [
      `📋 <b>Copying ${follow.walletAddress.slice(0, 4)}...${follow.walletAddress.slice(-4)}</b> (tier ${follow.tier}, score ${Math.round(follow.score)})`,
      `Budget ${follow.budgetSol} SOL, ${follow.maxPerTradeSol} SOL per trade, stops at ${follow.maxLossSol} SOL loss.`,
      follow.mirrorSells ? 'Sells are mirrored.' : 'Sells are not mirrored.',
    ].join('\n');
  }

  static reviewStarted(): string {
    return '🔎 Review started. New entries are paused until it finishes, and you will get the result here.';
  }

  static failure(message: string): string {
    return `⚠️ ${TelegramReplyMapper.escape(message)}`;
  }

  static unknown(): string {
    return 'Unknown command. Send /help for the list.';
  }

  static usage(text: string): string {
    return `Usage: ${text}`;
  }

  private static escape(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
