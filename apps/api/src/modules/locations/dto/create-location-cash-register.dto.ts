import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLocationCashRegisterDto {
  @IsString()
  @MinLength(1)
  branchId!: string;

  @IsOptional()
  @IsString()
  operationalAreaId?: string | null;

  @IsOptional()
  @IsString()
  pointOfSaleId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}