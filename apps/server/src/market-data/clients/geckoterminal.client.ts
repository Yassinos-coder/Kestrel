import { Injectable } from '@nestjs/common';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import { GECKO_BASE_URL, WSOL_MINT } from '../constants/market-data.constant';
import type { PoolCandidate, PoolTrade } from '../interfaces/market-data.interface';

interface GeckoTransactionBucket {
  buys?: number;
  sells?: number;
  buyers?: number;
  sellers?: number;
}

interface GeckoPoolResource {
  attributes: {
    address: string;
    name: string;
    pool_created_at: string | null;
    transactions?: { m5?: GeckoTransactionBucket };
  };
  relationships: {
    base_token: { data: { id: string } };
    quote_token: { data: { id: string } };
    dex: { data: { id: string } };
  };
}

interface GeckoPoolList {
  data?: GeckoPoolResource[];
}

interface GeckoTradeResource {
  attributes: {
    block_timestamp: string;
    tx_from_address: string;
    kind: 'buy' | 'sell';
    from_token_amount: string;
    to_token_amount: string;
    from_token_address: string;
  };
}

interface GeckoTradeList {
  data?: GeckoTradeResource[];
}

const TOKEN_PREFIX = 'solana_';

@Injectable()
export class GeckoTerminalClient {
  async getNewPools(page = 1): Promise<PoolCandidate[]> {
    const response = await HttpFetcher.json<GeckoPoolList>(`${GECKO_BASE_URL}/new_pools?page=${page}`);
    return this.toCandidates(response);
  }

  async getTrendingPools(): Promise<PoolCandidate[]> {
    const response = await HttpFetcher.json<GeckoPoolList>(`${GECKO_BASE_URL}/trending_pools?duration=1h`);
    return this.toCandidates(response);
  }

  async getTrades(pairAddress: string): Promise<PoolTrade[]> {
    const response = await HttpFetcher.json<GeckoTradeList>(`${GECKO_BASE_URL}/pools/${pairAddress}/trades`);
    return (response.data ?? []).map((trade) => this.toTrade(trade));
  }

  private toCandidates(response: GeckoPoolList): PoolCandidate[] {
    return (response.data ?? []).flatMap((pool) => {
      const candidate = this.toCandidate(pool);
      return candidate ? [candidate] : [];
    });
  }

  private toCandidate(pool: GeckoPoolResource): PoolCandidate | null {
    const quoteId = pool.relationships.quote_token.data.id.replace(TOKEN_PREFIX, '');
    const baseId = pool.relationships.base_token.data.id.replace(TOKEN_PREFIX, '');
    if (quoteId !== WSOL_MINT || baseId === WSOL_MINT) return null;
    if (!pool.attributes.pool_created_at) return null;

    const m5 = pool.attributes.transactions?.m5 ?? {};
    return {
      pairAddress: pool.attributes.address,
      mint: baseId,
      name: pool.attributes.name,
      dexId: pool.relationships.dex.data.id,
      createdAtMs: Date.parse(pool.attributes.pool_created_at),
      buys5m: m5.buys ?? 0,
      sells5m: m5.sells ?? 0,
      buyers5m: m5.buyers ?? 0,
      sellers5m: m5.sellers ?? 0,
    };
  }

  private toTrade(trade: GeckoTradeResource): PoolTrade {
    const attributes = trade.attributes;
    const isBuy = attributes.kind === 'buy';
    return {
      kind: attributes.kind,
      wallet: attributes.tx_from_address,
      tokenAmount: Number(isBuy ? attributes.to_token_amount : attributes.from_token_amount),
      solAmount: Number(isBuy ? attributes.from_token_amount : attributes.to_token_amount),
      timestampMs: Date.parse(attributes.block_timestamp),
    };
  }
}
