import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import type { EnhancedTransaction, HolderAccount, ParsedSwap, SwapHistory, WalletProfile } from '../interfaces/helius.interface';
import type { EnhancedSwapTransaction } from '../../smart-wallets/interfaces/wallet.interface';
import { SwapParserMapper } from '../mappers/swap-parser.mapper';

const ENHANCED_BASE_URL = 'https://api.helius.xyz/v0';
const SIGNATURE_PAGE = 1_000;
const PARSE_BATCH = 100;
const HOUR_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;
const ENHANCED_INTERVAL_MS = 250;
const ENHANCED_RETRIES = 3;

interface SignatureEntry {
  signature: string;
  blockTime: number | null;
  err: unknown;
}

interface RpcResult<T> {
  result?: T;
}

interface LargestAccount {
  address: string;
  amount: string;
}

interface ParsedAccount {
  data?: { parsed?: { info?: { owner?: string } } };
}

@Injectable()
export class HeliusClient {
  private readonly apiKey: string | undefined;
  private readonly rpcUrl: string;
  private nextEnhancedSlotMs = 0;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('solana.heliusApiKey') || undefined;
    this.rpcUrl = configService.getOrThrow<string>('solana.rpcUrl');
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async getTopHolders(mint: string): Promise<HolderAccount[]> {
    const largest = await this.rpc<RpcResult<{ value: LargestAccount[] }>>('getTokenLargestAccounts', [mint]);
    const accounts = largest.result?.value ?? [];
    if (!accounts.length) return [];

    const details = await this.rpc<RpcResult<{ value: Array<ParsedAccount | null> }>>('getMultipleAccounts', [
      accounts.map((account) => account.address),
      { encoding: 'jsonParsed' },
    ]);
    const owners = details.result?.value ?? [];

    const totals = new Map<string, number>();
    accounts.forEach((account, index) => {
      const owner = owners[index]?.data?.parsed?.info?.owner;
      if (owner) totals.set(owner, (totals.get(owner) ?? 0) + Number(account.amount));
    });
    return [...totals.entries()].map(([owner, amount]) => ({ owner, amount }));
  }

  async findPoolVault(pool: string, mint: string): Promise<string | null> {
    const response = await this.rpc<RpcResult<{ value: Array<{ pubkey: string }> }>>('getTokenAccountsByOwner', [pool, { mint }, { encoding: 'jsonParsed' }]);
    return response.result?.value?.[0]?.pubkey ?? null;
  }

  async getSwapHistory(vault: string, mint: string, maxSignatures: number): Promise<SwapHistory> {
    const signatures: SignatureEntry[] = [];
    let before: string | undefined;
    let reachedStart = false;

    while (signatures.length < maxSignatures) {
      const page = await this.rpc<RpcResult<SignatureEntry[]>>('getSignaturesForAddress', [vault, { limit: SIGNATURE_PAGE, ...(before ? { before } : {}) }]);
      const entries = page.result ?? [];
      signatures.push(...entries);
      if (entries.length < SIGNATURE_PAGE) {
        reachedStart = true;
        break;
      }
      before = entries[entries.length - 1]?.signature;
    }

    const succeeded = signatures.filter((entry) => !entry.err).slice(0, maxSignatures);
    const swaps: ParsedSwap[] = [];
    for (let index = 0; index < succeeded.length; index += PARSE_BATCH) {
      const batch = succeeded.slice(index, index + PARSE_BATCH).map((entry) => entry.signature);
      const parsed = await this.enhanced<EnhancedTransaction[]>('/transactions', {}, { transactions: batch });
      for (const transaction of parsed) {
        const swap = SwapParserMapper.parse(transaction, mint, vault);
        if (swap) swaps.push(swap);
      }
    }
    return { swaps, reachedStart: reachedStart && signatures.length <= maxSignatures };
  }

  async getWalletSwapTransactions(wallet: string, limit: number, before?: string): Promise<EnhancedSwapTransaction[]> {
    return this.enhanced<EnhancedSwapTransaction[]>(`/addresses/${wallet}/transactions`, {
      type: 'SWAP',
      limit: String(limit),
      ...(before ? { before } : {}),
    });
  }

  async getWalletProfile(address: string, nowMs: number): Promise<WalletProfile> {
    const response = await this.rpc<RpcResult<SignatureEntry[]>>('getSignaturesForAddress', [address, { limit: SIGNATURE_PAGE }]);
    const signatures = response.result ?? [];
    const oldest = signatures[signatures.length - 1];
    const saturated = signatures.length >= SIGNATURE_PAGE;

    return {
      address,
      txCount: signatures.length,
      oldestSignature: oldest?.signature ?? null,
      ageHours: oldest?.blockTime && !saturated ? (nowMs - oldest.blockTime * 1000) / HOUR_MS : null,
    };
  }

  async getFunder(signature: string, wallet: string): Promise<string | null> {
    const transactions = await this.enhanced<EnhancedTransaction[]>('/transactions', {}, { transactions: [signature] });
    const inbound = (transactions[0]?.nativeTransfers ?? []).find((transfer) => transfer.toUserAccount === wallet && (transfer.amount ?? 0) > 0);
    return inbound?.fromUserAccount ?? null;
  }

  private rpc<T>(method: string, params: unknown[]): Promise<T> {
    return HttpFetcher.json<T>(this.rpcUrl, {
      method: 'POST',
      body: { jsonrpc: '2.0', id: 1, method, params },
      timeoutMs: REQUEST_TIMEOUT_MS,
      retries: 1,
    });
  }

  private async enhanced<T>(path: string, query: Record<string, string>, body?: object): Promise<T> {
    await this.waitForEnhancedSlot();
    const search = new URLSearchParams({ 'api-key': this.apiKey ?? '', ...query });
    return HttpFetcher.json<T>(`${ENHANCED_BASE_URL}${path}?${search.toString()}`, {
      method: body ? 'POST' : 'GET',
      body,
      timeoutMs: REQUEST_TIMEOUT_MS,
      retries: ENHANCED_RETRIES,
    });
  }

  private waitForEnhancedSlot(): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, this.nextEnhancedSlotMs);
    this.nextEnhancedSlotMs = slot + ENHANCED_INTERVAL_MS;
    if (slot === now) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, slot - now));
  }
}
