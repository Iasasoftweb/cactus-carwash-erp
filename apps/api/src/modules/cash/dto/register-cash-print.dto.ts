import { IsBoolean, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RegisterCashPrintDto {
  @IsIn(['CURRENT_SUMMARY', 'CLOSING_SUMMARY', 'SALES_DETAIL'])
  documentType!: 'CURRENT_SUMMARY' | 'CLOSING_SUMMARY' | 'SALES_DETAIL';

  @IsBoolean()
  reprint!: boolean;

  @IsString()
  @IsNotEmpty()
  printedBy!: string;
}
