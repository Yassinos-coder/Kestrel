import type { BotSettingsView, WalletView } from '@kestrel/shared';
import { Copy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { FormatUtils } from '@/utils/FormatUtils';

interface WithdrawValues {
  amountSol: number;
}

interface BotWalletCardProps {
  wallet: WalletView;
  settings: BotSettingsView;
  creating: boolean;
  withdrawing: boolean;
  sweeping: boolean;
  onCreate: () => void;
  onWithdraw: (amountSol: number) => void;
  onSweep: () => void;
  onAutoSweep: (enabled: boolean) => void;
  onBankroll: (amountSol: number) => void;
}

export function BotWalletCard({ wallet, settings, creating, withdrawing, sweeping, onCreate, onWithdraw, onSweep, onAutoSweep, onBankroll }: BotWalletCardProps) {
  const withdraw = useForm<WithdrawValues>({ defaultValues: { amountSol: 0.1 } });
  const bankroll = useForm<{ amountSol: number }>({ values: { amountSol: settings.liveBankrollSol } });

  if (!wallet.liveAvailable) {
    return (
      <Card>
        <CardHeader title="Bot wallet" description="Live trading is switched off on this server." />
        <p className="text-sm text-muted-foreground">
          The operator enables it by setting LIVE_TRADING_ENABLED=true and a WALLET_ENCRYPTION_KEY. Until then the bot only trades with paper money.
        </p>
      </Card>
    );
  }

  if (!wallet.botWalletAddress) {
    return (
      <Card>
        <CardHeader title="Bot wallet" description="A dedicated wallet the bot trades from, so your main wallet never signs automated trades." />
        <Button disabled={creating} onClick={onCreate}>
          {creating ? 'Creating…' : 'Create bot wallet'}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <CardHeader title="Bot wallet" description="Fund this address with SOL for trades and network fees. Only fund what you can afford to lose." />

      <div className="rounded-lg bg-muted p-3">
        <p className="text-xs text-muted-foreground">Deposit address</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all text-sm">{wallet.botWalletAddress}</code>
          <button type="button" aria-label="Copy address" onClick={() => void navigator.clipboard.writeText(wallet.botWalletAddress ?? '')} className="rounded-lg border p-2 text-muted-foreground hover:text-foreground">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm font-semibold">Balance: {wallet.botWalletBalanceSol === null ? 'unavailable' : FormatUtils.sol(wallet.botWalletBalanceSol, 4)}</p>
      </div>

      <form onSubmit={withdraw.handleSubmit((values) => onWithdraw(Number(values.amountSol)))} className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Withdraw to {FormatUtils.shortAddress(wallet.loginWalletAddress)}</span>
          <input type="number" step="0.001" min="0.001" className="mt-1 h-10 w-36 rounded-lg border bg-background px-3 outline-none focus:border-ring" {...withdraw.register('amountSol', { valueAsNumber: true, min: 0.001 })} />
        </label>
        <Button type="submit" variant="secondary" disabled={withdrawing}>
          {withdrawing ? 'Sending…' : 'Withdraw SOL'}
        </Button>
      </form>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Profit sweep</p>
            <p className="text-sm text-muted-foreground">Moves everything above the working bankroll to your connected wallet. Only possible when no position is open.</p>
          </div>
          <Switch checked={settings.autoSweep} onChange={onAutoSweep} label="Automatic profit sweep" />
        </div>
        <form onSubmit={bankroll.handleSubmit((values) => onBankroll(Number(values.amountSol)))} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground">Working bankroll (SOL)</span>
            <input type="number" step="0.1" min="0" className="mt-1 h-10 w-36 rounded-lg border bg-background px-3 outline-none focus:border-ring" {...bankroll.register('amountSol', { valueAsNumber: true, min: 0 })} />
          </label>
          <Button type="submit" variant="ghost">Save</Button>
          <Button type="button" variant="secondary" disabled={sweeping} onClick={onSweep}>
            {sweeping ? 'Sweeping…' : 'Sweep profit now'}
          </Button>
        </form>
      </div>
    </Card>
  );
}
