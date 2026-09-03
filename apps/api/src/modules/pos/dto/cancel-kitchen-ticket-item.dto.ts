import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CancelKitchenTicketItemDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;
}