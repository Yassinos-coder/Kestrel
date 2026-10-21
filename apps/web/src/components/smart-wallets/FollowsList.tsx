import type { CopyFollowView } from '@kestrel/shared';
import { Pause, Play, Square } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FormatUtils } from '@/utils/FormatUtils';

interface FollowsListProps {
  follows: CopyFollowView[];
  busyId: string | null;
  onToggle: (follow: CopyFollowView) => void;
  onStop: (follow: CopyFollowView) => void;
}

function statusTone(status: string) {
  if (status === 'active') return 'success';
  if (status === 'paused-max-loss') return 'danger';
  return 'warning';
}

export function FollowsList({ follows, busyId, onToggle, onStop }: FollowsListProps) {
  if (!follows.length) return <p className="py-6 text-center text-sm text-muted-foreground">You are not copying anyone yet. Pick a wallet below and press Copy.</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {follows.map((follow) => {
        const pnl = follow.realizedPnlSol + follow.openPnlSol;
        const stopped = follow.status === 'stopped';
        return (
          <div key={follow.id} className={cn('rounded-xl border p-4', stopped && 'opacity-60')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone="neutral">Tier {follow.tier}</Badge>
                <span className="font-mono text-sm">{FormatUtils.shortAddress(follow.walletAddress)}</span>
              </div>
              <Badge tone={statusTone(follow.status)}>{follow.status === 'paused-max-loss' ? 'Stopped: loss limit' : follow.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Deployed</p>
                <p className="font-semibold">
                  {follow.deployedSol.toFixed(2)} / {follow.budgetSol.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">P&L</p>
                <p className={cn('font-semibold', pnl >= 0 ? 'text-success' : 'text-destructive')}>{FormatUtils.signedSol(pnl)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trades</p>
                <p className="font-semibold">
                  {follow.openPositions} open · {follow.closedTrades} closed
                </p>
              </div>
            </div>
            {!stopped && (
              <div className="mt-4 flex justify-end gap-2">
                <Button size="sm" variant="secondary" disabled={busyId === follow.id} onClick={() => onToggle(follow)}>
                  {follow.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {follow.status === 'active' ? 'Pause' : 'Resume'}
                </Button>
                <Button size="sm" variant="danger" disabled={busyId === follow.id} onClick={() => onStop(follow)}>
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
