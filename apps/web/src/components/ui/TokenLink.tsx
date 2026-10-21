import { ExternalLink } from 'lucide-react';

const DEXSCREENER_URL = 'https://dexscreener.com/solana';

interface TokenLinkProps {
  symbol: string;
  pairAddress: string | null;
  mint: string;
}

export function TokenLink({ symbol, pairAddress, mint }: TokenLinkProps) {
  return (
    <a
      href={`${DEXSCREENER_URL}/${pairAddress ?? mint}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      title={`Open ${symbol} on DexScreener (${mint})`}
      className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
    >
      {symbol}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}
