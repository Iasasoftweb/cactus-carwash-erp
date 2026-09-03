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
  branchId: string;
  branchName: string;
  employeeNo: string;
  fullName: string;
  phone: string | null;
  jobPosition: string | null;
  canOperateCash: boolean;
  active: boolean;
};

export type EmployeeBranchResponse = {
  id: string;
  code: string;
  name: string;
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
  pointOfSaleId: string;
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
  companyId?: string;
  branchId?: string;
  code: string;
  name: string;
  ticketPrefix: string;
  color: string | null;
  icon: string | null;
  printerName: string | null;
  printCopies: number;
  autoPrint: boolean;
  slaMinutes: number | null;
  active?: boolean;
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


export type PosUiMode =
  | 'TOUCH'
  | 'DESKTOP';

export type PointOfSaleResponse = {
  id: string;
  companyId: string;
  branchId: string;
  branchName?: string;
  code: string;
  name: string;
  description: string | null;
  uiMode: PosUiMode;
  capabilities?: PosCapabilityResponse[];
};

export type BusinessModuleType =
  | 'POS'
  | 'CAR_WASH'
  | 'INVENTORY'
  | 'PURCHASES'
  | 'ACCOUNTS_RECEIVABLE'
  | 'ACCOUNTS_PAYABLE'
  | 'EXPENSES';

export type PosCapabilityType =
  | 'RETAIL'
  | 'FOOD_SERVICE'
  | 'WEIGHTED_PRODUCTS'
  | 'HOLD_ORDERS'
  | 'TABLES'
  | 'KITCHEN_TICKETS'
  | 'DELIVERY';

export type ProductSaleUnit =
  | 'UNIT'
  | 'WEIGHT'
  | 'VOLUME'
  | 'SERVICE';

export type CompanyModuleResponse = {
  id: string;
  companyId: string;
  module: BusinessModuleType;
  enabled: boolean;
};

export type BranchModuleResponse = {
  id: string;
  companyId: string;
  branchId: string;
  module: BusinessModuleType;
  enabled: boolean;
};

export type PosCapabilityResponse = {
  id: string;
  pointOfSaleId: string;
  capability: PosCapabilityType;
  enabled: boolean;
};

export type PosFinancialConfigurationResponse = {
  id: string | null;
  pointOfSaleId: string;
  taxesEnabled: boolean;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  serviceChargeDineIn: boolean;
  serviceChargeTakeaway: boolean;
  serviceChargeDirect: boolean;
};

export type UpdatePosFinancialConfigurationRequest = {
  taxesEnabled: boolean;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  serviceChargeDineIn: boolean;
  serviceChargeTakeaway: boolean;
  serviceChargeDirect: boolean;
};

export type UpdateBusinessModuleRequest = {
  module: BusinessModuleType;
  enabled: boolean;
};

export type UpdatePosCapabilityRequest = {
  capability: PosCapabilityType;
  enabled: boolean;
};

export type ProductCategoryResponse = {
  id: string;
  code: string;
  name: string;
  iconCode: string;
  sortOrder: number;
  active: boolean;
};
export type PreparationStationResponse = {
  id: string;
  pointOfSaleId: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type CreatePreparationStationRequest = {
  pointOfSaleId: string;
  code: string;
  name: string;
  sortOrder?: number;
};

export type UpdatePreparationStationRequest = {
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type ProductResponse = {
  id: string;
  sku: string;
  barcode: string | null;
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

  saleUnit: ProductSaleUnit;

  price: number;
  minimumPrice?: number;
  unitCost: number | null;
  taxRate: number;
  stockQuantity: number;
  trackInventory: boolean;
  pointOfSaleId: string;
  categoryId: string;
  categoryName: string;
  preparationStationId: string | null;
  preparationStationName: string | null;
  active: boolean;
  imageUrl: string | null;
  minimumStock: number;
};

export type ProductType =
  | 'PRODUCT'
  | 'LUBRICANT'
  | 'PART'
  | 'ACCESSORY'
  | 'SUPPLY'
  | 'FOOD'
  | 'BEVERAGE'
  | 'GIFT';

export type CreateProductRequest = {
  pointOfSaleId: string;
  categoryId: string;
  preparationStationId?: string | null;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  type: ProductType;

  saleUnit: ProductSaleUnit;

  price: number;
  unitCost?: number | null;
  taxRate: number;
  stockQuantity: number;
  minimumStock: number;
  trackInventory: boolean;
};

export type UpdateProductRequest = CreateProductRequest & {
  active: boolean;
};

export type AssignProductToPointRequest = {
  pointOfSaleId: string;
  preparationStationId?: string | null;
  price: number;
  minimumPrice: number;
  unitCost?: number | null;
  stockQuantity: number;
  minimumStock: number;
  trackInventory: boolean;
};

export type PriceLevelResponse = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
  active: boolean;
};

export type ProductPriceLevelResponse = {
  id: string;
  productBranchId: string;
  priceLevelId: string;
  priceLevelCode: string;
  priceLevelName: string;
  price: number;
  active: boolean;
};

export type UpdateProductPriceLevelsRequest = {
  minimumPrice: number;
  prices: Array<{
    priceLevelId: string;
    price: number;
    active: boolean;
  }>;
};

export type CreatePriceLevelRequest = {
  code: string;
  name: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type UpdatePriceLevelRequest = {
  code?: string;
  name?: string;
  isDefault?: boolean;
  sortOrder?: number;
  active?: boolean;
};

export type ProductPricingResponse = {
  productId: string;
  productName: string;
  sku: string;
  productBranchId: string;
  pointOfSaleId: string;
  minimumPrice: number;
  prices: Array<{
    id: string | null;
    productBranchId: string;
    priceLevelId: string;
    priceLevelCode: string;
    priceLevelName: string;
    isDefault: boolean;
    price: number;
    active: boolean;
  }>;
};

export type UpdateProductPricingRequest = {
  pointOfSaleId: string;
  minimumPrice: number;
  prices: Array<{
    priceLevelId: string;
    price: number;
    active: boolean;
  }>;
};

export type UpdateCustomerPriceLevelRequest = {
  priceLevelId: string;
};

export type CustomerPriceLevelAssignmentResponse = {
  customerId: string;
  customerName: string;
  priceLevelId: string;
  priceLevelCode: string;
  priceLevelName: string;
};


export type PosCartItemRequest = {
  productId: string;
  quantity: number;
  unitPrice?: number;
  priceOverrideReason?: string;
};

export type CreatePosMovementRequest = {
  pointOfSaleId: string;
  orderId?: string;
  customerId?: string;
  customerAlias?: string;
  saleMode?: PosSaleMode;
  items: PosCartItemRequest[];
};

export type CreatePosMovementResponse = {
  id: string;
  reference: string;
  type: 'ORDER_ASSOCIATED' | 'DIRECT_SALE';
  orderId: string | null;
  saleMode: PosSaleMode;
  subtotal: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  total: number;
  customerId: string | null;
  customerAlias: string | null;
  priceLevelId: string | null;
  priceLevelCode: string | null;
  priceLevelName: string | null;
  items: Array<{
    productId: string;
    productName: string;
    saleUnit: ProductSaleUnit;
    quantity: number;
    unitPrice: number;
    standardUnitPrice: number;
    lineTotal: number;
  }>;
  message: string;
};


export type PosSaleMode =
  | 'DINE_IN'
  | 'TAKEAWAY'
  | 'DIRECT';

export type PosDailySalesPaymentMethodResponse = {
  paymentMethodId: string;
  paymentMethodName: string;
  transactions: number;
  amount: number;
};

export type PosDailySalesModeResponse = {
  saleMode: PosSaleMode;
  transactions: number;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
};

export type PosDailySalesReportResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  salesCount: number;
  directSalesCount: number;
  accountSalesCount: number;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  byPaymentMethod: PosDailySalesPaymentMethodResponse[];
  bySaleMode: PosDailySalesModeResponse[];
};

export type PosSalesComparisonMetricsResponse = {
  salesCount: number;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  averageTicket: number;
};

export type PosSalesComparisonDeltaResponse = {
  salesCountPercent: number | null;
  subtotalPercent: number | null;
  taxAmountPercent: number | null;
  serviceChargeAmountPercent: number | null;
  totalPercent: number | null;
  averageTicketPercent: number | null;
};

export type PosSalesComparisonResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  currentDateFrom: string;
  currentDateTo: string;
  previousDateFrom: string;
  previousDateTo: string;
  generatedAt: string;
  current: PosSalesComparisonMetricsResponse;
  previous: PosSalesComparisonMetricsResponse;
  delta: PosSalesComparisonDeltaResponse;
};

export type PosSalesTrendDayResponse = {
  date: string;
  salesCount: number;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  averageTicket: number;
};

export type PosSalesTrendResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  byDay: PosSalesTrendDayResponse[];
};

