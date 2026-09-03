import {
  IsBoolean,
  IsInt,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePreparationStationDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsBoolean()
  active!: boolean;
}