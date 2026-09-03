import { IsIn } from 'class-validator';

const KITCHEN_TICKET_STATUSES = [
  'PENDING',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;

export class UpdateKitchenTicketStatusDto {
  @IsIn(KITCHEN_TICKET_STATUSES)
  status!: (typeof KITCHEN_TICKET_STATUSES)[number];
}