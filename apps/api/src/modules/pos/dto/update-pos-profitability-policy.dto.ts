import {
  IsBoolean,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class UpdatePosProfitabilityPolicyDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  minimumGrossMarginPercent!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  minimumCostCoveragePercent!: number;

  @IsBoolean()
  alertLowMarginEnabled!: boolean;

  @IsBoolean()
  alertIncompleteCostEnabled!: boolean;
}