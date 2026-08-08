import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class PayPosAccountDto {
  @IsUUID()
  paymentMethodId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string;
}
