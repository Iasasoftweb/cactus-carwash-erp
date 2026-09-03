import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class InventoryCountItemValueDto {
  @IsString()
  @IsNotEmpty()
  productBranchId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  countedQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class UpdateInventoryCountItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryCountItemValueDto)
  items!: InventoryCountItemValueDto[];
}
