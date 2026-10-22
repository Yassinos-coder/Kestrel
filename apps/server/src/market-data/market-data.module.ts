import { Module } from '@nestjs/common';
import { BirdeyeClient } from './clients/birdeye.client';
import { DexScreenerClient } from './clients/dexscreener.client';
import { GeckoTerminalClient } from './clients/geckoterminal.client';
import { HeliusClient } from './clients/helius.client';
import { JupiterClient } from './clients/jupiter.client';
import { PumpFunClient } from './clients/pumpfun.client';
import { RugCheckClient } from './clients/rugcheck.client';
import { SolanaRpcService } from './clients/solana-rpc.service';
import { SolPriceService } from './services/sol-price.service';
import { TokenSnapshotBuilderService } from './services/token-snapshot-builder.service';

@Module({
  providers: [
    BirdeyeClient,
    GeckoTerminalClient,
    HeliusClient,
    DexScreenerClient,
    RugCheckClient,
    PumpFunClient,
    JupiterClient,
    SolanaRpcService,
    TokenSnapshotBuilderService,
    SolPriceService,
  ],
  exports: [
    BirdeyeClient,
    GeckoTerminalClient,
    HeliusClient,
    DexScreenerClient,
    RugCheckClient,
    PumpFunClient,
    JupiterClient,
    SolanaRpcService,
    TokenSnapshotBuilderService,
    SolPriceService,
  ],
})
export class MarketDataModule {}
