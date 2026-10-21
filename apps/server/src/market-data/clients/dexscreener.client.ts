import { Injectable } from '@nestjs/common';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import { DEXSCREENER_BASE_URL, DEXSCREENER_BATCH_SIZE, DEXSCREENER_TOKENS_URL, WSOL_MINT } from '../constants/market-data.constant';
import type { DexPair } from '../interfaces/market-data.interface';

interface DexPairResource {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string };
  priceNative?: string;
  priceUsd?: string;
  txns?: { m5?: { buys?: number; sells?: number } };
  volume?: { m5?: number; h1?: number };
  priceChange?: { m5?: number; h1?: number };
  liquidity?: { usd?: number; quote?: number };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
}

interface DexPairsResponse {
  pairs?: DexPairResource[] | null;
}

@Injectable()
export class DexScreenerClient {
  async getPairs(pairAddresses: string[]): Promise<DexPair[]> {
    const batches = this.chunk(pairAddresses, DEXSCREENER_BATCH_SIZE);
    const results = await Promise.all(batches.map((batch) => this.fetchBatch(batch)));
    return results.flat();
  }

  async getPairsForTokens(mints: string[]): Promise<DexPair[]> {
    const batches = this.chunk(mints, DEXSCREENER_BATCH_SIZE);
    const responses = await Promise.all(
      batches.map((batch) => HttpFetcher.json<DexPairResource[]>(`${DEXSCREENER_TOKENS_URL}/${batch.join(',')}`)),
    );
    return this.toPairs({ pairs: responses.flat() });
  }

  async getBestPairForToken(mint: string): Promise<DexPair | null> {
    const pairs = await this.getPairsForTokens([mint]);
    return pairs.filter((pair) => pair.mint === mint).sort((a, b) => b.liquidityUsd - a.liquidityUsd)[0] ?? null;
  }

  private async fetchBatch(batch: string[]): Promise<DexPair[]> {
    if (!batch.length) return [];
    const response = await HttpFetcher.json<DexPairsResponse>(`${DEXSCREENER_BASE_URL}/pairs/solana/${batch.join(',')}`);
    return this.toPairs(response);
  }

  private toPairs(response: DexPairsResponse): DexPair[] {
    return (response.pairs ?? []).flatMap((pair) => {
      const mapped = this.toPair(pair);
      return mapped ? [mapped] : [];
    });
  }

  private toPair(pair: DexPairResource): DexPair | null {
    if (pair.chainId !== 'solana' || pair.quoteToken.address !== WSOL_MINT) return null;
    const priceSol = Number(pair.priceNative);
    if (!Number.isFinite(priceSol) || priceSol <= 0) return null;

    return {
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      mint: pair.baseToken.address,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceSol,
      priceUsd: Number(pair.priceUsd) || 0,
      liquidityUsd: pair.liquidity?.usd ?? 0,
      liquidityQuoteSol: pair.liquidity?.quote ?? 0,
      marketCapUsd: pair.marketCap ?? pair.fdv ?? 0,
      priceChange5mPct: pair.priceChange?.m5 ?? 0,
      priceChange1hPct: pair.priceChange?.h1 ?? 0,
      buys5m: pair.txns?.m5?.buys ?? 0,
      sells5m: pair.txns?.m5?.sells ?? 0,
      volume5mUsd: pair.volume?.m5 ?? 0,
      volume1hUsd: pair.volume?.h1 ?? 0,
      createdAtMs: pair.pairCreatedAt ?? Date.now(),
    };
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
    return chunks;
  }
}
