import { MAX_COPY_BUDGET_SOL, MIN_COPY_BUDGET_SOL } from '../constants/copy-defaults.constant';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const WALLET_SORTS = ['score', 'profit', 'winrate', 'recent', 'early'] as const;
export type WalletSort = (typeof WALLET_SORTS)[number];

export class SmartWalletQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(WALLET_SORTS)
  sort?: WalletSort;

  @IsOptional()
  @IsIn(['A', 'B', 'C'])
  tier?: 'A' | 'B' | 'C';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;
}

export class FollowDto {
  @IsNumber()
  @Min(0.05)
  @Max(1_000)
  budgetSol!: number;

  @IsNumber()
  @Min(0.01)
  @Max(1_000)
  maxPerTradeSol!: number;

  @IsNumber()
  @Min(0.01)
  @Max(1_000)
  maxLossSol!: number;

  @IsNumber()
  @Min(1_000)
  @Max(1_000_000)
  minLiquidityUsd!: number;

  @IsBoolean()
  mirrorSells!: boolean;

  @IsBoolean()
  requireSecuredLp!: boolean;
}

export class CopyByAddressDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, { message: 'address must be a Solana address' })
  address!: string;

  @IsOptional()
  @IsNumber()
  @Min(MIN_COPY_BUDGET_SOL)
  @Max(MAX_COPY_BUDGET_SOL)
  budgetSol?: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class UpdateFollowDto {
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(1_000)
  budgetSol?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1_000)
  maxPerTradeSol?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1_000)
  maxLossSol?: number;

  @IsOptional()
  @IsNumber()
  @Min(1_000)
  @Max(1_000_000)
  minLiquidityUsd?: number;

  @IsOptional()
  @IsBoolean()
  mirrorSells?: boolean;

  @IsOptional()
  @IsBoolean()
  requireSecuredLp?: boolean;

  @IsOptional()
  @IsIn(['active', 'paused'])
  status?: 'active' | 'paused';
}
