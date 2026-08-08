import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PayOrderDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;

  @IsString()
  @IsNotEmpty()
  cashRegisterId!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
