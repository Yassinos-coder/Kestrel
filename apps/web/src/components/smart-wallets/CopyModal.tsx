import type { FollowInput, SmartWalletView } from '@kestrel/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { FormatUtils } from '@/utils/FormatUtils';

const DEFAULTS = { budgetSol: '0.5', maxPerTradeSol: '0.1', maxLossSol: '0.15', minLiquidityUsd: '15000' };

interface CopyModalProps {
  wallet: SmartWalletView;
  pending: boolean;
  error: unknown;
  onSubmit: (input: FollowInput) => void;
  onClose: () => void;
}

function NumberField({ label, hint, value, onChange, step }: { label: string; hint: string; value: string; onChange: (value: string) => void; step: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
      />
      <span className="text-xs font-normal text-muted-foreground">{hint}</span>
    </label>
  );
}

export function CopyModal({ wallet, pending, error, onSubmit, onClose }: CopyModalProps) {
  const [values, setValues] = useState(DEFAULTS);
  const [mirrorSells, setMirrorSells] = useState(true);
  const [requireSecuredLp, setRequireSecuredLp] = useState(true);

  const set = (key: keyof typeof DEFAULTS) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  const input: FollowInput = {
    budgetSol: Number(values.budgetSol),
    maxPerTradeSol: Number(values.maxPerTradeSol),
    maxLossSol: Number(values.maxLossSol),
    minLiquidityUsd: Number(values.minLiquidityUsd),
    mirrorSells,
    requireSecuredLp,
  };
  const problem = ((): string | null => {
    if ([input.budgetSol, input.maxPerTradeSol, input.maxLossSol].some((value) => !(value > 0))) return 'Budget, per-trade amount and loss limit must be above zero.';
    if (input.maxPerTradeSol > input.budgetSol) return 'The per-trade amount cannot exceed the total budget.';
    if (input.maxLossSol > input.budgetSol) return 'The loss limit cannot exceed the total budget.';
    return null;
  })();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!problem) onSubmit(input);
  };

  return (
    <Modal title={`Copy ${FormatUtils.shortAddress(wallet.address)}`} description={`Tier ${wallet.tier} wallet, score ${wallet.score.toFixed(0)}. You decide how much to risk.`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Total budget (SOL)" hint="The most this copy setup may have invested at once." value={values.budgetSol} onChange={set('budgetSol')} step="0.05" />
          <NumberField label="Max per trade (SOL)" hint="Cap for each mirrored buy." value={values.maxPerTradeSol} onChange={set('maxPerTradeSol')} step="0.01" />
          <NumberField label="Stop after losing (SOL)" hint="Copying pauses automatically once losses reach this." value={values.maxLossSol} onChange={set('maxLossSol')} step="0.01" />
          <NumberField label="Min liquidity (USD)" hint="Skip tokens with a thinner pool." value={values.minLiquidityUsd} onChange={set('minLiquidityUsd')} step="1000" />
        </div>

        <div className="space-y-3 rounded-xl border p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span>
              Mirror sells
              <span className="block text-xs text-muted-foreground">Sell the same share when this wallet sells.</span>
            </span>
            <Switch checked={mirrorSells} onChange={setMirrorSells} label="Mirror sells" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <span>
              Require locked or burned liquidity
              <span className="block text-xs text-muted-foreground">Safer, but skips many fresh tokens.</span>
            </span>
            <Switch checked={requireSecuredLp} onChange={setRequireSecuredLp} label="Require secured liquidity" />
          </div>
        </div>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Copies arrive after the wallet, so you buy later and usually higher. Every token still passes the safety checks, the guardian protects each position, and past results do not guarantee future ones.
        </p>

        {problem && <p className="text-xs text-destructive">{problem}</p>}
        <ErrorNote error={error} />
        <Button type="submit" className="w-full" disabled={Boolean(problem) || pending}>
          {pending ? 'Saving…' : 'Start copying'}
        </Button>
      </form>
    </Modal>
  );
}
