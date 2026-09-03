import {
  Type } from 'class-transformer'; import {   ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';

const SALE_MODES = ['DINE_IN', 'TAKEAWAY', 'DIRECT'] as const;

export class PosCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  priceOverrideReason?: string;
}

export class CreatePosMovementDto {
  @IsString()
  @IsNotEmpty()
  pointOfSaleId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerAlias?: string;

  @IsOptional()
  @IsIn(SALE_MODES)
  saleMode?: (typeof SALE_MODES)[number];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosCartItemDto)
  items!: PosCartItemDto[];
}
