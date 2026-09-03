import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInventoryTransferDto {
  @IsString()
  @IsNotEmpty()
  sourcePointOfSaleId!: string;

  @IsString()
  @IsNotEmpty()
  destinationPointOfSaleId!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
