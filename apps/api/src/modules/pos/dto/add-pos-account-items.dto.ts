import {
  Type } from 'class-transformer'; import {   ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class AddPosAccountItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber({
    maxDecimalPlaces: 3,
  })
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

export class AddPosAccountItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddPosAccountItemDto)
  items!: AddPosAccountItemDto[];
}