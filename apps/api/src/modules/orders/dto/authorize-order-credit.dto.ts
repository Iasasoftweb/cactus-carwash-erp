import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AuthorizeOrderCreditDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
