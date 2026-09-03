
import { IsBoolean } from 'class-validator';

export class UpdateBusinessModuleDto {
  @IsBoolean()
  enabled!: boolean;
}
