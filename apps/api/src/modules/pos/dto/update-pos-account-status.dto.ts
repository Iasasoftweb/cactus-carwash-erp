import { IsIn } from 'class-validator';

export class UpdatePosAccountStatusDto {
  @IsIn(['READY_TO_PAY', 'CANCELLED'])
  status!: 'READY_TO_PAY' | 'CANCELLED';
}
