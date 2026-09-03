import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInventoryCountDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
