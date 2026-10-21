import type { ProfitabilityView } from '@kestrel/shared';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { FormatUtils } from '@/utils/FormatUtils';

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ProfitabilityCard({ data }: { data: ProfitabilityView }) {
  return (
    <Card>
      <CardHeader
        title="Is it paying for itself?"
        description="Profit from closed trades after trading fees and slippage, minus what the AI costs to run."
        action={<Badge tone={data.profitable ? 'success' : 'danger'}>{data.profitable ? 'Profitable' : 'Not profitable yet'}</Badge>}
      />
      <div className="divide-y">
        <Row label="Trading P&L" hint="After swap fees, slippage and network fees" value={FormatUtils.signedSol(data.tradingPnlSol)} />
        <Row label="AI cost" hint={`${data.aiCalls} model calls, about $${data.aiCostUsd.toFixed(2)}`} value={`−${FormatUtils.sol(data.aiCostSol)}`} />
        <Row label="Net profit" value={FormatUtils.signedSol(data.netProfitSol)} />
        <Row label="Net today" value={FormatUtils.signedSol(data.todayNetProfitSol)} />
        <Row label="Trading fees already inside P&L" value={FormatUtils.sol(data.tradingFeesSol)} />
      </div>
    </Card>
  );
}
