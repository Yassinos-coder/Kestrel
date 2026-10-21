import { Injectable } from '@nestjs/common';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import { JUPITER_BASE_URL } from '../constants/market-data.constant';
import { PRIORITY_FEE_MAX_LAMPORTS } from '../../trading/constants/cost.constant';
import type { SwapQuote } from '../interfaces/market-data.interface';

interface JupiterQuoteResponse {
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  [key: string]: unknown;
}

interface JupiterSwapResponse {
  swapTransaction: string;
}

export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  slippageBps: number;
}

@Injectable()
export class JupiterClient {
  async quote(request: QuoteRequest): Promise<SwapQuote> {
    const query = new URLSearchParams({
      inputMint: request.inputMint,
      outputMint: request.outputMint,
      amount: request.amount.toString(),
      slippageBps: String(request.slippageBps),
    });
    const quote = await HttpFetcher.json<JupiterQuoteResponse>(`${JUPITER_BASE_URL}/quote?${query.toString()}`, { retries: 1 });
    return {
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,
      priceImpactPct: Math.abs(Number(quote.priceImpactPct)) * 100,
      raw: quote,
    };
  }

  async buildSwapTransaction(quote: SwapQuote, userPublicKey: string): Promise<string> {
    const response = await HttpFetcher.json<JupiterSwapResponse>(`${JUPITER_BASE_URL}/swap`, {
      method: 'POST',
      body: {
        quoteResponse: quote.raw,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: PRIORITY_FEE_MAX_LAMPORTS, priorityLevel: 'high' } },
      },
      retries: 0,
    });
    return response.swapTransaction;
  }
}
