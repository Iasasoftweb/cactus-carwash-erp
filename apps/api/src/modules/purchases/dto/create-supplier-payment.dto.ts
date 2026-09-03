import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsString()
  companyId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsString()
  supplierInvoiceId!: string;

  @IsString()
  paymentMethodId!: string;

  @IsOptional()
  @IsString()
  cashSessionId?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
