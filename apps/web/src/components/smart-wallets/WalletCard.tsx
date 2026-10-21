import type { SmartWalletView } from '@kestrel/shared';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormatUtils } from '@/utils/FormatUtils';

const SOLSCAN_URL = 'https://solscan.io/account';
const TIER_TONE = { A: 'success', B: 'info', C: 'neutral' } as const;

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={positive === undefined ? 'text-sm font-semibold' : positive ? 'text-sm font-semibold text-success' : 'text-sm font-semibold text-destructive'}>{value}</p>
    </div>
  );
}

interface WalletCardProps {
  wallet: SmartWalletView;
  onCopy: (wallet: SmartWalletView) => void;
}

export function WalletCard({ wallet, onCopy }: WalletCardProps) {
  const { stats } = wallet;
  const following = wallet.followStatus !== null && wallet.followStatus !== 'stopped';

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone={TIER_TONE[wallet.tier]}>Tier {wallet.tier}</Badge>
          <a
            href={`${SOLSCAN_URL}/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            title={wallet.address}
            className="inline-flex items-center gap-1 font-mono text-sm underline-offset-4 hover:underline"
          >
            {FormatUtils.shortAddress(wallet.address)}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
        <span className="font-display text-lg font-semibold">{wallet.score.toFixed(0)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Win rate" value={`${stats.winRatePct.toFixed(0)}%`} />
        <Metric label="Total profit" value={FormatUtils.signedSol(stats.totalPnlSol)} positive={stats.totalPnlSol >= 0} />
        <Metric label="Closed tokens" value={String(stats.closedTokens)} />
        <Metric label="Median hold" value={`${stats.medianHoldMinutes.toFixed(0)} min`} />
        <Metric label="Early entries" value={stats.earlyEntryPct === null ? '—' : `${stats.earlyEntryPct.toFixed(0)}%`} />
        <Metric label="Avg buy" value={FormatUtils.sol(stats.avgBuySol, 2)} />
        <Metric label="Swaps / day" value={stats.swapsPerDay.toFixed(1)} />
        <Metric label="Last active" value={FormatUtils.timeAgo(new Date(stats.lastActiveMs).toISOString())} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {following ? <Badge tone="success">Copying ({wallet.followStatus})</Badge> : <span />}
        <Button size="sm" variant={following ? 'secondary' : 'primary'} onClick={() => onCopy(wallet)}>
          {following ? 'Edit copy' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