export type PosProfitabilityCoverageStatus =
  | 'COMPLETE'
  | 'PARTIAL'
  | 'NO_COST_DATA';

export type PosProfitabilitySummaryResponse = {
  netRevenue: number;
  marginBasisRevenue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  grossMarginPercent: number | null;
  unknownCostRevenue: number;
  knownCostLines: number;
  unknownCostLines: number;
  costCoveragePercent: number;
  costCoverageStatus: PosProfitabilityCoverageStatus;
};

export type PosProfitabilityProductResponse =
  PosProfitabilitySummaryResponse & {
    productId: string;
    productName: string;
    sku: string;
    saleUnit: ProductSaleUnit;
    quantity: number;
    categoryId: string;
    categoryName: string;
  };

export type PosProfitabilityCategoryResponse =
  PosProfitabilitySummaryResponse & {
    categoryId: string;
    categoryName: string;
    productsCount: number;
  };

export type PosProfitabilityReportResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  classificationBasis: 'CURRENT_PRODUCT_CATALOG';
  summary: PosProfitabilitySummaryResponse;
  byProduct: PosProfitabilityProductResponse[];
  byCategory: PosProfitabilityCategoryResponse[];
};

export type PosProfitabilityTrendDayResponse = {
  date: string;
  netRevenue: number;
  marginBasisRevenue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  grossMarginPercent: number | null;
  unknownCostRevenue: number;
  knownCostLines: number;
  unknownCostLines: number;
  costCoveragePercent: number;
  costCoverageStatus: PosProfitabilityCoverageStatus;
};

