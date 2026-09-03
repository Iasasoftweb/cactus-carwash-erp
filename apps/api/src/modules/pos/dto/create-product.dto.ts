import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const PRODUCT_TYPES = [
  'PRODUCT',
  'LUBRICANT',
  'PART',
  'ACCESSORY',
  'SUPPLY',
  'FOOD',
  'BEVERAGE',
  'GIFT',
] as const;

const PRODUCT_SALE_UNITS = [
  'UNIT',
  'WEIGHT',
  'VOLUME',
  'SERVICE',
] as const;

export class CreateProductDto {
  @IsString()
  pointOfSaleId!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  preparationStationId?: string | null;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(PRODUCT_TYPES)
  type!: (typeof PRODUCT_TYPES)[number];

  @IsIn(PRODUCT_SALE_UNITS)
  saleUnit!: (typeof PRODUCT_SALE_UNITS)[number];

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number | null;

  @IsNumber()
  @Min(0)
  taxRate!: number;

  @IsNumber()
  @Min(0)
  stockQuantity!: number;

  @IsNumber()
  @Min(0)
  minimumStock!: number;

  @IsBoolean()
  trackInventory!: boolean;
}