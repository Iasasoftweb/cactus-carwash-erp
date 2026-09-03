import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class ProductLevelPriceDto {
  @IsString()
  priceLevelId!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsBoolean()
  active!: boolean;
}

export class UpdateProductPricesDto {
  @IsString()
  pointOfSaleId!: string;

  @IsNumber()
  @Min(0)
  minimumPrice!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductLevelPriceDto)
  prices!: ProductLevelPriceDto[];
}
