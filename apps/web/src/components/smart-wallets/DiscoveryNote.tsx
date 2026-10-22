import type { WalletDiscoveryResult } from '@kestrel/shared';

function messageFor(result: WalletDiscoveryResult): string {
  if (result.status === 'unavailable') return 'Wallet search needs the Helius API key on the server.';
  if (result.status === 'busy') return 'A search is already running. Check back in a minute.';
  if (result.qualified > 0) return `Checked ${result.checked} wallets from ${result.winners} winning tokens and added ${result.qualified}.`;
  return `Checked ${result.checked} wallets from ${result.winners} winning tokens. None passed the filters this time, try again later.`;
}

export function DiscoveryNote({ result }: { result: WalletDiscoveryResult | undefined }) {
  if (!result) return null;
  return <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{messageFor(result)}</p>;
}
