import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SendToKitchenDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}