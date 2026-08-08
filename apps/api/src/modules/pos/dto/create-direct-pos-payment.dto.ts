import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PosCartItemDto } from './create-pos-movement.dto';

export class CreateDirectPosPaymentDto {
  @IsString()
  @IsNotEmpty()
  pointOfSaleId!: string;

  @IsString()
  @IsNotEmpty()
  cashRegisterId!: string;

  @IsOptional()
  @IsString()
  customerAlias?: string;

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
