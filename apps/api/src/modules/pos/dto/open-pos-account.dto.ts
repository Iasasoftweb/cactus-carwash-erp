import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

const SALE_MODES = ['DINE_IN', 'TAKEAWAY', 'DIRECT'] as const;

export class OpenPosAccountDto {
  @IsString()
  @IsNotEmpty()
  pointOfSaleId!: string;

  @IsOptional()
  @IsString()
  cashRegisterId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  customerAlias!: string;

  @IsOptional()
  @IsString()
  tableReference?: string;

  @IsOptional()
  @IsIn(SALE_MODES)
  saleMode?: (typeof SALE_MODES)[number];
}
