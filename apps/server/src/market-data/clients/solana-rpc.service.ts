import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { LAMPORTS_PER_SOL_NUMBER } from '../constants/market-data.constant';
import type { MintOnChain } from '../interfaces/market-data.interface';

interface ParsedMintInfo {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  decimals: number;
  extensions?: Array<{ extension: string }>;
}

const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const CONFIRM_TIMEOUT_MS = 45_000;

@Injectable()
export class SolanaRpcService {
  private readonly logger = new Logger(SolanaRpcService.name);
  private readonly connection: Connection;

  constructor(configService: ConfigService) {
    const rpcUrl = configService.getOrThrow<string>('solana.rpcUrl');
    if (!configService.get<boolean>('solana.heliusConfigured')) {
      this.logger.warn('HELIUS_API_KEY is not set, falling back to the public Solana RPC (rate limited)');
    }
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getMint(mint: string): Promise<MintOnChain | null> {
    const account = await this.connection.getParsedAccountInfo(new PublicKey(mint));
    const data = account.value?.data;
    if (!data || !('parsed' in data) || data.parsed?.type !== 'mint') return null;

    const info = data.parsed.info as ParsedMintInfo;
    return {
      mintAuthority: info.mintAuthority,
      freezeAuthority: info.freezeAuthority,
      tokenProgram: account.value?.owner.toBase58() === TOKEN_2022_PROGRAM ? 'token-2022' : 'token',
      extensions: (info.extensions ?? []).map((extension) => extension.extension),
      decimals: info.decimals,
    };
  }

  async getBalanceSol(address: string): Promise<number> {
    const lamports = await this.connection.getBalance(new PublicKey(address));
    return Number(lamports) / LAMPORTS_PER_SOL_NUMBER;
  }

  async getTokenBalanceRaw(owner: string, mint: string): Promise<bigint> {
    const accounts = await this.connection.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) });
    return accounts.value.reduce<bigint>(
      (sum, account) => sum + BigInt(account.account.data.parsed.info.tokenAmount.amount as string),
      0n,
    );
  }

  async transferSol(from: Keypair, toAddress: string, amountSol: number): Promise<string> {
    const latest = await this.connection.getLatestBlockhash('confirmed');
    const lamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL_NUMBER));
    const message = new TransactionMessage({
      payerKey: from.publicKey,
      recentBlockhash: latest.blockhash,
      instructions: [SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: new PublicKey(toAddress), lamports })],
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    await transaction.sign([from]);
    return this.sendAndConfirm(transaction);
  }

  async sendAndConfirm(transaction: VersionedTransaction): Promise<string> {
    const latest = await this.connection.getLatestBlockhash('confirmed');
    const signature = await this.connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 3n });
    const result = await Promise.race([
      this.connection.confirmTransaction({ signature, ...latest }, 'confirmed'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('confirmation timeout')), CONFIRM_TIMEOUT_MS)),
    ]);
    if (result.value.err) throw new Error(`transaction failed: ${JSON.stringify(result.value.err)}`);
    return signature;
  }
}
