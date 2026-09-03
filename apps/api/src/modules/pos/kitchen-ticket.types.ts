export type KitchenTicketStatusValue =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type KitchenTicketItemStatusValue = KitchenTicketStatusValue;

export type KitchenTicketItemResponse = {
  id: string;
  accountItemId: string;
  productId: string;
  productName: string;
  preparationStationId: string | null;
  preparationStationName: string | null;
  quantity: number;
  status: KitchenTicketStatusValue;
  notes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
};

export type KitchenTicketResponse = {
  id: string;
  ticketNumber: string;
  pointOfSaleId: string;
  pointOfSaleName: string;
  accountId: string;
  accountReference: string;
  customerAlias: string;
  tableReference: string | null;
  preparationStationId: string | null;
  preparationStationName: string | null;
  status: KitchenTicketStatusValue;
  notes: string | null;
  sentAt: string;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: KitchenTicketItemResponse[];
};

export type KitchenStationMetricsResponse = {
  preparationStationId: string | null;
  preparationStationName: string;
  activeTickets: number;
  pendingTickets: number;
  preparingTickets: number;
  readyTickets: number;
  overdueTickets: number;
  averageWaitMinutes: number;
  averagePreparationMinutes: number;
  averageTotalMinutes: number;
};

export type KitchenMetricsResponse = {
  pointOfSaleId: string;
  generatedAt: string;
  historyWindowHours: number;
  activeTickets: number;
  pendingTickets: number;
  preparingTickets: number;
  readyTickets: number;
  overdueTickets: number;
  averageWaitMinutes: number;
  averagePreparationMinutes: number;
  averageTotalMinutes: number;
  byStation: KitchenStationMetricsResponse[];
};

export type KitchenHistorySeriesPoint = {
  date: string;
  totalTickets: number;
  completedTickets: number;
  cancelledTickets: number;
  slaCompliantTickets: number;
  slaBreachedTickets: number;
  slaCompliancePercent: number;
  averageWaitMinutes: number;
  averagePreparationMinutes: number;
  averageTotalMinutes: number;
};

export type KitchenHistoryStationResponse = {
  preparationStationId: string | null;
  preparationStationName: string;
  totalTickets: number;
  completedTickets: number;
  cancelledTickets: number;
  slaCompliantTickets: number;
  slaBreachedTickets: number;
  slaCompliancePercent: number;
  averageWaitMinutes: number;
  averagePreparationMinutes: number;
  averageTotalMinutes: number;
  p50TotalMinutes: number;
  p90TotalMinutes: number;
};

export type KitchenHistoryResponse = {
  pointOfSaleId: string;
  dateFrom: string;
  dateTo: string;
  preparationStationId: string | null;
  preparationStationName: string | null;
  generatedAt: string;
  slaMinutes: number;
  totalTickets: number;
  completedTickets: number;
  cancelledTickets: number;
  slaCompliantTickets: number;
  slaBreachedTickets: number;
  slaCompliancePercent: number;
  averageWaitMinutes: number;
  averagePreparationMinutes: number;
  averageTotalMinutes: number;
  p50TotalMinutes: number;
  p90TotalMinutes: number;
  byDay: KitchenHistorySeriesPoint[];
  byStation: KitchenHistoryStationResponse[];
};