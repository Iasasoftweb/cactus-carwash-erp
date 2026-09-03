import { IsString } from 'class-validator';

export class UpdateCustomerPriceLevelDto {
  @IsString()
  priceLevelId!: string;
}
