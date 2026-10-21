import type { Playbook } from '@kestrel/shared';
import { Badge } from '@/components/ui/Badge';
import { FEATURE_LABELS } from '@/constants/ruleLabels';

function describeEffect(effect: Playbook['effect']): string[] {
  const parts: string[] = [];
  if (effect.block) parts.push('do not trade');
  if (effect.scalp) parts.push('take a quick scalp');
  if (effect.sizeMultiplier !== undefined) parts.push(`size x${effect.sizeMultiplier}`);
  if (effect.maxHoldMinutes !== undefined) parts.push(`hold ≤ ${effect.maxHoldMinutes} min`);
  if (effect.takeProfitMultiple !== undefined) parts.push(`target ${effect.takeProfitMultiple}x`);
  if (effect.stopLossPct !== undefined) parts.push(`stop -${effect.stopLossPct}%`);
  return parts;
}

export function PlaybookCard({ playbook }: { playbook: Playbook }) {
  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{playbook.name}</h3>
        {playbook.effect.block ? <Badge tone="danger">blocks</Badge> : <Badge tone="info">adjusts</Badge>}
      </div>
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">When </span>
        {playbook.conditions.map((condition) => `${FEATURE_LABELS[condition.feature]} ${condition.operator} ${condition.value}`).join(' and ')}
        <span className="text-muted-foreground"> → </span>
        {describeEffect(playbook.effect).join(', ')}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{playbook.rationale}</p>
    </li>
  );
}
