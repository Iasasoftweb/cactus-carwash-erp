import { IsBoolean } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends CreateEmployeeDto {
  @IsBoolean()
  active!: boolean;
}
