import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { Modal } from '@/components/ui/Modal';
import { TokenLink } from '@/components/ui/TokenLink';
import { portfolioService } from '@/services/portfolioService';

const ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function SuggestModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [mint, setMint] = useState('');
  const suggestion = useMutation({
    mutationFn: (address: string) => portfolioService.suggest(address),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['positions'] });
      void queryClient.invalidateQueries({ queryKey: ['decisions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const trimmed = mint.trim();
  const valid = ADDRESS_PATTERN.test(trimmed);
  const result = suggestion.data;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) suggestion.mutate(trimmed);
  };

  return (
    <Modal
      title="Suggest a token"
      description="Paste a contract address. The bot runs its full safety checklist and AI review, and opens a position only if it likes the setup."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Contract address
          <input
            value={mint}
            onChange={(event) => setMint(event.target.value)}
            placeholder="Token contract address"
            spellCheck={false}
            autoComplete="off"
            className="h-11 rounded-lg border bg-background px-3 font-mono text-sm outline-none focus:border-ring"
          />
        </label>
        {trimmed && !valid && <p className="text-xs text-destructive">That does not look like a Solana contract address.</p>}
        <Button type="submit" className="w-full" disabled={!valid || suggestion.isPending}>
          <Sparkles className="h-4 w-4" />
          {suggestion.isPending ? 'Analysing… this can take up to a minute' : 'Suggest'}
        </Button>
      </form>

      <div className="mt-3 space-y-3">
        <ErrorNote error={suggestion.error} />
        {result && (
          <div className="space-y-2 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <TokenLink symbol={result.decision.symbol} pairAddress={result.decision.pairAddress} mint={result.decision.mint} />
              <Badge tone={result.positionOpened ? 'success' : 'warning'}>
                {result.positionOpened ? 'Position opened' : result.decision.action === 'REJECTED' ? 'Rejected by checklist' : 'Passed on it'}
              </Badge>
              {result.decision.confidence !== null && <Badge tone="info">Confidence {result.decision.confidence}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{result.decision.reasoning}</p>
            {result.decision.costs && (
              <p className="text-xs text-muted-foreground">
                Costs: ~{result.decision.costs.roundTripCostPct.toFixed(1)}% round trip, needs +{result.decision.costs.breakEvenMovePct.toFixed(1)}% to break even.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
