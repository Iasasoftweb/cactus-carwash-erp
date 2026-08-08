export type VehicleTypeResponse = {
  id: string;
  code: string;
  name: string;
};

export type CatalogServiceResponse = {
  id: string;
  priceId: string;
  code: string;
  name: string;
  category: string;
  vehicleTypeId: string;
  vehicleType: string;
  price: number;
  taxable: boolean;
};

export type EmployeeResponse = {
  id: string;
  employeeNo: string;
  fullName: string;
  phone: string | null;
  jobPosition: string | null;
  canOperateCash: boolean;
  active: boolean;
};  

export type OrderOperationalStatus =
  | 'RECEIVED'
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'SERVICES_COMPLETED'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderFinancialStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CREDIT'
  | 'CREDIT_NOTE_APPLIED';

export type OrderListItemResponse = {
  id: string;
  orderNumber: string;
  customerAlias: string;
  vehicle: string;
  vehicleType: string;
  plate: string | null;
  operationalStatus: OrderOperationalStatus;
  financialStatus: OrderFinancialStatus;
  total: number;
  servicesCount: number;
  employees: string[];
  entryAt: string;
};

export type OrderServiceLineResponse = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  category: string | null;
  employeeId: string | null;
  employeeName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: string;
};

export type OrderEventResponse = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
};

export type OrderChecklistItemResponse = {
  id: string;
  code: string;
  label: string;
  checked: boolean;
  notes: string | null;
  updatedAt: string;
};

export type OrderNoteResponse = {
  id: string;
  visibility: 'INTERNAL' | 'CUSTOMER';
  content: string;
  createdAt: string;
};

export type OrderDetailResponse = {
  id: string;
  orderNumber: string;
  customerAlias: string;
  vehicle: {
    id: string;
    description: string;
    plate: string | null;
    vehicleTypeId: string;
    vehicleType: string;
  };
  operationalStatus: OrderOperationalStatus;
  financialStatus: OrderFinancialStatus;
  qrToken: string;
  notes: string | null;
  entryAt: string;
  servicesCompletedAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  services: OrderServiceLineResponse[];
  events: OrderEventResponse[];
  checklist: OrderChecklistItemResponse[];
  observations: OrderNoteResponse[];
};

export type CreatedOrderResponse = {
  id: string;
  orderNumber: string;
  customerAlias: string;
  vehicle: string;
  vehicleType: string;
  operationalStatus: OrderOperationalStatus;
  financialStatus: OrderFinancialStatus;
  total: number;
  qrToken: string;
  createdAt: string;
};

export type CreateOrderItemRequest = {
  serviceId: string;
  employeeId: string;
  quantity: number;
};

export type CreateOrderRequest = {
  customerAlias: string;
  customerId?: string;
  vehicleTypeId: string;
  plate?: string;
  vehicleDescription: string;
  items: CreateOrderItemRequest[];
};

export type UpdateOrderStatusRequest = {
  status: OrderOperationalStatus;
};

export type UpdateOrderStatusResponse = {
  id: string;
  orderNumber: string;
  operationalStatus: OrderOperationalStatus;
  updatedAt: string;
};

export type UpdateChecklistItemRequest = {
  code: string;
  label: string;
  checked: boolean;
  notes?: string;
};

export type CreateOrderNoteRequest = {
  visibility: 'INTERNAL' | 'CUSTOMER';
  content: string;
};


export type OperationalAreaResponse = {
  id: string;
  code: string;
  name: string;
  ticketPrefix: string;
  color: string | null;
  icon: string | null;
  printerName: string | null;
  printCopies: number;
  autoPrint: boolean;
  slaMinutes: number | null;
};

export type OperationalTicketLineResponse = {
  id: string;
  serviceName: string;
  employeeName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OperationalTicketResponse = {
  area: OperationalAreaResponse;
  ticketCode: string;
  orderId: string;
  orderNumber: string;
  customerAlias: string;
  vehicleDescription: string;
  vehicleType: string;
  plate: string | null;
  createdAt: string;
  lines: OperationalTicketLineResponse[];
  total: number;
};

export type TicketPrintLogResponse = {
  id: string;
  ticketCode: string;
  printType: 'ORIGINAL' | 'REPRINT' | 'ADDITIONAL';
  copyNumber: number;
  printedAt: string;
};

export type AddOrderServiceRequest = {
  serviceId: string;
  employeeId: string;
  quantity: number;
};

export type AddOrderServiceResponse = {
  orderId: string;
  itemId: string;
  serviceName: string;
  operationalAreaCode: string;
  quantity: number;
  lineTotal: number;
  message: string;
};


export type PointOfSaleResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type ProductCategoryResponse = {
  id: string;
  code: string;
  name: string;
};

export type ProductResponse = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type:
    | 'PRODUCT'
    | 'LUBRICANT'
    | 'PART'
    | 'ACCESSORY'
    | 'SUPPLY'
    | 'FOOD'
    | 'BEVERAGE'
    | 'GIFT';
  price: number;
  taxRate: number;
  stockQuantity: number;
  trackInventory: boolean;
  pointOfSaleId: string;
  categoryId: string;
  categoryName: string;
};

export type PosCartItemRequest = {
  productId: string;
  quantity: number;
};