export type PosProfitabilityTrendResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  byDay: PosProfitabilityTrendDayResponse[];
};

export type PosProfitabilityPolicyResponse = {
  id: string | null;
  pointOfSaleId: string;
  enabled: boolean;
  minimumGrossMarginPercent: number;
  minimumCostCoveragePercent: number;
  alertLowMarginEnabled: boolean;
  alertIncompleteCostEnabled: boolean;
};

export type UpdatePosProfitabilityPolicyRequest = {
  enabled: boolean;
  minimumGrossMarginPercent: number;
  minimumCostCoveragePercent: number;
  alertLowMarginEnabled: boolean;
  alertIncompleteCostEnabled: boolean;
};

export type PosProfitabilityAlertType =
  | 'LOW_MARGIN'
  | 'INCOMPLETE_COST';

export type PosProfitabilityAlertScope =
  | 'SUMMARY'
  | 'PRODUCT'
  | 'CATEGORY'
  | 'DAY';

export type PosProfitabilityAlertResponse = {
  type: PosProfitabilityAlertType;
  scope: PosProfitabilityAlertScope;
  entityId: string | null;
  entityName: string;
  date: string | null;
  actualValue: number;
  thresholdValue: number;
  message: string;
};

export type PosProfitabilityEvaluationResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  policy: PosProfitabilityPolicyResponse;
  alerts: PosProfitabilityAlertResponse[];
  summary: {
    totalAlerts: number;
    lowMarginAlerts: number;
    incompleteCostAlerts: number;
    affectedProducts: number;
    affectedCategories: number;
    affectedDays: number;
  };
};

export type PosOperationalProfitabilityMetricsResponse = {
  salesCount: number;
  netRevenue: number;
  marginBasisRevenue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  grossMarginPercent: number | null;
  unknownCostRevenue: number;
  knownCostLines: number;
  unknownCostLines: number;
  costCoveragePercent: number;
  costCoverageStatus: PosProfitabilityCoverageStatus;
};

export type PosProfitabilityByEmployeeResponse =
  PosOperationalProfitabilityMetricsResponse & {
    employeeId: string;
    employeeNo: string;
    employeeName: string;
    sessionsCount: number;
  };

export type PosProfitabilityByShiftResponse =
  PosOperationalProfitabilityMetricsResponse & {
    cashSessionId: string;
    cashRegisterId: string;
    cashRegisterName: string;
    employeeId: string;
    employeeNo: string;
    employeeName: string;
    openedAt: string;
    closedAt: string | null;
    status: 'OPEN' | 'CLOSED';
  };

export type PosOperationalProfitabilityReportResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  attributionBasis: 'PAYMENT_CASH_SESSION';
  unattributedSalesCount: number;
  byEmployee: PosProfitabilityByEmployeeResponse[];
  byShift: PosProfitabilityByShiftResponse[];
};

export type PosProfitabilityByPointResponse =
  PosProfitabilitySummaryResponse & {
    pointOfSaleId: string;
    pointOfSaleName: string;
    salesCount: number;
    averageTicket: number;
  };

export type PosProfitabilityByPointReportResponse = {
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  pointsCount: number;
  summary: PosProfitabilitySummaryResponse & {
    salesCount: number;
    averageTicket: number;
  };
  byPoint: PosProfitabilityByPointResponse[];
};

export type PosSalesTransactionType =
  | 'DIRECT'
  | 'ACCOUNT';

export type PosSalesTransactionResponse = {
  id: string;
  transactionType: PosSalesTransactionType;
  reference: string;
  pointOfSaleId: string;
  pointOfSaleName: string;
  saleMode: PosSaleMode;
  customerAlias: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  paidAt: string;
};

export type PosSalesTransactionsReportResponse = {
  pointOfSaleId: string;
  pointOfSaleName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  transactions: PosSalesTransactionResponse[];
};

export type PosAccountStatus = 'OPEN' | 'PAID' | 'CANCELLED';

export type PosAccountItemResponse = {
  id: string;
  productId: string;
  productName: string;
  saleUnit: ProductSaleUnit;
  quantity: number;
  unitPrice: number;
  standardUnitPrice: number;
  priceLevelCode: string | null;
  priceLevelName: string | null;
  manualPriceOverride: boolean;
  priceOverrideReason: string | null;
  unitCost: number | null;
  costTotal: number | null;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
};

export type PosAccountResponse = {
  id: string;
  reference: string;
  customerId: string | null;
  priceLevelId: string | null;
  priceLevelCode: string | null;
  priceLevelName: string | null;
  customerAlias: string;
  tableReference: string | null;
  status: PosAccountStatus;
  saleMode: PosSaleMode;
  orderId: string | null;
  orderNumber: string | null;
  pointOfSaleId: string;
  pointOfSaleName: string;
  cashRegisterId: string | null;
  cashRegisterName: string | null;
  subtotal: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
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
  customerId?: string;
  customerAlias: string;
  tableReference?: string;
  saleMode?: PosSaleMode;
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
  branchId: string;
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
  documentType:
    | 'CURRENT_SUMMARY'
    | 'CLOSING_SUMMARY'
    | 'SALES_DETAIL';

  reprint: boolean;
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

export type AuthorizeOrderCreditRequest = {
  notes?: string;
};

export type AuthorizeOrderCreditResponse = {
  orderId: string;
  orderNumber: string;
  customerId: string;
  authorizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  previousExposure: number;
  newExposure: number;
  creditLimit: number;
  creditDays: number;
  dueDate: string;
  financialStatus: 'CREDIT';
  message: string;
};

export type CustomerInvoiceStatus =
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CREDIT'
  | 'CREDIT_NOTED';

export type CustomerInvoiceResponse = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  invoiceNumber: string;
  status: CustomerInvoiceStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  balance: number;
  issuedAt: string;
  dueDate: string | null;
};


export type CustomerInvoicePaymentResponse = {
  paymentId: string;
  amount: number;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodType: string;
  reference: string | null;
  receivedAt: string;
};

export type CustomerInvoiceCreditNoteDetailResponse = {
  id: string;
  creditNoteNo: string;
  status: CreditNoteStatus;
  amount: number;
  reason: string;
  issuedAt: string;
  cancelledAt: string | null;
};

export type CustomerInvoiceDetailResponse =
  CustomerInvoiceResponse & {
    payments: CustomerInvoicePaymentResponse[];
    creditNotes: CustomerInvoiceCreditNoteDetailResponse[];
  };

export type CustomerReceivableAgingBucket =
  | 'CURRENT'
  | '1_30'
  | '31_60'
  | '61_90'
  | '90_PLUS';

export type CustomerReceivableAgingInvoiceResponse = {
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  issuedAt: string;
  dueDate: string | null;
  total: number;
  balance: number;
  daysOverdue: number;
  bucket: CustomerReceivableAgingBucket;
};

