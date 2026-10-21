import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@solana/web3.js';
import type { WalletView } from '@kestrel/shared';
import { SolanaRpcService } from '../../market-data/clients/solana-rpc.service';
import { SettingsRepository } from '../../settings/repositories/settings.repository';
import { SettingsService } from '../../settings/services/settings.service';
import { BotWalletRepository } from '../repositories/bot-wallet.repository';
import { WalletCrypto } from '../utils/wallet-crypto.util';

const FEE_RESERVE_SOL = 0.01;

@Injectable()
export class WalletService {
  constructor(
    private readonly wallets: BotWalletRepository,
    private readonly rpc: SolanaRpcService,
    private readonly settings: SettingsService,
    private readonly settingsRepository: SettingsRepository,
    private readonly configService: ConfigService,
  ) {}

  async getView(userId: string, loginWalletAddress: string): Promise<WalletView> {
    const wallet = await this.wallets.findByUserId(userId);
    const balance = wallet ? await this.rpc.getBalanceSol(wallet.publicKey).catch(() => null) : null;
    return {
      loginWalletAddress,
      botWalletAddress: wallet?.publicKey ?? null,
      botWalletBalanceSol: balance,
      liveAvailable: this.settings.isLiveAvailable(),
    };
  }

  async createBotWallet(userId: string, loginWalletAddress: string): Promise<WalletView> {
    if (await this.wallets.findByUserId(userId)) throw new BadRequestException('Bot wallet already exists');
    if (!this.settings.isLiveAvailable()) throw new BadRequestException('Live trading is not enabled on this server');

    const keypair = await Keypair.generate();
    const secret = WalletCrypto.encrypt(keypair.secretKey, this.configService.get<string>('wallet.encryptionKey'));
    await this.wallets.create(userId, keypair.publicKey.toBase58(), secret);
    return this.getView(userId, loginWalletAddress);
  }

  async loadKeypair(userId: string): Promise<Keypair> {
    const wallet = await this.wallets.findByUserId(userId);
    if (!wallet) throw new NotFoundException('Bot wallet not found');
    const secret = WalletCrypto.decrypt(wallet, this.configService.get<string>('wallet.encryptionKey'));
    return await Keypair.fromSecretKey(secret);
  }

  async getBalanceSol(userId: string): Promise<number> {
    const wallet = await this.wallets.findByUserId(userId);
    if (!wallet) return 0;
    return this.rpc.getBalanceSol(wallet.publicKey);
  }

  async withdraw(userId: string, loginWalletAddress: string, amountSol: number): Promise<string> {
    const balance = await this.getBalanceSol(userId);
    if (amountSol + FEE_RESERVE_SOL > balance) throw new BadRequestException('Amount exceeds the available balance');
    const signature = await this.rpc.transferSol(await this.loadKeypair(userId), loginWalletAddress, amountSol);
    return signature;
  }

  async sweepProfit(userId: string, loginWalletAddress: string): Promise<{ amountSol: number; signature: string }> {
    const settings = await this.settingsRepository.findByUserId(userId);
    if (!settings) throw new NotFoundException('Settings not found');
    if ((await this.settingsRepository.countOpenPositions(userId)) > 0) {
      throw new BadRequestException('Sweep is only available when no positions are open');
    }

    const balance = await this.getBalanceSol(userId);
    const sweepable = balance - settings.liveBankrollSol - FEE_RESERVE_SOL;
    if (sweepable <= FEE_RESERVE_SOL) throw new BadRequestException('There is no profit above the working bankroll to sweep');

    const signature = await this.rpc.transferSol(await this.loadKeypair(userId), loginWalletAddress, sweepable);
    await this.wallets.recordSweep(userId, sweepable, signature);
    return { amountSol: sweepable, signature };
  }
}
