import { IsBoolean } from 'class-validator';

export class UpdatePosCapabilityDto {
  @IsBoolean()
  enabled!: boolean;
}
