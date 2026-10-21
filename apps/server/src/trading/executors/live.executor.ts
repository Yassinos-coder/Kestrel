import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VersionedTransaction } from '@solana/web3.js';
import { JupiterClient } from '../../market-data/clients/jupiter.client';
import { SolanaRpcService } from '../../market-data/clients/solana-rpc.service';
import { LAMPORTS_PER_SOL_NUMBER, WSOL_MINT } from '../../market-data/constants/market-data.constant';
import { WalletService } from '../../wallet/services/wallet.service';
import type { BuyOrder, SellOrder, TradeExecutor } from '../interfaces/executor.interface';
import type { Fill } from '../interfaces/trading.interface';

const BUY_SLIPPAGE_BPS = 500;
const SELL_SLIPPAGE_BPS = 1_500;
const SETTLE_DELAY_MS = 1_500;

@Injectable()
export class LiveExecutor implements TradeExecutor {
  constructor(
    private readonly wallet: WalletService,
    private readonly jupiter: JupiterClient,
    private readonly rpc: SolanaRpcService,
    private readonly configService: ConfigService,
  ) {}

  async buy(order: BuyOrder): Promise<Fill> {
    this.assertEnabled();
    const keypair = await this.wallet.loadKeypair(order.userId);
    const owner = keypair.publicKey.toBase58();

    const [solBefore, tokensBefore] = await Promise.all([this.rpc.getBalanceSol(owner), this.rpc.getTokenBalanceRaw(owner, order.mint)]);
    const lamports = BigInt(Math.floor(order.solAmount * LAMPORTS_PER_SOL_NUMBER));
    const quote = await this.jupiter.quote({ inputMint: WSOL_MINT, outputMint: order.mint, amount: lamports, slippageBps: BUY_SLIPPAGE_BPS });
    const signature = await this.sendSwap(quote, keypair);

    await this.settle();
    const [solAfter, tokensAfter] = await Promise.all([this.rpc.getBalanceSol(owner), this.rpc.getTokenBalanceRaw(owner, order.mint)]);
    const tokens = Number(tokensAfter - tokensBefore) / 10 ** order.decimals;
    const spent = solBefore - solAfter;
    if (tokens <= 0) throw new ServiceUnavailableException('Swap confirmed but no tokens arrived');

    return { tokenAmount: tokens, solAmount: spent, feesSol: 0, priceSol: spent / tokens, signature };
  }

  async sell(order: SellOrder): Promise<Fill> {
    this.assertEnabled();
    const keypair = await this.wallet.loadKeypair(order.userId);
    const owner = keypair.publicKey.toBase58();

    const [solBefore, tokensBefore] = await Promise.all([this.rpc.getBalanceSol(owner), this.rpc.getTokenBalanceRaw(owner, order.mint)]);
    const wanted = BigInt(Math.floor(order.tokenAmount * 10 ** order.decimals));
    const raw = order.sellAll || wanted > tokensBefore ? tokensBefore : wanted;
    if (raw <= 0n) throw new ServiceUnavailableException('No tokens left to sell in the bot wallet');

    const quote = await this.jupiter.quote({ inputMint: order.mint, outputMint: WSOL_MINT, amount: raw, slippageBps: SELL_SLIPPAGE_BPS });
    const signature = await this.sendSwap(quote, keypair);

    await this.settle();
    const solAfter = await this.rpc.getBalanceSol(owner);
    const received = Math.max(0, solAfter - solBefore);
    const sold = Number(raw) / 10 ** order.decimals;

    return { tokenAmount: sold, solAmount: received, feesSol: 0, priceSol: received / sold, signature };
  }

  private async sendSwap(
    quote: Awaited<ReturnType<JupiterClient['quote']>>,
    keypair: Awaited<ReturnType<WalletService['loadKeypair']>>,
  ): Promise<string> {
    const encoded = await this.jupiter.buildSwapTransaction(quote, keypair.publicKey.toBase58());
    const transaction = VersionedTransaction.deserialize(Buffer.from(encoded, 'base64'));
    await transaction.sign([keypair]);
    return this.rpc.sendAndConfirm(transaction);
  }

  private assertEnabled(): void {
    if (this.configService.get<boolean>('wallet.liveTradingEnabled') !== true) {
      throw new ForbiddenException('Live trading is disabled on this server');
    }
  }

  private settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));
  }
}
