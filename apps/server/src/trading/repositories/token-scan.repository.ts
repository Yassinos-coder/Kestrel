import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { TokenScan } from '../../generated/prisma/client';

export interface ScanData {
  pairAddress: string;
  symbol: string;
  name: string;
  snapshot: object;
}

@Injectable()
export class TokenScanRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(mint: string, data: ScanData): Promise<TokenScan> {
    const payload = { ...data, scannedAt: new Date() };
    return this.prisma.tokenScan.upsert({ where: { mint }, create: { mint, ...payload }, update: payload });
  }


  countSince(since: Date): Promise<number> {
    return this.prisma.tokenScan.count({ where: { scannedAt: { gte: since } } });
  }
}
