import { randomUUID } from 'node:crypto';
import type { Playbook, PlaybookCondition, PlaybookEffect, PlaybookFeature, RuleChange } from '@kestrel/shared';
import { MAX_ACTIVE_PLAYBOOKS } from '../constants/rule-param-bounds.constant';
import { STATIC_LIMITS } from '../constants/static-limits.constant';
import type { PlaybookOutcome, ProposedPlaybook } from '../interfaces/rule-proposals.interface';

const FEATURES: ReadonlySet<PlaybookFeature> = new Set<PlaybookFeature>([
  'top10Pct',
  'top1HolderPct',
  'bundledSupplyPct',
  'sniperSupplyPct',
  'liquidityUsd',
  'marketCapUsd',
  'ageSeconds',
  'priceChange5mPct',
  'uniqueTraders5m',
  'buySellRatio5m',
  'holderGrowth5mPct',
  'liquidityToMarketCapPct',
  'priceChange1hPct',
  'volumeTrendRatio',
]);
const OPERATORS: ReadonlySet<string> = new Set(['>', '>=', '<', '<=']);
const MAX_CONDITIONS = 3;
const MAX_NAME_LENGTH = 60;

export class PlaybookValidator {
  static apply(
    current: Playbook[],
    proposed: ProposedPlaybook[],
    removeIds: string[],
    nowIso: string,
  ): PlaybookOutcome {
    const accepted: RuleChange[] = [];
    const rejected: RuleChange[] = [];
    let playbooks = [...current];

    for (const id of removeIds) {
      const existing = playbooks.find((playbook) => playbook.id === id);
      if (!existing) continue;
      playbooks = playbooks.filter((playbook) => playbook.id !== id);
      accepted.push({ kind: 'playbook-removed', target: existing.name, from: existing.id, to: null, rationale: 'retired by review' });
    }

    for (const candidate of proposed) {
      const problem = PlaybookValidator.findProblem(candidate);
      if (problem) {
        rejected.push({ kind: 'playbook-added', target: candidate.name, from: null, to: null, rationale: problem });
        continue;
      }
      if (playbooks.length >= MAX_ACTIVE_PLAYBOOKS) {
        rejected.push({ kind: 'playbook-added', target: candidate.name, from: null, to: null, rationale: 'playbook limit reached' });
        continue;
      }

      const playbook: Playbook = {
        id: randomUUID(),
        name: candidate.name.slice(0, MAX_NAME_LENGTH),
        conditions: candidate.conditions,
        effect: PlaybookValidator.clampEffect(candidate.effect),
        rationale: candidate.rationale,
        evidenceTradeIds: candidate.evidenceTradeIds,
        createdAt: nowIso,
      };
      playbooks.push(playbook);
      accepted.push({ kind: 'playbook-added', target: playbook.name, from: null, to: playbook.id, rationale: candidate.rationale });
    }

    return { playbooks, accepted, rejected };
  }

  private static findProblem(candidate: ProposedPlaybook): string | null {
    if (!candidate.name.trim()) return 'playbook has no name';
    if (!candidate.conditions.length) return 'playbook has no conditions';
    if (candidate.conditions.length > MAX_CONDITIONS) return 'too many conditions';
    if (!candidate.conditions.every(PlaybookValidator.isValidCondition)) return 'invalid condition';
    if (!PlaybookValidator.hasEffect(candidate.effect)) return 'playbook has no effect';
    return null;
  }

  private static isValidCondition(condition: PlaybookCondition): boolean {
    return FEATURES.has(condition.feature) && OPERATORS.has(condition.operator) && Number.isFinite(condition.value);
  }

  private static hasEffect(effect: PlaybookEffect): boolean {
    return Object.values(effect).some((value) => value !== undefined && value !== null && value !== false);
  }

  private static clampEffect(effect: PlaybookEffect): PlaybookEffect {
    const clamped: PlaybookEffect = {};
    if (effect.block) clamped.block = true;
    if (effect.scalp) clamped.scalp = true;
    if (effect.sizeMultiplier !== undefined) {
      clamped.sizeMultiplier = PlaybookValidator.clamp(
        effect.sizeMultiplier,
        STATIC_LIMITS.minPlaybookSizeMultiplier,
        STATIC_LIMITS.maxPlaybookSizeMultiplier,
      );
    }
    if (effect.maxHoldMinutes !== undefined) clamped.maxHoldMinutes = Math.round(PlaybookValidator.clamp(effect.maxHoldMinutes, 5, 1_440));
    if (effect.takeProfitMultiple !== undefined) clamped.takeProfitMultiple = PlaybookValidator.clamp(effect.takeProfitMultiple, 1.1, 5);
    if (effect.stopLossPct !== undefined) clamped.stopLossPct = PlaybookValidator.clamp(effect.stopLossPct, 15, 60);
    return clamped;
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
