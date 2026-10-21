import type { RuleParamKey, RuleParams } from '@kestrel/shared';
import { RULE_LABELS } from '@/constants/ruleLabels';

const GROUPS = ['Safety gates', 'Entry', 'Exits'] as const;

function formatValue(value: number, unit: string): string {
  const text = value >= 1000 ? value.toLocaleString() : String(value);
  return unit === '$' ? `$${text}` : unit ? `${text} ${unit}` : text;
}

export function RuleParamsGrid({ params, previous }: { params: RuleParams; previous?: RuleParams }) {
  const keys = Object.keys(RULE_LABELS) as RuleParamKey[];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {GROUPS.map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h3>
          <dl className="space-y-1.5 text-sm">
            {keys
              .filter((key) => RULE_LABELS[key].group === group)
              .map((key) => {
                const changed = previous !== undefined && previous[key] !== params[key];
                return (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{RULE_LABELS[key].label}</dt>
                    <dd className={changed ? 'font-semibold text-info' : 'font-medium'}>
                      {formatValue(params[key], RULE_LABELS[key].unit)}
                    </dd>
                  </div>
                );
              })}
          </dl>
        </div>
      ))}
    </div>
  );
}
