import { IsString, Length } from 'class-validator';

export class ChallengeRequestDto {
  @IsString()
  @Length(32, 44)
  walletAddress!: string;
}

export class VerifyRequestDto {
  @IsString()
  @Length(32, 44)
  walletAddress!: string;

  @IsString()
  @Length(16, 128)
  nonce!: string;

  @IsString()
  @Length(60, 200)
  signature!: string;
}
