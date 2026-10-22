import { describe, expect, it } from 'vitest';
import type { AnalystReport } from '../../agents/schemas/agent-outputs.schema';
import { AnalystGate } from './analyst-gate.util';

const report = (riskLevel: AnalystReport['riskLevel']): AnalystReport => ({
  summary: 'Parabolic run',
  strengths: ['clean distribution'],
  concerns: ['one holder owns 13%', 'fading volume', 'already up 800%'],
  riskLevel,
});

describe('AnalystGate', () => {
  it('blocks high risk tokens from reaching the trader', () => {
    expect(AnalystGate.blocks(report('high'), false)).toBe(true);
  });

  it('lets low and medium risk tokens through, and handles a missing analyst', () => {
    expect(AnalystGate.blocks(report('medium'), false)).toBe(false);
    expect(AnalystGate.blocks(report('low'), false)).toBe(false);
    expect(AnalystGate.blocks(null, false)).toBe(false);
  });

  it('never blocks a token the user suggested on purpose', () => {
    expect(AnalystGate.blocks(report('high'), true)).toBe(false);
  });

  it('explains the block with the top concerns', () => {
    expect(AnalystGate.reason(report('high'))).toBe(
      'The analyst rated this token high risk, so it was not sent to the trader. Concerns: one holder owns 13%; fading volume.',
    );
  });
});
