import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const CONTACT_TYPES = [
  'PHONE',
  'WHATSAPP',
  'EMAIL',
  'SMS',
  'IN_PERSON',
  'OTHER',
] as const;

const RESULTS = [
  'CONTACTED',
  'NO_ANSWER',
  'PROMISE_TO_PAY',
  'PAYMENT_REPORTED',
  'DISPUTED',
  'FOLLOW_UP_REQUIRED',
  'OTHER',
] as const;

export class CreateCustomerCollectionActivityDto {
  @IsIn(CONTACT_TYPES)
  contactType!:
    | 'PHONE'
    | 'WHATSAPP'
    | 'EMAIL'
    | 'SMS'
    | 'IN_PERSON'
    | 'OTHER';

  @IsIn(RESULTS)
  result!:
    | 'CONTACTED'
    | 'NO_ANSWER'
    | 'PROMISE_TO_PAY'
    | 'PAYMENT_REPORTED'
    | 'DISPUTED'
    | 'FOLLOW_UP_REQUIRED'
    | 'OTHER';

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  notes!: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string;

  @IsOptional()
  @IsDateString()
  promisedPaymentDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  promisedAmount?: number;
}