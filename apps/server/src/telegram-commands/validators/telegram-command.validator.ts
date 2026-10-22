import type { ParsedCommand } from '../interfaces/parsed-command.interface';

const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class TelegramCommandValidator {
  static parse(text: string): ParsedCommand | null {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return null;
    const [head, ...args] = trimmed.split(/\s+/);
    const name = head.slice(1).split('@')[0].toLowerCase();
    if (!name) return null;
    return { name, args };
  }

  static isSolanaAddress(value: string | undefined): value is string {
    return value !== undefined && SOLANA_ADDRESS_PATTERN.test(value);
  }

  static parseBudget(value: string | undefined, min: number, max: number): number | null | undefined {
    if (value === undefined) return undefined;
    const budget = Number(value);
    if (!Number.isFinite(budget) || budget < min || budget > max) return null;
    return budget;
  }
}
