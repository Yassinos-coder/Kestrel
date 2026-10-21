import type { Playbook, PlaybookCondition, TradeFeatures } from '@kestrel/shared';
import type { MergedPlaybookEffect } from '../interfaces/rule-proposals.interface';

export class PlaybookMatcher {
  static match(features: TradeFeatures, playbooks: Playbook[]): MergedPlaybookEffect {
    const matched = playbooks.filter((playbook) =>
      playbook.conditions.every((condition) => PlaybookMatcher.holds(features, condition)),
    );

    return {
      matched,
      block: matched.some((playbook) => playbook.effect.block === true),
      scalp: matched.some((playbook) => playbook.effect.scalp === true),
      sizeMultiplier: PlaybookMatcher.lowest(matched.map((playbook) => playbook.effect.sizeMultiplier)) ?? 1,
      maxHoldMinutes: PlaybookMatcher.lowest(matched.map((playbook) => playbook.effect.maxHoldMinutes)),
      takeProfitMultiple: PlaybookMatcher.lowest(matched.map((playbook) => playbook.effect.takeProfitMultiple)),
      stopLossPct: PlaybookMatcher.lowest(matched.map((playbook) => playbook.effect.stopLossPct)),
    };
  }

  private static holds(features: TradeFeatures, condition: PlaybookCondition): boolean {
    const actual = features[condition.feature];
    if (condition.operator === '>') return actual > condition.value;
    if (condition.operator === '>=') return actual >= condition.value;
    if (condition.operator === '<') return actual < condition.value;
    return actual <= condition.value;
  }

  private static lowest(values: Array<number | undefined>): number | null {
    const defined = values.filter((value): value is number => value !== undefined);
    if (!defined.length) return null;
    return Math.min(...defined);
  }
}
