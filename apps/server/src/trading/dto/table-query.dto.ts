import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const POSITION_SORTS = ['newest', 'oldest', 'profit_desc', 'profit_asc', 'pct_desc', 'pct_asc', 'mcap_desc', 'mcap_asc'] as const;
export const DECISION_SORTS = ['newest', 'oldest', 'mcap_desc', 'mcap_asc', 'confidence_desc'] as const;

export type PositionSort = (typeof POSITION_SORTS)[number];
export type DecisionSort = (typeof DECISION_SORTS)[number];

export class PageQueryDto {
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
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minMarketCap?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxMarketCap?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  search?: string;
}

export class PositionQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['OPEN', 'CLOSED'])
  status?: 'OPEN' | 'CLOSED';

  @IsOptional()
  @IsIn(POSITION_SORTS)
  sort?: PositionSort;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPnlPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPnlPct?: number;
}

export class DecisionQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['BUY', 'SKIP', 'REJECTED'])
  action?: 'BUY' | 'SKIP' | 'REJECTED';

  @IsOptional()
  @IsIn(DECISION_SORTS)
  sort?: DecisionSort;
}
