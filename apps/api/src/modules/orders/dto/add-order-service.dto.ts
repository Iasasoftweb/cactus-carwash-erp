import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddOrderServiceDto {
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
