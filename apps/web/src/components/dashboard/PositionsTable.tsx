import type { PositionView } from '@kestrel/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TokenLink } from '@/components/ui/TokenLink';
import { cn } from '@/lib/cn';
import { FormatUtils } from '@/utils/FormatUtils';

interface PositionsTableProps {
  positions: PositionView[];
  emptyMessage: string;
  closingId?: string | null;
  onClose?: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

export function PositionsTable({ positions, emptyMessage, closingId, onClose, onSelect, selectedId }: PositionsTableProps) {
  if (!positions.length) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2 pr-4 font-medium">Token</th>
            <th className="py-2 pr-4 font-medium">Plan</th>
            <th className="py-2 pr-4 font-medium">Mkt cap</th>
            <th className="py-2 pr-4 font-medium">Invested</th>
            <th className="py-2 pr-4 font-medium">Value</th>
            <th className="py-2 pr-4 font-medium">P&amp;L</th>
            <th className="py-2 pr-4 font-medium">Opened</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            {onClose && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr
              key={position.id}
              onClick={() => onSelect?.(position.id)}
              className={cn('border-t', onSelect && 'cursor-pointer hover:bg-muted/50', selectedId === position.id && 'bg-muted/50')}
            >
              <td className="py-3 pr-4">
                <TokenLink symbol={position.symbol} pairAddress={position.pairAddress} mint={position.mint} />
                {position.mode === 'LIVE' && (
                  <span className="ml-2 align-middle">
                    <Badge tone="danger">live</Badge>
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {position.plan.style} · ≤{position.plan.maxHoldMinutes}m · {position.plan.takeProfitMultiple}x
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{FormatUtils.usdCompact(position.marketCapUsd)}</td>
              <td className="py-3 pr-4">{FormatUtils.sol(position.entrySol)}</td>
              <td className="py-3 pr-4">{FormatUtils.sol(position.status === 'OPEN' ? position.currentValueSol : position.realizedSol)}</td>
              <td className={cn('py-3 pr-4 font-semibold', position.pnlSol >= 0 ? 'text-success' : 'text-destructive')}>
                {FormatUtils.pct(position.pnlPct)}
                <span className="ml-1 text-xs font-normal opacity-80">({FormatUtils.signedSol(position.pnlSol)})</span>
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{FormatUtils.dateTime(position.openedAt)}</td>
              <td className="py-3 pr-4 text-muted-foreground">{position.status === 'CLOSED' ? position.exitReason : 'Open'}</td>
              {onClose && (
                <td className="py-3 text-right">
                  {position.status === 'OPEN' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={closingId === position.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onClose(position.id);
                      }}
                    >
                      {closingId === position.id ? 'Closing…' : 'Sell now'}
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
