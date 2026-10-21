import { IsNumber, Max, Min } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(0.001)
  @Max(100_000)
  amountSol!: number;
}
