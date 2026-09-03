import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSupplierInvoiceDto {
  @IsString()
  companyId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsString()
  invoiceNumber!: string;

  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  taxAmount!: number;

  @IsDateString()
  issuedAt!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
