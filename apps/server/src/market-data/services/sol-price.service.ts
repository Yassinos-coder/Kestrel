import { Injectable } from '@nestjs/common';
import { JupiterClient } from '../clients/jupiter.client';
import { WSOL_MINT } from '../constants/market-data.constant';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 1_000_000;
const ONE_SOL_LAMPORTS = 1_000_000_000n;
const CACHE_MS = 60_000;

@Injectable()
export class SolPriceService {
  private cached = { usd: 0, at: 0 };

  constructor(private readonly jupiter: JupiterClient) {}

  async getUsd(): Promise<number> {
    if (Date.now() - this.cached.at < CACHE_MS) return this.cached.usd;
    try {
      const quote = await this.jupiter.quote({ inputMint: WSOL_MINT, outputMint: USDC_MINT, amount: ONE_SOL_LAMPORTS, slippageBps: 50 });
      this.cached = { usd: Number(quote.outAmount) / USDC_DECIMALS, at: Date.now() };
    } catch {
      this.cached = { usd: this.cached.usd, at: Date.now() - CACHE_MS / 2 };
    }
    return this.cached.usd;
  }
}