export type CreatePosMovementRequest = {
  pointOfSaleId: string;
  orderId?: string;
  customerAlias?: string;
  items: PosCartItemRequest[];
};

export type CreatePosMovementResponse = {
  id: string;
  reference: string;
  type: 'ORDER_ASSOCIATED' | 'DIRECT_SALE';
  orderId: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  message: string;
};


export type PosAccountStatus = 'OPEN' | 'PAID' | 'CANCELLED';

export type PosAccountItemResponse = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
};

export type PosAccountResponse = {
  id: string;
  reference: string;
  customerAlias: string;
  tableReference: string | null;
  status: PosAccountStatus;
  orderId: string | null;
  orderNumber: string | null;
  pointOfSaleId: string;
  pointOfSaleName: string;
  cashRegisterId: string | null;
  cashRegisterName: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  openedAt: string;
  paidAt: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  items: PosAccountItemResponse[];
};

export type OpenPosAccountRequest = {
  pointOfSaleId: string;
  cashRegisterId?: string;
  orderId?: string;
  customerAlias: string;
  tableReference?: string;
};

export type AddPosAccountItemsRequest = {
  items: PosCartItemRequest[];
};

export type PayPosAccountRequest = {
  paymentMethodId: string;
  paymentReference?: string;
};

export type DirectPosPaymentRequest = CreatePosMovementRequest & {
  cashRegisterId: string;
  paymentMethodId: string;
  paymentReference?: string;
};

export type CashRegisterResponse = {
  id: string;
  code: string;
  name: string;
  pointOfSaleId: string | null;
  pointOfSaleName: string | null;
  active: boolean;
};




export type PaymentMethodResponse = {
  id: string;
  code: string;
  name: string;
  type: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT' | 'OTHER';
};

export type CashierEmployeeResponse = {
  id: string;
  employeeNo: string;
  fullName: string;
  jobPosition: string | null;
};

export type CashRegisterSummaryResponse = {
  id: string;
  code: string;
  name: string;
  pointOfSaleName: string | null;
  active: boolean;
  openSession: CashSessionResponse | null;
};

export type CashMovementResponse = {
  id: string;
  type:
    | 'OPENING'
    | 'SALE'
    | 'COLLECTION'
    | 'CREDIT_SALE'
    | 'EXPENSE'
    | 'WITHDRAWAL'
    | 'DEPOSIT'
    | 'ADJUSTMENT'
    | 'CLOSING';
  amount: number;
  description: string;
  beneficiary: string | null;
  externalReference: string | null;
  createdAt: string;
};
export type CashSessionResponse = {
  id: string;
  cashRegisterId: string;
  cashRegisterName: string;
  employeeId: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  openingAmount: number;
  expectedAmount: number;
  countedAmount: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  movements: CashMovementResponse[];
};

export type OpenCashSessionRequest = {
  cashRegisterId: string;
  employeeId: string;
  openingAmount: number;
};

export type CreateCashMovementRequest = {
  type: 'WITHDRAWAL' | 'EXPENSE';
  amount: number;
  description: string;
  beneficiary: string;
  externalReference?: string;
};

export type CloseCashSessionRequest = {
  countedAmount: number;
};


export type CreateEmployeeRequest = {
  employeeNo: string;
  fullName: string;
  phone?: string;
  jobPosition?: string;
  canOperateCash: boolean;
};

export type UpdateEmployeeRequest = CreateEmployeeRequest & {
  active: boolean;
};

export type ExpenseCategoryResponse = {
  id: string;
  code: string;
  name: string;
};

export type ExpenseResponse = {
  id: string;
  categoryId: string;
  categoryName: string;
  cashRegisterId: string;
  cashRegisterName: string;
  requestedById: string;
  requestedByName: string;
  beneficiary: string;
  concept: string;
  amount: number;
  reference: string | null;
  status: 'PENDING' | 'APPROVED' | 'ISSUED' | 'CANCELLED';
  createdAt: string;
  issuedAt: string | null;
};

export type CreateExpenseRequest = {
  categoryId: string;
  cashRegisterId: string;
  requestedById: string;
  beneficiary: string;
  concept: string;
  amount: number;
  reference?: string;
};

export type CashSalesLineResponse = {
  kind: 'SERVICE' | 'PRODUCT';
  description: string;
  quantity: number;
  total: number;
};

export type CashPaymentBreakdownResponse = {
  methodCode: string;
  methodName: string;
  amount: number;
  affectsCash: boolean;
};

export type CashCloseReportResponse = {
  session: CashSessionResponse;
  payments: CashPaymentBreakdownResponse[];
  sales: CashSalesLineResponse[];
  totalSales: number;
  totalServices: number;
  totalProducts: number;
  printCount: number;
};

export type RegisterCashPrintRequest = {
  documentType: 'CURRENT_SUMMARY' | 'CLOSING_SUMMARY' | 'SALES_DETAIL';
  reprint: boolean;
  printedBy: string;
};

export type PayOrderRequest = {
  paymentMethodId: string;
  cashRegisterId: string;
  reference?: string;
};

export type PayOrderResponse = {
  orderId: string;
  orderNumber: string;
  amount: number;
  financialStatus: 'PAID';
  message: string;
};
