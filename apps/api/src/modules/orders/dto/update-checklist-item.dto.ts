import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsBoolean()
  checked!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
