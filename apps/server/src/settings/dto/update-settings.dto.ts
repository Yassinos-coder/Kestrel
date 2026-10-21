import { IsBoolean, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(['PAPER', 'LIVE'])
  mode?: 'PAPER' | 'LIVE';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSweep?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  liveBankrollSol?: number;
}
