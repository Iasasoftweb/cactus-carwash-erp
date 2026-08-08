import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePosAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  customerAlias!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tableReference?: string;
}
