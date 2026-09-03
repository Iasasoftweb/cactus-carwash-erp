import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductCategoryDto {
  // Compatibilidad temporal con formularios anteriores. La categoría ya es empresarial.
  @IsOptional()
  @IsString()
  pointOfSaleId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  iconCode!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}