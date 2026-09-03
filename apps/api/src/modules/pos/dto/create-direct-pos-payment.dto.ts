import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PosCartItemDto } from './create-pos-movement.dto';

const SALE_MODES = ['DINE_IN', 'TAKEAWAY', 'DIRECT'] as const;

export class CreateDirectPosPaymentDto {
  @IsString()
  @IsNotEmpty()
  pointOfSaleId!: string;

  @IsString()
  @IsNotEmpty()
  cashRegisterId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerAlias?: string;

  @IsOptional()
  @IsIn(SALE_MODES)
  saleMode?: (typeof SALE_MODES)[number];

  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosCartItemDto)
  items!: PosCartItemDto[];
}
