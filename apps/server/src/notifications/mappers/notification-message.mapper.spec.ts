import { describe, expect, it } from 'vitest';
import { NotificationMessageMapper } from './notification-message.mapper';

describe('NotificationMessageMapper.price', () => {
  it('writes tiny prices in full instead of scientific notation', () => {
    expect(NotificationMessageMapper.price(0.0000011)).toBe('0.0000011');
    expect(NotificationMessageMapper.price(0.00000112345)).toBe('0.000001123');
    expect(NotificationMessageMapper.price(0.000031296)).toBe('0.00003130'.replace(/0+$/, ''));
  });

  it('keeps ordinary prices short', () => {
    expect(NotificationMessageMapper.price(0.5)).toBe('0.5000');
    expect(NotificationMessageMapper.price(0.0123)).toBe('0.0123');
  });

  it('handles zero and extremely small values', () => {
    expect(NotificationMessageMapper.price(0)).toBe('0');
    expect(NotificationMessageMapper.price(1.5e-12)).toBe('0.000000000001500'.replace(/0+$/, ''));
  });
});
