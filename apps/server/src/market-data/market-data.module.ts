import { Module } from '@nestjs/common';
import { DexScreenerClient } from './clients/dexscreener.client';
import { GeckoTerminalClient } from './clients/geckoterminal.client';
import { JupiterClient } from './clients/jupiter.client';
import { RugCheckClient } from './clients/rugcheck.client';
import { SolanaRpcService } from './clients/solana-rpc.service';
import { SolPriceService } from './services/sol-price.service';
import { TokenSnapshotBuilderService } from './services/token-snapshot-builder.service';

@Module({
  providers: [
    GeckoTerminalClient,
    DexScreenerClient,
    RugCheckClient,
    JupiterClient,
    SolanaRpcService,
    TokenSnapshotBuilderService,
    SolPriceService,
  ],
  exports: [
    GeckoTerminalClient,
    DexScreenerClient,
    RugCheckClient,
    JupiterClient,
    SolanaRpcService,
    TokenSnapshotBuilderService,
    SolPriceService,
  ],
})
export class MarketDataModule {}
