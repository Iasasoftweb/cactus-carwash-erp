import { IsIn } from 'class-validator';
import type { KitchenTicketStatusValue } from '../kitchen-ticket.types';

const KITCHEN_TICKET_ITEM_STATUSES = [
  'PENDING',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;

export class UpdateKitchenTicketItemStatusDto {
  @IsIn(KITCHEN_TICKET_ITEM_STATUSES)
  status!: KitchenTicketStatusValue;
}