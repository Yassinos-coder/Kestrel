import { IsString, Length } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @Length(1, 60)
  name!: string;
}
