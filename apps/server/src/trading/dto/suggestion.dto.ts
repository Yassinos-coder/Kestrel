import { IsString, Matches } from 'class-validator';

const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class SuggestionDto {
  @IsString()
  @Matches(SOLANA_ADDRESS_PATTERN, { message: 'Enter a valid Solana contract address' })
  mint!: string;
}
