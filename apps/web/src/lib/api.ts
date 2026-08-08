import type {
  AddOrderServiceRequest,
  AddOrderServiceResponse,
  AddPosAccountItemsRequest,
  CashCloseReportResponse,
  CashRegisterResponse,
  CashRegisterSummaryResponse,
  CashSessionResponse,
  CashierEmployeeResponse,
  CatalogServiceResponse,
  CloseCashSessionRequest,
  CreateCashMovementRequest,
  CreateEmployeeRequest,
  CreateExpenseRequest,
  CreateOrderNoteRequest,
  CreateOrderRequest,
  CreatePosMovementRequest,
  CreatePosMovementResponse,
  CreatedOrderResponse,
  DirectPosPaymentRequest,
  EmployeeResponse,
  ExpenseCategoryResponse,
  ExpenseResponse,
  OpenCashSessionRequest,
  OpenPosAccountRequest,
  OperationalAreaResponse,
  OperationalTicketResponse,
  OrderChecklistItemResponse,
  OrderDetailResponse,
  OrderListItemResponse,
  OrderNoteResponse,
  OrderOperationalStatus,
  PayOrderRequest,
  PayOrderResponse,
  PayPosAccountRequest,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PosAccountResponse,
  ProductCategoryResponse,
  ProductResponse,
  RegisterCashPrintRequest,
  TicketPrintLogResponse,
  UpdateChecklistItemRequest,
  UpdateEmployeeRequest,
  UpdateOrderStatusResponse,
  VehicleTypeResponse,
} from '@cactus/shared';

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;

    throw new Error(
      message ?? `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export type VehicleType = VehicleTypeResponse;
export type CatalogService = CatalogServiceResponse;
export type Employee = EmployeeResponse;
export type CreatedOrder = CreatedOrderResponse;
export type OrderListItem = OrderListItemResponse;
export type OrderDetail = OrderDetailResponse;

export const api = {
  vehicleTypes: () =>
    request<VehicleTypeResponse[]>('/catalog/vehicle-types'),

  services: (vehicleTypeId: string) =>
    request<CatalogServiceResponse[]>(
      `/catalog/services?vehicleTypeId=${encodeURIComponent(
        vehicleTypeId,
      )}`,
    ),

  employees: () => request<EmployeeResponse[]>('/employees'),

  cashiers: () =>
    request<CashierEmployeeResponse[]>('/employees/cashiers'),

  orders: () => request<OrderListItemResponse[]>('/orders'),

  operationalAreas: () =>
    request<OperationalAreaResponse[]>('/operational-areas'),

  orderTickets: (orderId: string) =>
    request<OperationalTicketResponse[]>(`/orders/${orderId}/tickets`),

  registerTicketPrint: (
    orderId: string,
    areaCode: string,
    reprint: boolean,
  ) =>
    request<TicketPrintLogResponse>(
      `/orders/${orderId}/tickets/${areaCode}/print-log`,
      {
        method: 'POST',
        body: JSON.stringify({
          reprint,
          printedBy: localStorage.getItem('cactus.user') ?? 'Usuario',
        }),
      },
    ),

  addOrderService: (
    orderId: string,
    payload: AddOrderServiceRequest,
  ) =>
    request<AddOrderServiceResponse>(`/orders/${orderId}/services`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  orderDetail: (orderId: string) =>
    request<OrderDetailResponse>(`/orders/${orderId}`),

  createOrder: (payload: CreateOrderRequest) =>
    request<CreatedOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateOrderStatus: (
    orderId: string,
    status: OrderOperationalStatus,
  ) =>
    request<UpdateOrderStatusResponse>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateChecklist: (
    orderId: string,
    payload: UpdateChecklistItemRequest,
  ) =>
    request<OrderChecklistItemResponse>(
      `/orders/${orderId}/checklist`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  posPoints: () =>
    request<PointOfSaleResponse[]>('/pos/points'),

  posCategories: (pointOfSaleId: string) =>
    request<ProductCategoryResponse[]>(
      `/pos/categories?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  posProducts: (pointOfSaleId: string, categoryId?: string) =>
    request<ProductResponse[]>(
      `/pos/products?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}${
        categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ''
      }`,
    ),

  posCashRegisters: (pointOfSaleId: string) =>
    request<CashRegisterResponse[]>(
      `/pos/cash-registers?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  posAccounts: (pointOfSaleId: string) =>
    request<PosAccountResponse[]>(
      `/pos/accounts?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  openPosAccount: (payload: OpenPosAccountRequest) =>
    request<PosAccountResponse>('/pos/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),


  updatePosAccount: (
  accountId: string,
  payload: {
    customerAlias: string;
    tableReference?: string;
  },
) =>
  request<PosAccountResponse>(
    `/pos/accounts/${accountId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  ),

  addPosAccountItems: (
    accountId: string,
    payload: AddPosAccountItemsRequest,
  ) =>
    request<PosAccountResponse>(`/pos/accounts/${accountId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  posAccount: (accountId: string) =>
    request<PosAccountResponse>(`/pos/accounts/${accountId}`),

  payPosAccount: (
    accountId: string,
    payload: PayPosAccountRequest,
  ) =>
    request<PosAccountResponse>(`/pos/accounts/${accountId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  directPosPayment: (payload: DirectPosPaymentRequest) =>
    request<CreatePosMovementResponse>('/pos/direct-payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createPosMovement: (payload: CreatePosMovementRequest) =>
    request<CreatePosMovementResponse>('/pos/movements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),


  paymentMethods: () =>
    request<PaymentMethodResponse[]>('/pos/payment-methods'),

  cashRegisters: () =>
    request<CashRegisterSummaryResponse[]>('/cash/registers'),

  cashSession: (sessionId: string) =>
    request<CashSessionResponse>(`/cash/sessions/${sessionId}`),

  openCashSession: (payload: OpenCashSessionRequest) =>
    request<CashSessionResponse>('/cash/sessions/open', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addCashMovement: (
    sessionId: string,
    payload: CreateCashMovementRequest,
  ) =>
    request<CashSessionResponse>(`/cash/sessions/${sessionId}/movements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  closeCashSession: (
    sessionId: string,
    payload: CloseCashSessionRequest,
  ) =>
    request<CashSessionResponse>(`/cash/sessions/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createEmployee: (payload: CreateEmployeeRequest) =>
    request<EmployeeResponse>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEmployee: (
    employeeId: string,
    payload: UpdateEmployeeRequest,
  ) =>
    request<EmployeeResponse>(`/employees/${employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  expenseCategories: () =>
    request<ExpenseCategoryResponse[]>('/expenses/categories'),

  expenses: () =>
    request<ExpenseResponse[]>('/expenses'),

  createExpense: (payload: CreateExpenseRequest) =>
    request<ExpenseResponse>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  issueExpense: (expenseId: string) =>
    request<ExpenseResponse>(`/expenses/${expenseId}/issue`, {
      method: 'POST',
    }),

  cancelExpense: (expenseId: string) =>
    request<ExpenseResponse>(`/expenses/${expenseId}/cancel`, {
      method: 'POST',
    }),

  cashReport: (sessionId: string) =>
    request<CashCloseReportResponse>(`/cash/sessions/${sessionId}/report`),

  registerCashPrint: (
    sessionId: string,
    payload: RegisterCashPrintRequest,
  ) =>
    request<{ ok: true }>(`/cash/sessions/${sessionId}/print-log`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  payOrder: (orderId: string, payload: PayOrderRequest) =>
    request<PayOrderResponse>(`/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addNote: (orderId: string, payload: CreateOrderNoteRequest) =>
    request<OrderNoteResponse>(`/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
