import { Navigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { useDetectedWallets, useWalletLogin } from '@/hooks/useWalletLogin';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const token = useAuthStore((state) => state.token);
  const wallets = useDetectedWallets();
  const login = useWalletLogin();

  if (token) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight">Kestrel</h1>
          <p className="mt-2 text-muted-foreground">An AI trading desk for Solana meme coins that studies its own mistakes every night.</p>
        </div>

        <Card>
          <h2 className="text-lg font-semibold">Connect your wallet</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            You sign a free message to prove the wallet is yours. Nothing is sent on-chain and no funds are touched.
          </p>

          <div className="space-y-2">
            {wallets.map((wallet) => (
              <Button
                key={wallet.name}
                variant="secondary"
                size="lg"
                className="w-full justify-start"
                disabled={login.isPending}
                onClick={() => login.mutate(wallet)}
              >
                <img src={wallet.icon} alt="" className="h-6 w-6 rounded" />
                {login.isPending && login.variables?.name === wallet.name ? 'Waiting for signature…' : wallet.name}
              </Button>
            ))}

            {!wallets.length && (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                <Wallet className="mx-auto mb-2 h-6 w-6" />
                No Solana wallet detected in this browser. Install a wallet such as Phantom, Solflare or Backpack, then refresh this page.
              </div>
            )}
          </div>

          <div className="mt-3">
            <ErrorNote error={login.error} />
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Meme coins are extremely risky and most go to zero. Start in paper mode and never fund the bot with money you cannot lose.
        </p>
      </div>
    </div>
  );
}