export type CustomerReceivableAgingCustomerResponse = {
  customerId: string;
  customerName: string;
  totalReceivable: number;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  overdueBalance: number;
  openInvoices: number;
  overdueInvoices: number;
};

export type CustomerReceivableAgingResponse = {
  asOf: string;
  summary: {
    totalReceivable: number;
    current: number;
    days1To30: number;
    days31To60: number;
    days61To90: number;
    days90Plus: number;
    overdueBalance: number;
    openInvoices: number;
    overdueInvoices: number;
    overdueCustomers: number;
  };
  customers: CustomerReceivableAgingCustomerResponse[];
  invoices: CustomerReceivableAgingInvoiceResponse[];
};

export type PayCustomerInvoiceRequest = {
  amount: number;
  paymentMethodId: string;
  cashRegisterId: string;
  reference?: string;
};

export type PayCustomerInvoiceResponse = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  orderId: string;
  amount: number;
  previousBalance: number;
  balance: number;
  status: 'PARTIALLY_PAID' | 'PAID';
  paymentId: string;
  message: string;
};

export type CancelCustomerCreditNoteResponse = {
  creditNoteId: string;
  creditNoteNo: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  orderId: string;
  previousBalance: number;
  balance: number;
  invoiceStatus:
    | 'CREDIT'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'CREDIT_NOTED';
  orderFinancialStatus:
    | 'CREDIT'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'CREDIT_NOTE_APPLIED';
  cancelledAt: string;
  message: string;
};


export type CreditNoteStatus =
  | 'ISSUED'
  | 'CANCELLED';

export type CustomerCreditNoteResponse = {
  id: string;
  creditNoteNo: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  orderId: string;
  status: CreditNoteStatus;
  amount: number;
  reason: string;
  issuedAt: string;
};

export type IssueCustomerCreditNoteRequest = {
  amount: number;
  reason: string;
};

export type IssueCustomerCreditNoteResponse = {
  creditNote: CustomerCreditNoteResponse;
  previousBalance: number;
  balance: number;
  invoiceStatus:
    | 'ISSUED'
    | 'PARTIALLY_PAID'
    | 'CREDIT'
    | 'CREDIT_NOTED';
  orderFinancialStatus:
    | 'PENDING'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'CREDIT'
    | 'CREDIT_NOTE_APPLIED';
  message: string;
};

export type CustomerCollectionContactType =
  | 'PHONE'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'SMS'
  | 'IN_PERSON'
  | 'OTHER';

export type CustomerCollectionResult =
  | 'CONTACTED'
  | 'NO_ANSWER'
  | 'PROMISE_TO_PAY'
  | 'PAYMENT_REPORTED'
  | 'DISPUTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'OTHER';

export type CustomerCollectionActivityResponse = {
  id: string;
  customerId: string;
  contactType: CustomerCollectionContactType;
  result: CustomerCollectionResult;
  notes: string;
  nextFollowUpAt: string | null;
  promisedPaymentDate: string | null;
  promisedAmount: number | null;
  createdAt: string;
  createdById: string | null;
  createdByName: string | null;
};

export type CreateCustomerCollectionActivityRequest = {
  contactType: CustomerCollectionContactType;
  result: CustomerCollectionResult;
  notes: string;
  nextFollowUpAt?: string;
  promisedPaymentDate?: string;
  promisedAmount?: number;
};

export type InventoryMovementType =
  | 'INITIAL'
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RETURN_IN'
  | 'RETURN_OUT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN';

