import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePlatformCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string | null;

  @IsString()
  @Length(3, 3)
  currencyCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  currencySymbol!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @IsInt()
  @Min(1)
  branchLimit!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn([
    'POS',
    'CAR_WASH',
    'INVENTORY',
    'PURCHASES',
    'ACCOUNTS_RECEIVABLE',
    'ACCOUNTS_PAYABLE',
    'EXPENSES',
  ], { each: true })
  modules!: Array<
    | 'POS'
    | 'CAR_WASH'
    | 'INVENTORY'
    | 'PURCHASES'
    | 'ACCOUNTS_RECEIVABLE'
    | 'ACCOUNTS_PAYABLE'
    | 'EXPENSES'
  >;

  @IsBoolean()
  active!: boolean;
}
