import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  cashRegisterId!: string;

  @IsString()
  @IsNotEmpty()
  requestedById!: string;

  @IsString()
  @IsNotEmpty()
  beneficiary!: string;

  @IsString()
  @IsNotEmpty()
  concept!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reference?: string;
}
