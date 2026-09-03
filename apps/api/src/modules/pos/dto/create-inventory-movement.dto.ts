import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const TYPES = [
  'PURCHASE',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'RETURN_IN',
  'RETURN_OUT',
] as const;

export class CreateInventoryMovementDto {
  @IsString()
  pointOfSaleId!: string;

  @IsIn(TYPES)
  type!: (typeof TYPES)[number];

  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
