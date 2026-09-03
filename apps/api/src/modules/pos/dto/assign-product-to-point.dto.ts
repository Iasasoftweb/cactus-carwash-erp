import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AssignProductToPointDto {
  @IsString()
  pointOfSaleId!: string;

  @IsOptional()
  @IsString()
  preparationStationId?: string | null;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
  minimumPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number | null;

  @IsNumber()
  @Min(0)
  stockQuantity!: number;

  @IsNumber()
  @Min(0)
  minimumStock!: number;

  @IsBoolean()
  trackInventory!: boolean;
}
