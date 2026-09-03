import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PayCustomerInvoiceDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  paymentMethodId!: string;

  @IsString()
  cashRegisterId!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
