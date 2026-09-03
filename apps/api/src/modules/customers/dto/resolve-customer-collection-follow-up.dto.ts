import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResolveCustomerCollectionFollowUpDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  resolution!: string;
}