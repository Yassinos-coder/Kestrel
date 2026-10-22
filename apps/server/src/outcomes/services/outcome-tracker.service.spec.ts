import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { Decision, DecisionOutcome } from '../../generated/prisma/client';
import type { DexScreenerClient } from '../../market-data/clients/dexscreener.client';
import type { DecisionOutcomeRepository, DecisionWithOutcome } from '../repositories/decision-outcome.repository';
import { OutcomeTrackerService } from './outcome-tracker.service';

const HOUR_MS = 60 * 60 * 1000;

const decision = (overrides: Partial<Decision> = {}, outcome: DecisionOutcome | null = null): DecisionWithOutcome =>
  ({
    id: 'd1',
    userId: 'u1',
    action: 'SKIP',
    pairAddress: 'pair1',
    marketCapUsd: 100_000,
    reasoning: 'Too risky',
    createdAt: new Date(Date.now() - 2 * HOUR_MS),
    ...overrides,
    outcome,
  }) as DecisionWithOutcome;

function build(decisions: DecisionWithOutcome[], pairMarketCap: number | null) {
  const save = vi.fn().mockResolvedValue(undefined);
  const repository = { listSkipsBetween: vi.fn().mockResolvedValue(decisions), save } as unknown as DecisionOutcomeRepository;
  const getPairs = vi.fn().mockResolvedValue(pairMarketCap === null ? [] : [{ pairAddress: 'pair1', marketCapUsd: pairMarketCap }]);
  const dex = { getPairs } as unknown as DexScreenerClient;
  const config = { get: vi.fn() } as unknown as ConfigService;
  return { service: new OutcomeTrackerService(repository, dex, config), save, getPairs };
}

describe('OutcomeTrackerService', () => {
  it('records the 1h change for a pass that is two hours old', async () => {
    const { service, save } = build([decision()], 180_000);
    expect(await service.tick()).toBe(1);
    const changes = save.mock.calls[0]?.[1] as Record<string, number>;
    expect(changes.change1hPct).toBeCloseTo(80);
    expect(changes.peakChangePct).toBeCloseTo(80);
    expect(changes.change4hPct).toBeUndefined();
  });

  it('records a dead pair as a total loss', async () => {
    const { service, save } = build([decision()], null);
    await service.tick();
    expect((save.mock.calls[0]?.[1] as Record<string, number>).change1hPct).toBe(-100);
  });

  it('skips decisions that are not worth tracking and ones already complete', async () => {
    const fundsSkip = decision({ reasoning: 'Not enough free funds for a position' });
    const done = decision({}, { change1hPct: 5, change4hPct: null, change24hPct: null, peakChangePct: 5 } as DecisionOutcome);
    const { service, save, getPairs } = build([fundsSkip, done], 150_000);
    expect(await service.tick()).toBe(0);
    expect(save).not.toHaveBeenCalled();
    expect(getPairs).not.toHaveBeenCalled();
  });
});
