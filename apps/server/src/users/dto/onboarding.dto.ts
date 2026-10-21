import { IsNumber, IsString, Length, Max, Min } from 'class-validator';

export class OnboardingDto {
  @IsString()
  @Length(1, 40)
  displayName!: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  startingPaperBalanceSol!: number;
}
