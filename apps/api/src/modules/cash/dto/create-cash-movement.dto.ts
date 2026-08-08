import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCashMovementDto {
  @IsIn(['WITHDRAWAL', 'EXPENSE'])
  type!: 'WITHDRAWAL' | 'EXPENSE';

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  beneficiary!: string;

  @IsOptional()
  @IsString()
  externalReference?: string;
}
