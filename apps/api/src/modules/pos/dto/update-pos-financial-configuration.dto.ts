import {
  IsBoolean,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class UpdatePosFinancialConfigurationDto {
  @IsBoolean()
  taxesEnabled!: boolean;

  @IsBoolean()
  serviceChargeEnabled!: boolean;

  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0)
  @Max(1)
  serviceChargeRate!: number;

  @IsBoolean()
  serviceChargeDineIn!: boolean;

  @IsBoolean()
  serviceChargeTakeaway!: boolean;

  @IsBoolean()
  serviceChargeDirect!: boolean;
}