export type InventoryMovementResponse = {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CreateInventoryMovementRequest = {
   pointOfSaleId: string;
  type:
    | 'PURCHASE'
    | 'ADJUSTMENT_IN'
    | 'ADJUSTMENT_OUT'
    | 'RETURN_IN'
    | 'RETURN_OUT';
  quantity: number;
  referenceNumber?: string;
  note?: string;
};

export type SupplierResponse = {
  id: string;
  companyId: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierRequest = {
  companyId: string;
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type UpdateSupplierRequest = {
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
};

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type PurchaseOrderItemResponse = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
};

export type PurchaseOrderResponse = {
  id: string;
  companyId: string;
  branchId: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  createdBy: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemResponse[];
};

export type CreatePurchaseOrderRequest = {
  companyId: string;
  branchId: string;
  supplierId: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
};

export type ReceivePurchaseOrderRequest = {
  items: Array<{
    purchaseOrderItemId: string;
    quantity: number;
  }>;
};

export interface PurchaseOrderReceiptResponse {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  receivedBy: string | null;
  receivedAt: string;
}
export type SupplierInvoiceStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export type SupplierInvoiceResponse = {
  id: string;
  companyId: string;
  branchId: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  invoiceNumber: string;
  status: SupplierInvoiceStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  balance: number;
  issuedAt: string;
  dueDate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierInvoiceRequest = {
  companyId: string;
  branchId: string;
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  issuedAt: string;
  dueDate?: string;
  notes?: string;
};

export type SupplierPaymentResponse = {
  id: string;
  companyId: string;
  branchId: string;
  supplierId: string;
  supplierName: string;
  paymentMethodId: string;
  paymentMethodName: string;
  status: 'ISSUED' | 'CANCELLED';
  reference: string | null;
  description: string | null;
  amount: number;
  paidAt: string;
  createdBy: string | null;
  createdAt: string;
};

export type CreateSupplierPaymentRequest = {
  companyId: string;
  branchId: string;
  supplierId: string;
  supplierInvoiceId: string;
  paymentMethodId: string;
  amount: number;
  reference?: string;
  description?: string;
  cashSessionId?: string;
};

export type AccountsPayableSummaryResponse = {
  totalBalance: number;
  overdueBalance: number;
  dueSoonBalance: number;
  pendingInvoices: number;
  overdueInvoices: number;
  dueSoonInvoices: number;
};

export type AccountsPayableAgingBucket = {
  key:
    | 'CURRENT'
    | 'DAYS_1_30'
    | 'DAYS_31_60'
    | 'DAYS_61_90'
    | 'OVER_90';
  label: string;
  amount: number;
};

export type AccountsPayableSupplierDebt = {
  supplierId: string;
  supplierName: string;
  invoiced: number;
  paid: number;
  balance: number;
  overdueBalance: number;
  invoiceCount: number;
};

export type AccountsPayableReportResponse = {
  dateFrom: string | null;
  dateTo: string | null;
  supplierId: string | null;

  invoiced: number;
  paid: number;
  pendingBalance: number;
  overdueBalance: number;

  totalInvoices: number;
  pendingInvoices: number;
  partiallyPaidInvoices: number;
  paidInvoices: number;
  cancelledInvoices: number;

  aging: AccountsPayableAgingBucket[];
  suppliers: AccountsPayableSupplierDebt[];
};

export const POS_REPORTING_PERMISSIONS = {
  viewSalesReport: 'POS_REPORT_VIEW',
  viewExecutiveDashboard: 'POS_EXECUTIVE_VIEW',
  viewProfitability: 'POS_PROFITABILITY_VIEW',
  viewOperationalProfitability: 'POS_OPERATIONAL_PROFITABILITY_VIEW',
  comparePoints: 'POS_MULTI_POINT_PROFITABILITY_VIEW',
  manageProfitabilityPolicy: 'POS_PROFITABILITY_POLICY_MANAGE',
  exportReporting: 'POS_REPORT_EXPORT',
} as const;

export type PosReportingPermission =
  (typeof POS_REPORTING_PERMISSIONS)[keyof typeof POS_REPORTING_PERMISSIONS];

export type AuthUserResponse = {
  id: string;
  companyId: string;
  username: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  branchAccessMode: 'ALL' | 'ASSIGNED';
  branchIds: string[];
  isPlatformAdmin: boolean;
};

export type PlatformCompanyResponse = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  currencyCode: string;
  currencySymbol: string;
  logoUrl: string | null;
  branchLimit: number;
  modules: BusinessModuleType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  branchCount: number;
  activeBranchCount: number;
  userCount: number;
};

export type CreatePlatformCompanyRequest = {
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  currencyCode: string;
  currencySymbol: string;
  logoUrl?: string | null;
  branchLimit: number;
  modules: BusinessModuleType[];
  active?: boolean;
  branchName: string;
  branchCode: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  adminFullName: string;
  adminUsername: string;
  adminEmail?: string | null;
  adminPassword: string;
};

export type UpdatePlatformCompanyRequest = {
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  currencyCode: string;
  currencySymbol: string;
  logoUrl?: string | null;
  branchLimit: number;
  modules: BusinessModuleType[];
  active: boolean;
};

export type DashboardBranchOptionResponse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
};

export type DashboardContextResponse = {
  companyId: string;
  companyName: string;
  companyTaxId: string | null;
  companyLogoUrl: string | null;
  currencyCode: string;
  currencySymbol: string;
  branches: DashboardBranchOptionResponse[];
  canViewFinancialDashboard: boolean;
  canViewAllBranchesFinancial: boolean;
};

export type DashboardFinancialSummaryResponse = {
  scope: 'COMPANY' | 'BRANCH';
  branchId: string | null;
  branchName: string | null;
  generatedAt: string;
  salesToday: number;
  salesTransactionsToday: number;
  expensesToday: number;
  expensesIssuedToday: number;
  operatingNetToday: number;
  accountsReceivableBalance: number;
  overdueReceivableBalance: number;
  overdueReceivableInvoices: number;
  accountsPayableBalance: number;
  overduePayableBalance: number;
  overduePayableInvoices: number;
};

export type AuthLoginRequest = {
  username: string;
  password: string;
  companyId?: string;
};

export type AuthLoginResponse = {
  accessToken: string;
  user: AuthUserResponse;
};


export type CustomerTypeValue =
  | 'GENERAL'
  | 'REGISTERED'
  | 'CREDIT';

export type CustomerResponse = {
  id: string;
  companyId: string;
  type: CustomerTypeValue;
  displayName: string;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  creditEnabled: boolean;
  creditLimit: number;
  creditDays: number;
  active: boolean;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomerRequest = {
  type?: 'GENERAL' | 'REGISTERED';
  displayName: string;
  legalName?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  active?: boolean;
};

export type UpdateCustomerRequest = {
  type?: 'GENERAL' | 'REGISTERED';
  displayName?: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  active?: boolean;
};

export type UpdateCustomerCreditRequest = {
  creditEnabled: boolean;
  creditLimit: number;
  creditDays: number;
};

export type CustomerVehicleResponse = {
  id: string;
  customerId: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  brandId: string | null;
  brandName: string | null;
  modelId: string | null;
  modelName: string | null;
  plate: string | null;
  color: string | null;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomerVehicleRequest = {
  vehicleTypeId: string;
  description: string;
  plate?: string;
  color?: string;
  brandId?: string;
  modelId?: string;
  active?: boolean;
};

export type UserStatusValue =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'LOCKED';

export type UserRoleSummaryResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type PermissionSummaryResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type AdminUserResponse = {
  id: string;
  companyId: string;
  username: string;
  email: string | null;
  fullName: string;
  status: UserStatusValue;
  roles: UserRoleSummaryResponse[];
  branchAccessMode: UserBranchAccessMode;
  branchIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type UserBranchAccessMode =
  | 'ALL'
  | 'ASSIGNED';

export type UserBranchOptionResponse = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export type CreateAdminUserRequest = {
  username: string;
  email?: string;
  fullName: string;
  password: string;
  roleIds?: string[];
};

export type UpdateAdminUserRequest = {
  username?: string;
  email?: string | null;
  fullName?: string;
};

export type UpdateAdminUserStatusRequest = {
  status: UserStatusValue;
};

export type ResetAdminUserPasswordRequest = {
  password: string;
};

export type UpdateAdminUserRolesRequest = {
  roleIds: string[];
};

export type UpdateAdminUserBranchAccessRequest = {
  branchAccessMode: UserBranchAccessMode;
  branchIds: string[];
};

export type CustomerCollectionFollowUpResponse = {
  activityId: string;
  customerId: string;
  customerName: string;
  result: CustomerCollectionResult;
  contactType: CustomerCollectionContactType;
  notes: string;

  nextFollowUpAt: string;

  promisedPaymentDate: string | null;
  promisedAmount: number | null;

  createdAt: string;
  createdByName: string | null;

  status:
    | 'OVERDUE'
    | 'TODAY'
    | 'UPCOMING';
};

export type CustomerCollectionFollowUpsResponse = {
  asOf: string;

  summary: {
    total: number;
    overdue: number;
    today: number;
    upcoming: number;
  };

  items: CustomerCollectionFollowUpResponse[];
};

export type ResolveCustomerCollectionFollowUpRequest = {
  resolution: string;
};

export type ResolveCustomerCollectionFollowUpResponse = {
  activityId: string;
  customerId: string;
  followUpResolvedAt: string;
  followUpResolvedById: string | null;
  followUpResolvedByName: string | null;
  followUpResolution: string;
  message: string;
};
export type BranchAdminResponse = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateBranchRequest = {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  active?: boolean;
};

export type UpdateBranchRequest = {
  name?: string;
  code?: string;
  address?: string | null;
  phone?: string | null;
  active?: boolean;
};

export type LocationPointOfSaleResponse = {
  id: string;
  companyId: string;
  branchId: string;
  branchName: string;
  code: string;
  name: string;
  description: string | null;
  uiMode: PosUiMode;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  capabilities: PosCapabilityResponse[];
};

export type CreateLocationPointOfSaleRequest = {
  branchId: string;
  code: string;
  name: string;
  description?: string | null;
  uiMode?: PosUiMode;
  active?: boolean;
};

export type UpdateLocationPointOfSaleRequest = {
  branchId?: string;
  code?: string;
  name?: string;
  description?: string | null;
  uiMode?: PosUiMode;
  active?: boolean;
};

export type LocationCashRegisterResponse = {
  id: string;
  branchId: string;
  branchName: string;
  operationalAreaId: string | null;
  operationalAreaName: string | null;
  pointOfSaleId: string | null;
  pointOfSaleName: string | null;
  code: string;
  name: string;
  active: boolean;
};

export type CreateLocationCashRegisterRequest = {
  branchId: string;
  operationalAreaId?: string | null;
  pointOfSaleId?: string | null;
  code: string;
  name: string;
  active?: boolean;
};

export type UpdateLocationCashRegisterRequest = {
  operationalAreaId?: string | null;
  pointOfSaleId?: string | null;
  code?: string;
  name?: string;
  active?: boolean;
};

export type CustomerPriceLevelSummaryResponse = {
  customerId: string;
  customerName: string;
  priceLevelId: string | null;
  priceLevelCode: string | null;
  priceLevelName: string | null;
};


export type CreateInventoryTransferRequest = {
  sourcePointOfSaleId: string;
  destinationPointOfSaleId: string;
  productId: string;
  quantity: number;
  note?: string;
};

export type InventoryTransferResponse = {
  id: string;
  reference: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  sourcePointOfSaleId: string;
  sourcePointOfSaleName: string;
  sourceBranchName: string;
  sourcePreviousStock: number;
  sourceNewStock: number;
  destinationPointOfSaleId: string;
  destinationPointOfSaleName: string;
  destinationBranchName: string;
  destinationPreviousStock: number;
  destinationNewStock: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
  movementIds: [string, string];
};


export type InventoryOverviewBranchResponse = {
  branchId: string;
  branchCode: string;
  branchName: string;
  stockQuantity: number;
  minimumStock: number;
  unitCost: number | null;
  salePrice: number;
  inventoryValue: number;
  potentialSaleValue: number;
  estimatedMargin: number;
  missingCost: boolean;
  active: boolean;
};

export type InventoryOverviewProductResponse = {
  productId: string;
  sku: string;
  barcode: string | null;
  name: string;
  trackInventory: boolean;
  active: boolean;
  totalStock: number;
  totalInventoryValue: number;
  totalPotentialSaleValue: number;
  totalEstimatedMargin: number;
  missingCost: boolean;
  branches: InventoryOverviewBranchResponse[];
};

export type InventoryKardexEntryResponse = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  pointOfSaleId: string;
  type: InventoryMovementType;
  direction: 'IN' | 'OUT';
  quantity: number;
  signedQuantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number | null;
  movementValue: number | null;
  balanceValue: number | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type InventoryCountStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export type InventoryCountItemResponse = {
  id: string;
  productBranchId: string;
  productId: string;
  productSku: string;
  productName: string;
  expectedQuantity: number;
  countedQuantity: number | null;
  differenceQuantity: number | null;
  unitCost: number | null;
  differenceValue: number | null;
  note: string | null;
};

export type InventoryCountResponse = {
  id: string;
  companyId: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  reference: string;
  status: InventoryCountStatus;
  notes: string | null;
  createdBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  countedItems: number;
  differenceItems: number;
  totalDifferenceValue: number;
  items: InventoryCountItemResponse[];
};

export type CreateInventoryCountRequest = {
  branchId: string;
  notes?: string;
};

export type UpdateInventoryCountItemsRequest = {
  items: Array<{
    productBranchId: string;
    countedQuantity: number;
    note?: string;
  }>;
};

export type InventoryAuditEntryResponse = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number | null;
  movementValue: number | null;
  referenceNumber: string | null;
  referenceType: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};
