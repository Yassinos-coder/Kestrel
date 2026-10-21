import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import { GeckoTerminalClient } from '../clients/geckoterminal.client';
import { JupiterClient } from '../clients/jupiter.client';
import { RugCheckClient } from '../clients/rugcheck.client';
import { SolanaRpcService } from '../clients/solana-rpc.service';
import { WSOL_MINT } from '../constants/market-data.constant';
import type { DexPair, PoolCandidate, PoolTrade, SwapQuote } from '../interfaces/market-data.interface';
import { TokenSnapshotMapper } from '../mappers/token-snapshot.mapper';

const EXIT_QUOTE_NOTIONAL_SOL = 0.5;
const EXIT_QUOTE_SLIPPAGE_BPS = 1_000;

@Injectable()
export class TokenSnapshotBuilderService {
  private readonly logger = new Logger(TokenSnapshotBuilderService.name);
  private readonly lastHolderCounts = new Map<string, number>();

  constructor(
    private readonly rugCheck: RugCheckClient,
    private readonly solanaRpc: SolanaRpcService,
    private readonly jupiter: JupiterClient,
    private readonly gecko: GeckoTerminalClient,
  ) {}

  async build(pair: DexPair, candidate: PoolCandidate | null): Promise<TokenMarketSnapshot> {
    const mintInfo = await this.solanaRpc.getMint(pair.mint);
    if (!mintInfo) throw new ServiceUnavailableException(`Mint account ${pair.mint} could not be read`);

    const [rug, exitQuote, trades] = await Promise.all([
      this.rugCheck.getReport(pair.mint),
      this.quoteExit(pair, mintInfo.decimals),
      this.loadTrades(pair.pairAddress),
    ]);

    const previousHolders = this.lastHolderCounts.get(pair.mint) ?? null;
    this.lastHolderCounts.set(pair.mint, rug.totalHolders);

    return TokenSnapshotMapper.build({
      pair,
      candidate,
      rug,
      onchain: mintInfo,
      exitQuote,
      trades,
      previousHolders,
      nowMs: Date.now(),
    });
  }

  private async quoteExit(pair: DexPair, decimals: number): Promise<SwapQuote | null> {
    const tokens = BigInt(Math.floor((EXIT_QUOTE_NOTIONAL_SOL / pair.priceSol) * 10 ** decimals));
    if (tokens <= 0n) return null;
    try {
      return await this.jupiter.quote({
        inputMint: pair.mint,
        outputMint: WSOL_MINT,
        amount: tokens,
        slippageBps: EXIT_QUOTE_SLIPPAGE_BPS,
      });
    } catch (error) {
      this.logger.debug(`No exit route for ${pair.symbol}: ${error instanceof Error ? error.message : 'unknown'}`);
      return null;
    }
  }

  private async loadTrades(pairAddress: string): Promise<PoolTrade[]> {
    try {
      return await this.gecko.getTrades(pairAddress);
    } catch (error) {
      this.logger.debug(`Trades unavailable for ${pairAddress}: ${error instanceof Error ? error.message : 'unknown'}`);
      return [];
    }
  }
}
