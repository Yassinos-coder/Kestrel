import { describe, expect, it } from 'vitest';
import { TelegramCommandValidator } from './telegram-command.validator';

const ADDRESS = 'So11111111111111111111111111111111111111112';

describe('TelegramCommandValidator', () => {
  it('parses a command with arguments', () => {
    expect(TelegramCommandValidator.parse(`/copy ${ADDRESS} 2`)).toEqual({ name: 'copy', args: [ADDRESS, '2'] });
  });

  it('strips the bot username and lowercases', () => {
    expect(TelegramCommandValidator.parse('/Pause@KestrelBot')).toEqual({ name: 'pause', args: [] });
  });

  it('ignores plain text', () => {
    expect(TelegramCommandValidator.parse('hello')).toBeNull();
    expect(TelegramCommandValidator.parse('/')).toBeNull();
  });

  it('validates solana addresses', () => {
    expect(TelegramCommandValidator.isSolanaAddress(ADDRESS)).toBe(true);
    expect(TelegramCommandValidator.isSolanaAddress('not-an-address')).toBe(false);
    expect(TelegramCommandValidator.isSolanaAddress(undefined)).toBe(false);
  });

  it('parses budgets within bounds', () => {
    expect(TelegramCommandValidator.parseBudget(undefined, 0.1, 10)).toBeUndefined();
    expect(TelegramCommandValidator.parseBudget('2', 0.1, 10)).toBe(2);
    expect(TelegramCommandValidator.parseBudget('0.01', 0.1, 10)).toBeNull();
    expect(TelegramCommandValidator.parseBudget('abc', 0.1, 10)).toBeNull();
  });
});
