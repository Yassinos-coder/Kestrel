import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

export function StatCard({ label, value, hint, tone = 'neutral' }: StatCardProps) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-display text-2xl font-semibold', tone === 'positive' && 'text-success', tone === 'negative' && 'text-destructive')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
