import type { EngineStatus, TradingMode } from '@kestrel/shared';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { FormatUtils } from '@/utils/FormatUtils';

interface BotControlCardProps {
  enabled: boolean;
  mode: TradingMode;
  engine: EngineStatus;
  pending: boolean;
  onToggle: (enabled: boolean) => void;
}

export function BotControlCard({ enabled, mode, engine, pending, onToggle }: BotControlCardProps) {
  return (
    <Card className="flex flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', enabled ? 'animate-pulse bg-success' : 'bg-muted-foreground/40')} />
            <h2 className="text-lg font-semibold">{enabled ? 'Bot is running' : 'Bot is off'}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {enabled ? 'Scanning new tokens around the clock and guarding open positions.' : 'Switch it on to start scanning and trading.'}
          </p>
        </div>
        <Switch checked={enabled} onChange={onToggle} disabled={pending} label="Enable the bot" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone={mode === 'LIVE' ? 'danger' : 'info'}>{mode === 'LIVE' ? 'Live money' : 'Paper mode'}</Badge>
        <span>Last scan {FormatUtils.timeAgo(engine.scoutLastRunAt)}</span>
        <span>· guardian {FormatUtils.timeAgo(engine.guardianLastRunAt)}</span>
        <span>· watching {engine.watchlistSize} tokens</span>
        <span>· {engine.scannedToday} checked today</span>
      </div>
    </Card>
  );
}
