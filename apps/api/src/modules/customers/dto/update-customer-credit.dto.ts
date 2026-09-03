import {
  IsBoolean,
  IsInt,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class UpdateCustomerCreditDto {
  @IsBoolean()
  creditEnabled!: boolean;

  @IsNumber()
  @Min(0)
  creditLimit!: number;

  @IsInt()
  @Min(0)
  @Max(3650)
  creditDays!: number;
}