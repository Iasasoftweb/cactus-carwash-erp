import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCustomerVehicleDto {
  @IsString()
  vehicleTypeId!: string;

  @IsString()
  @MaxLength(180)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  plate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}