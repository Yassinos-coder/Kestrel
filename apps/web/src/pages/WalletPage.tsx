import { BotWalletCard } from '@/components/wallet/BotWalletCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { cn } from '@/lib/cn';
import {
  useCreateWalletMutation,
  useSettingsQuery,
  useSweepMutation,
  useUpdateSettingsMutation,
  useWalletQuery,
  useWithdrawMutation,
} from '@/hooks/useSettingsQueries';
import { FormatUtils } from '@/utils/FormatUtils';

export function WalletPage() {
  const settings = useSettingsQuery();
  const wallet = useWalletQuery();
  const update = useUpdateSettingsMutation();
  const create = useCreateWalletMutation();
  const withdraw = useWithdrawMutation();
  const sweep = useSweepMutation();

  if (settings.isPending || wallet.isPending) return <p className="text-muted-foreground">Loading…</p>;
  if (!settings.data || !wallet.data) return <ErrorNote error={settings.error ?? wallet.error ?? new Error('Wallet unavailable')} />;

  const liveReady = settings.data.liveAvailable && wallet.data.botWalletAddress !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet and mode</h1>
        <p className="text-sm text-muted-foreground">Choose between simulated and real money, and manage the bot wallet.</p>
      </div>

      <Card>
        <CardHeader title="Trading mode" description="Switch only when no position is open. Paper mode uses real market data with simulated fills that include fees and slippage." />
        <div className="grid gap-3 sm:grid-cols-2">
          {(['PAPER', 'LIVE'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={update.isPending || (mode === 'LIVE' && !liveReady)}
              onClick={() => update.mutate({ mode })}
              className={cn(
                'rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                settings.data.mode === mode ? 'border-foreground/60 bg-accent' : 'hover:bg-muted',
              )}
            >
              <p className="font-semibold">{mode === 'PAPER' ? 'Paper money' : 'Live money'}</p>
              <p className="text-sm text-muted-foreground">
                {mode === 'PAPER' ? `Balance ${FormatUtils.sol(settings.data.paperCashSol, 3)} of ${FormatUtils.sol(settings.data.startingPaperBalanceSol, 1)}` : liveReady ? 'Trades from your bot wallet' : 'Needs a funded bot wallet'}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <ErrorNote error={update.error} />
        </div>
      </Card>

      <ErrorNote error={create.error ?? withdraw.error ?? sweep.error} />
      {withdraw.data && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Withdrawal sent: {FormatUtils.shortAddress(withdraw.data.signature)}</p>}
      {sweep.data && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Swept {FormatUtils.sol(sweep.data.amountSol, 3)} to your wallet.</p>}

      <BotWalletCard
        wallet={wallet.data}
        settings={settings.data}
        creating={create.isPending}
        withdrawing={withdraw.isPending}
        sweeping={sweep.isPending}
        onCreate={() => create.mutate()}
        onWithdraw={(amountSol) => withdraw.mutate(amountSol)}
        onSweep={() => sweep.mutate()}
        onAutoSweep={(autoSweep) => update.mutate({ autoSweep })}
        onBankroll={(liveBankrollSol) => update.mutate({ liveBankrollSol })}
      />

      <Card className="text-sm text-muted-foreground">
        Kestrel never holds your main wallet key. The bot wallet is generated on the server and its key is stored encrypted. Withdrawals and profit sweeps can only go to the wallet you signed in with.
      </Card>
    </div>
  );
}
