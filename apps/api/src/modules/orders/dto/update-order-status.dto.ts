import { IsIn } from 'class-validator';
import type { OrderOperationalStatus } from '@cactus/shared';

const allowedStatuses: OrderOperationalStatus[] = [
  'WAITING',
  'IN_PROGRESS',
  'SERVICES_COMPLETED',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export class UpdateOrderStatusDto {
  @IsIn(allowedStatuses)
  status!: OrderOperationalStatus;
}
