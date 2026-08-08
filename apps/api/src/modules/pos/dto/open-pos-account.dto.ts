import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OpenPosAccountDto {
  @IsString()
  @IsNotEmpty()
  pointOfSaleId!: string;

  @IsOptional()
  @IsString()
  cashRegisterId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  @IsNotEmpty()
  customerAlias!: string;

  @IsOptional()
  @IsString()
  tableReference?: string;
}
