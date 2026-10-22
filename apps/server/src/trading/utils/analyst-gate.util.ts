import type { AnalystReport } from '../../agents/schemas/agent-outputs.schema';

const CONCERNS_SHOWN = 2;

export class AnalystGate {
  static blocks(analyst: AnalystReport | null, forced: boolean): boolean {
    return !forced && analyst?.riskLevel === 'high';
  }

  static reason(analyst: AnalystReport): string {
    const concerns = analyst.concerns.slice(0, CONCERNS_SHOWN).join('; ');
    return `The analyst rated this token high risk, so it was not sent to the trader.${concerns ? ` Concerns: ${concerns}.` : ''}`;
  }
}
