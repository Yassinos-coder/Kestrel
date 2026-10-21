import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { ForensicsService } from './services/forensics.service';

@Module({
  imports: [MarketDataModule],
  providers: [ForensicsService],
  exports: [ForensicsService],
})
export class ForensicsModule {}
