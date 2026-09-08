import type {
  AssignProductToPointRequest,
  BulkAssignProductsToPointRequest,
  BulkAssignProductsToPointResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthUserResponse,
  AddOrderServiceRequest,
  AddOrderServiceResponse,
  AddPosAccountItemsRequest,
  CashCloseReportResponse,
  CashRegisterResponse,
  CashRegisterSummaryResponse,
  CashSessionResponse,
  CashierEmployeeResponse,
  CustomerResponse,
  CustomerVehicleResponse,
  CustomerInvoiceResponse,
  CustomerInvoiceDetailResponse,
  PayCustomerInvoiceRequest,
  PayCustomerInvoiceResponse,
  IssueCustomerCreditNoteRequest,
  IssueCustomerCreditNoteResponse,
  CancelCustomerCreditNoteResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UpdateCustomerCreditRequest,
  CreateCustomerVehicleRequest,
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
  AuthorizeOrderCreditRequest,
  AuthorizeOrderCreditResponse,
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
  CreateProductRequest,
  UpdateProductRequest,
  CreateInventoryMovementRequest,
  InventoryMovementResponse,
  CreateInventoryTransferRequest,
  InventoryTransferResponse,
  InventoryOverviewProductResponse,
  InventoryKardexEntryResponse,
  InventoryCountResponse,
  CreateInventoryCountRequest,
  UpdateInventoryCountItemsRequest,
  InventoryAuditEntryResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierResponse,
  PurchaseOrderResponse,
  CreatePurchaseOrderRequest,
  ReceivePurchaseOrderRequest,
  PurchaseOrderReceiptResponse,
  CreateSupplierInvoiceRequest,
  CreateSupplierPaymentRequest,
  SupplierInvoiceResponse,
  SupplierPaymentResponse,
  AccountsPayableSummaryResponse,
  AccountsPayableReportResponse,
  BranchModuleResponse,
  BusinessModuleType,
  CompanyModuleResponse,
  PosCapabilityResponse,
  PosCapabilityType,
  PosFinancialConfigurationResponse,
  PosDailySalesReportResponse,
  PosSalesTransactionsReportResponse,
  PosSalesComparisonResponse,
  PosSalesTrendResponse,
  PosProfitabilityReportResponse,
  PosProfitabilityTrendResponse,
  PosProfitabilityPolicyResponse,
  PosProfitabilityEvaluationResponse,
  PosOperationalProfitabilityReportResponse,
  PosProfitabilityByPointReportResponse,
  UpdatePosProfitabilityPolicyRequest,
  PreparationStationResponse,
  CreatePreparationStationRequest,
  UpdatePreparationStationRequest,
  UpdatePosFinancialConfigurationRequest,
  AdminUserResponse,
  CreateAdminUserRequest,
  PermissionSummaryResponse,
  ResetAdminUserPasswordRequest,
  UpdateAdminUserRequest,
  UpdateAdminUserRolesRequest,
  UpdateAdminUserBranchAccessRequest,
  UpdateAdminUserStatusRequest,
  UserBranchOptionResponse,
  UserRoleSummaryResponse,
  EmployeeBranchResponse,
  CustomerReceivableAgingResponse,
  CustomerCollectionActivityResponse,
  CreateCustomerCollectionActivityRequest,
  CustomerCollectionFollowUpsResponse,
  ResolveCustomerCollectionFollowUpRequest,
  ResolveCustomerCollectionFollowUpResponse,
  BranchAdminResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
  LocationPointOfSaleResponse,
  CreateLocationPointOfSaleRequest,
  UpdateLocationPointOfSaleRequest,
  LocationCashRegisterResponse,
  CreateLocationCashRegisterRequest,
  UpdateLocationCashRegisterRequest,
  PlatformCompanyResponse,
  CreatePlatformCompanyRequest,
  UpdatePlatformCompanyRequest,
  DashboardContextResponse,
  DashboardFinancialSummaryResponse,
  CreatePriceLevelRequest,
  CustomerPriceLevelAssignmentResponse,
  CustomerPriceLevelSummaryResponse,
  PriceLevelResponse,
  ProductPricingResponse,
  UpdateCustomerPriceLevelRequest,
  UpdatePriceLevelRequest,
  UpdateProductPricingRequest,
} from "@cactus/shared";
import { clearAuthSession, getAccessToken } from "./authStorage";

export type KitchenTicketStatusValue =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

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

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000/api";

export function apiAssetUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  const apiOrigin = new URL(API_URL, window.location.origin).origin;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;

  return `${apiOrigin}${normalizedPath}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;

    if (response.status === 401 && path !== "/auth/login") {
      clearAuthSession();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("image", file);

  const token = getAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;

    throw new Error(message ?? `Request failed with status ${response.status}`);
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
  login: (payload: AuthLoginRequest) =>
    request<AuthLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  authMe: () => request<AuthUserResponse>("/auth/me"),

  dashboardContext: () =>
    request<DashboardContextResponse>("/dashboard/context"),

  dashboardFinancialSummary: (branchId?: string) => {
    const params = new URLSearchParams();

    if (branchId) {
      params.set("branchId", branchId);
    }

    const query = params.toString();

    return request<DashboardFinancialSummaryResponse>(
      `/dashboard/financial-summary${query ? `?${query}` : ""}`,
    );
  },

  priceLevels: () =>
    request<PriceLevelResponse[]>('/pricing/levels'),

  createPriceLevel: (payload: CreatePriceLevelRequest) =>
    request<PriceLevelResponse>('/pricing/levels', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePriceLevel: (
    id: string,
    payload: UpdatePriceLevelRequest,
  ) =>
    request<PriceLevelResponse>(
      `/pricing/levels/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  productPricing: (
    productId: string,
    pointOfSaleId: string,
  ) =>
    request<ProductPricingResponse>(
      `/pricing/products/${encodeURIComponent(
        productId,
      )}?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  updateProductPricing: (
    productId: string,
    payload: UpdateProductPricingRequest,
  ) =>
    request<ProductPricingResponse>(
      `/pricing/products/${encodeURIComponent(productId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    ),

  updateCustomerPriceLevel: (
    customerId: string,
    payload: UpdateCustomerPriceLevelRequest,
  ) =>
    request<CustomerPriceLevelAssignmentResponse>(
      `/pricing/customers/${encodeURIComponent(
        customerId,
      )}/price-level`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  customerPriceLevels: () =>
    request<CustomerPriceLevelSummaryResponse[]>('/pricing/customers'),

  platformCompanies: () =>
    request<PlatformCompanyResponse[]>("/platform/companies"),

  createPlatformCompany: (payload: CreatePlatformCompanyRequest) =>
    request<PlatformCompanyResponse>("/platform/companies", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePlatformCompany: (id: string, payload: UpdatePlatformCompanyRequest) =>
    request<PlatformCompanyResponse>(
      `/platform/companies/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  uploadPlatformCompanyLogo: (id: string, file: File) =>
    uploadFile<PlatformCompanyResponse>(
      `/platform/companies/${encodeURIComponent(id)}/logo`,
      file,
    ),

  customers: (search?: string) => {
    const params = new URLSearchParams();

    if (search?.trim()) {
      params.set("search", search.trim());
    }

    const query = params.toString();

    return request<CustomerResponse[]>(`/customers${query ? `?${query}` : ""}`);
  },

  customer: (id: string) => request<CustomerResponse>(`/customers/${id}`),

  createCustomer: (payload: CreateCustomerRequest) =>
    request<CustomerResponse>("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCustomer: (id: string, payload: UpdateCustomerRequest) =>
    request<CustomerResponse>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateCustomerCredit: (id: string, payload: UpdateCustomerCreditRequest) =>
    request<CustomerResponse>(`/customers/${id}/credit`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  customerVehicles: (id: string) =>
    request<CustomerVehicleResponse[]>(`/customers/${id}/vehicles`),

  customerInvoices: (customerId: string) =>
    request<CustomerInvoiceResponse[]>(`/customers/${customerId}/invoices`),

  customerReceivablesAging: () =>
    request<CustomerReceivableAgingResponse>("/customers/receivables/aging"),

  customerCollectionActivities: (customerId: string) =>
    request<CustomerCollectionActivityResponse[]>(
      `/customers/${customerId}/collection-activities`,
    ),

  createCustomerCollectionActivity: (
    customerId: string,
    payload: CreateCustomerCollectionActivityRequest,
  ) =>
    request<CustomerCollectionActivityResponse>(
      `/customers/${customerId}/collection-activities`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  customerInvoice: (customerId: string, invoiceId: string) =>
    request<CustomerInvoiceDetailResponse>(
      `/customers/${customerId}/invoices/${invoiceId}`,
    ),

  payCustomerInvoice: (
    customerId: string,
    invoiceId: string,
    payload: PayCustomerInvoiceRequest,
  ) =>
    request<PayCustomerInvoiceResponse>(
      `/customers/${customerId}/invoices/${invoiceId}/payments`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  issueCustomerCreditNote: (
    customerId: string,
    invoiceId: string,
    payload: IssueCustomerCreditNoteRequest,
  ) =>
    request<IssueCustomerCreditNoteResponse>(
      `/customers/${customerId}/invoices/${invoiceId}/credit-notes`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  cancelCustomerCreditNote: (
    customerId: string,
    invoiceId: string,
    creditNoteId: string,
  ) =>
    request<CancelCustomerCreditNoteResponse>(
      `/customers/${customerId}/invoices/${invoiceId}/credit-notes/${creditNoteId}/cancel`,
      {
        method: "POST",
      },
    ),

  createCustomerVehicle: (id: string, payload: CreateCustomerVehicleRequest) =>
    request<CustomerVehicleResponse>(`/customers/${id}/vehicles`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  vehicleTypes: () => request<VehicleTypeResponse[]>("/catalog/vehicle-types"),

  services: (vehicleTypeId: string) =>
    request<CatalogServiceResponse[]>(
      `/catalog/services?vehicleTypeId=${encodeURIComponent(vehicleTypeId)}`,
    ),

  accountsPayableSummary: (companyId: string, branchId?: string) =>
    request<AccountsPayableSummaryResponse>(
      `/purchases/accounts-payable/summary?companyId=${encodeURIComponent(companyId)}${
        branchId ? `&branchId=${encodeURIComponent(branchId)}` : ""
      }`,
    ),

  employees: () => request<EmployeeResponse[]>("/employees"),

  cashiers: () => request<CashierEmployeeResponse[]>("/employees/cashiers"),

  orders: () => request<OrderListItemResponse[]>("/orders"),

  operationalAreas: (branchId?: string) =>
    request<OperationalAreaResponse[]>(
      `/operational-areas${
        branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""
      }`,
    ),

  orderTickets: (orderId: string) =>
    request<OperationalTicketResponse[]>(`/orders/${orderId}/tickets`),

  registerTicketPrint: (orderId: string, areaCode: string, reprint: boolean) =>
    request<TicketPrintLogResponse>(
      `/orders/${orderId}/tickets/${areaCode}/print-log`,
      {
        method: "POST",
        body: JSON.stringify({
          reprint,
          printedBy: localStorage.getItem("cactus.user") ?? "Usuario",
        }),
      },
    ),

  addOrderService: (orderId: string, payload: AddOrderServiceRequest) =>
    request<AddOrderServiceResponse>(`/orders/${orderId}/services`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  orderDetail: (orderId: string) =>
    request<OrderDetailResponse>(`/orders/${orderId}`),

  createOrder: (payload: CreateOrderRequest) =>
    request<CreatedOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminProducts: (pointOfSaleId: string) =>
    request<ProductResponse[]>(
      `/pos/admin/products?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  adminProductCategories: (pointOfSaleId: string) =>
    request<ProductCategoryResponse[]>(
      `/pos/admin/categories?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  catalogProducts: (pointOfSaleId: string) =>
    request<ProductResponse[]>(
      `/pos/admin/catalog-products?pointOfSaleId=${encodeURIComponent(
        pointOfSaleId,
      )}`,
    ),

  assignProductToPoint: (
    productId: string,
    payload: AssignProductToPointRequest,
  ) =>
    request<ProductResponse>(`/pos/products/${productId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  bulkAssignProductsToPoint: (
    payload: BulkAssignProductsToPointRequest,
  ) =>
    request<BulkAssignProductsToPointResponse>("/pos/products/bulk-assign", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createProductCategory: (payload: {
    pointOfSaleId: string;
    code: string;
    name: string;
    iconCode: string;
    sortOrder?: number;
  }) =>
    request<ProductCategoryResponse>("/pos/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProductCategory: (
    categoryId: string,
    payload: {
      pointOfSaleId: string;
      code?: string;
      name?: string;
      iconCode?: string;
      sortOrder?: number;
      active?: boolean;
    },
  ) =>
    request<ProductCategoryResponse>(
      `/pos/admin/categories/${encodeURIComponent(categoryId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  createProduct: (payload: CreateProductRequest) =>
    request<ProductResponse>("/pos/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProduct: (productId: string, payload: UpdateProductRequest) =>
    request<ProductResponse>(`/pos/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  uploadProductImage: (productId: string, file: File) =>
    uploadFile<ProductResponse>(`/pos/products/${productId}/image`, file),

  updateOrderStatus: (orderId: string, status: OrderOperationalStatus) =>
    request<UpdateOrderStatusResponse>(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateChecklist: (orderId: string, payload: UpdateChecklistItemRequest) =>
    request<OrderChecklistItemResponse>(`/orders/${orderId}/checklist`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminProduct: (productId: string) =>
    request<ProductResponse>(`/pos/admin/products/${productId}`),

  inventoryMovements: (productId: string) =>
    request<InventoryMovementResponse[]>(
      `/pos/products/${productId}/inventory-movements`,
    ),

  inventoryOverview: () =>
    request<InventoryOverviewProductResponse[]>("/pos/inventory/overview"),

  inventoryKardex: (filters: {
    branchId?: string;
    productId?: string;
    from?: string;
    to?: string;
  }) => {
    const query = new URLSearchParams();
    if (filters.branchId) query.set("branchId", filters.branchId);
    if (filters.productId) query.set("productId", filters.productId);
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    const suffix = query.toString();
    return request<InventoryKardexEntryResponse[]>(
      `/pos/inventory/kardex${suffix ? `?${suffix}` : ""}`,
    );
  },

  inventoryCounts: (branchId?: string) =>
    request<InventoryCountResponse[]>(
      `/inventory-counts${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`,
    ),

  inventoryAudit: (branchId?: string) =>
    request<InventoryAuditEntryResponse[]>(
      `/inventory-counts/audit${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`,
    ),

  inventoryCount: (id: string) =>
    request<InventoryCountResponse>(`/inventory-counts/${id}`),

  createInventoryCount: (payload: CreateInventoryCountRequest) =>
    request<InventoryCountResponse>("/inventory-counts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateInventoryCountItems: (
    id: string,
    payload: UpdateInventoryCountItemsRequest,
  ) => request<InventoryCountResponse>(`/inventory-counts/${id}/items`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),

  confirmInventoryCount: (id: string) =>
    request<InventoryCountResponse>(`/inventory-counts/${id}/confirm`, {
      method: "POST",
    }),

  cancelInventoryCount: (id: string) =>
    request<InventoryCountResponse>(`/inventory-counts/${id}/cancel`, {
      method: "POST",
    }),

  createInventoryMovement: (
    productId: string,
    payload: CreateInventoryMovementRequest,
  ) =>
    request<InventoryMovementResponse>(
      `/pos/products/${productId}/inventory-movements`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  transferInventory: (payload: CreateInventoryTransferRequest) =>
    request<InventoryTransferResponse>("/pos/inventory/transfers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  suppliers: (companyId: string) =>
    request<SupplierResponse[]>(
      `/purchases/suppliers?companyId=${encodeURIComponent(companyId)}`,
    ),

  supplier: (supplierId: string) =>
    request<SupplierResponse>(`/purchases/suppliers/${supplierId}`),

  createSupplier: (payload: CreateSupplierRequest) =>
    request<SupplierResponse>("/purchases/suppliers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateSupplier: (supplierId: string, payload: UpdateSupplierRequest) =>
    request<SupplierResponse>(`/purchases/suppliers/${supplierId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  purchaseOrders: (companyId: string, branchId?: string) =>
    request<PurchaseOrderResponse[]>(
      `/purchases/orders?companyId=${encodeURIComponent(companyId)}${
        branchId ? `&branchId=${encodeURIComponent(branchId)}` : ""
      }`,
    ),

  purchaseOrder: (purchaseOrderId: string) =>
    request<PurchaseOrderResponse>(`/purchases/orders/${purchaseOrderId}`),

  createPurchaseOrder: (payload: CreatePurchaseOrderRequest) =>
    request<PurchaseOrderResponse>("/purchases/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  receivePurchaseOrder: (
    purchaseOrderId: string,
    payload: ReceivePurchaseOrderRequest,
  ) =>
    request<PurchaseOrderResponse>(
      `/purchases/orders/${purchaseOrderId}/receive`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  posPoints: () => request<PointOfSaleResponse[]>("/pos/points"),

  posCategories: (pointOfSaleId: string) =>
    request<ProductCategoryResponse[]>(
      `/pos/categories?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  posProducts: (pointOfSaleId: string, categoryId?: string) =>
    request<ProductResponse[]>(
      `/pos/products?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}${
        categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ""
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
    request<PosAccountResponse>("/pos/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePosAccount: (
    accountId: string,
    payload: {
      customerAlias: string;
      tableReference?: string;
    },
  ) =>
    request<PosAccountResponse>(`/pos/accounts/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  addPosAccountItems: (accountId: string, payload: AddPosAccountItemsRequest) =>
    request<PosAccountResponse>(`/pos/accounts/${accountId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  posAccount: (accountId: string) =>
    request<PosAccountResponse>(`/pos/accounts/${accountId}`),

  payPosAccount: (accountId: string, payload: PayPosAccountRequest) =>
    request<PosAccountResponse>(`/pos/accounts/${accountId}/pay`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  directPosPayment: (payload: DirectPosPaymentRequest) =>
    request<CreatePosMovementResponse>("/pos/direct-payments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createPosMovement: (payload: CreatePosMovementRequest) =>
    request<CreatePosMovementResponse>("/pos/movements", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  companyModules: (companyId: string) =>
    request<CompanyModuleResponse[]>(
      `/pos/company-modules?companyId=${encodeURIComponent(companyId)}`,
    ),

  updateCompanyModule: (
    companyId: string,
    module: BusinessModuleType,
    enabled: boolean,
  ) =>
    request<CompanyModuleResponse>(
      `/pos/company-modules/${encodeURIComponent(module)}?companyId=${encodeURIComponent(companyId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      },
    ),

  branchModules: (companyId: string, branchId?: string) =>
    request<BranchModuleResponse[]>(
      `/pos/branch-modules?companyId=${encodeURIComponent(companyId)}${
        branchId ? `&branchId=${encodeURIComponent(branchId)}` : ""
      }`,
    ),

  updateBranchModule: (
    branchId: string,
    module: BusinessModuleType,
    enabled: boolean,
  ) =>
    request<BranchModuleResponse>(
      `/pos/branch-modules/${encodeURIComponent(module)}?branchId=${encodeURIComponent(branchId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      },
    ),

  posCapabilities: (pointOfSaleId: string) =>
    request<PosCapabilityResponse[]>(
      `/pos/points/${encodeURIComponent(pointOfSaleId)}/capabilities`,
    ),

  updatePosCapability: (
    pointOfSaleId: string,
    capability: PosCapabilityType,
    enabled: boolean,
  ) =>
    request<PosCapabilityResponse>(
      `/pos/points/${encodeURIComponent(pointOfSaleId)}/capabilities/${encodeURIComponent(capability)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      },
    ),

  posProfitabilityByPoint: (
    pointOfSaleIds: string[],
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleIds: pointOfSaleIds.join(","),
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return request<PosProfitabilityByPointReportResponse>(
      `/pos/reports/profitability-by-point?${params.toString()}`,
    );
  },

  posOperationalProfitability: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleId,
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return request<PosOperationalProfitabilityReportResponse>(
      `/pos/reports/operational-profitability?${params.toString()}`,
    );
  },

  posProfitabilityEvaluation: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleId,
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return request<PosProfitabilityEvaluationResponse>(
      `/pos/reports/profitability-evaluation?${params.toString()}`,
    );
  },

  posProfitabilityTrend: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleId,
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return request<PosProfitabilityTrendResponse>(
      `/pos/reports/profitability-trend?${params.toString()}`,
    );
  },

  posProfitabilityReport: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleId,
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return request<PosProfitabilityReportResponse>(
      `/pos/reports/profitability?${params.toString()}`,
    );
  },

  posSalesTrend: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({ pointOfSaleId });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    return request<PosSalesTrendResponse>(
      `/pos/reports/sales-trend?${params.toString()}`,
    );
  },

  posSalesComparison: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleId,
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return request<PosSalesComparisonResponse>(
      `/pos/reports/sales-comparison?${params.toString()}`,
    );
  },

  posSalesTransactionsReport: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({ pointOfSaleId });

    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    return request<PosSalesTransactionsReportResponse>(
      `/pos/reports/sales-transactions?${params.toString()}`,
    );
  },

  posDailySalesReport: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleId,
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return request<PosDailySalesReportResponse>(
      `/pos/reports/daily-sales?${params.toString()}`,
    );
  },

  posProfitabilityPolicy: (pointOfSaleId: string) =>
    request<PosProfitabilityPolicyResponse>(
      `/pos/points/${encodeURIComponent(pointOfSaleId)}/profitability-policy`,
    ),

  updatePosProfitabilityPolicy: (
    pointOfSaleId: string,
    payload: UpdatePosProfitabilityPolicyRequest,
  ) =>
    request<PosProfitabilityPolicyResponse>(
      `/pos/points/${encodeURIComponent(pointOfSaleId)}/profitability-policy`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  posFinancialConfiguration: (pointOfSaleId: string) =>
    request<PosFinancialConfigurationResponse>(
      `/pos/points/${encodeURIComponent(pointOfSaleId)}/financial-configuration`,
    ),

  updatePosFinancialConfiguration: (
    pointOfSaleId: string,
    payload: UpdatePosFinancialConfigurationRequest,
  ) =>
    request<PosFinancialConfigurationResponse>(
      `/pos/points/${encodeURIComponent(pointOfSaleId)}/financial-configuration`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  preparationStations: (pointOfSaleId: string) =>
    request<PreparationStationResponse[]>(
      `/pos/preparation-stations?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}`,
    ),

  createPreparationStation: (payload: CreatePreparationStationRequest) =>
    request<PreparationStationResponse>("/pos/preparation-stations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePreparationStation: (
    stationId: string,
    payload: UpdatePreparationStationRequest,
  ) =>
    request<PreparationStationResponse>(
      `/pos/preparation-stations/${encodeURIComponent(stationId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  kitchenHistory: (
    pointOfSaleId: string,
    dateFrom?: string,
    dateTo?: string,
    preparationStationId?: string,
  ) => {
    const params = new URLSearchParams({
      pointOfSaleId,
    });

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    if (preparationStationId) {
      params.set("preparationStationId", preparationStationId);
    }

    return request<KitchenHistoryResponse>(
      `/pos/kitchen-history?${params.toString()}`,
    );
  },

  kitchenMetrics: (pointOfSaleId: string, preparationStationId?: string) =>
    request<KitchenMetricsResponse>(
      `/pos/kitchen-metrics?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}${
        preparationStationId
          ? `&preparationStationId=${encodeURIComponent(preparationStationId)}`
          : ""
      }`,
    ),

  kitchenTickets: (
    pointOfSaleId: string,
    status?: KitchenTicketStatusValue,
    preparationStationId?: string,
  ) =>
    request<KitchenTicketResponse[]>(
      `/pos/kitchen-tickets?pointOfSaleId=${encodeURIComponent(pointOfSaleId)}${
        status ? `&status=${encodeURIComponent(status)}` : ""
      }${
        preparationStationId
          ? `&preparationStationId=${encodeURIComponent(preparationStationId)}`
          : ""
      }`,
    ),

  sendToKitchen: (accountId: string, notes?: string) =>
    request<KitchenTicketResponse[]>(
      `/pos/accounts/${encodeURIComponent(accountId)}/kitchen-tickets`,
      {
        method: "POST",
        body: JSON.stringify({ notes: notes?.trim() || undefined }),
      },
    ),

  updateKitchenTicketStatus: (
    ticketId: string,
    status: KitchenTicketStatusValue,
  ) =>
    request<KitchenTicketResponse>(
      `/pos/kitchen-tickets/${encodeURIComponent(ticketId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  updateKitchenTicketItemStatus: (
    itemId: string,
    status: KitchenTicketStatusValue,
  ) =>
    request<KitchenTicketResponse>(
      `/pos/kitchen-ticket-items/${encodeURIComponent(itemId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  cancelKitchenTicketItem: (itemId: string, reason: string) =>
    request<KitchenTicketResponse>(
      `/pos/kitchen-ticket-items/${encodeURIComponent(itemId)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ),

  cancelKitchenTicket: (ticketId: string, reason: string) =>
    request<KitchenTicketResponse>(
      `/pos/kitchen-tickets/${encodeURIComponent(ticketId)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ),

  paymentMethods: () =>
    request<PaymentMethodResponse[]>("/pos/payment-methods"),

  cashRegisters: () =>
    request<CashRegisterSummaryResponse[]>("/cash/registers"),

  cashSession: (sessionId: string) =>
    request<CashSessionResponse>(`/cash/sessions/${sessionId}`),

  openCashSession: (payload: OpenCashSessionRequest) =>
    request<CashSessionResponse>("/cash/sessions/open", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addCashMovement: (sessionId: string, payload: CreateCashMovementRequest) =>
    request<CashSessionResponse>(`/cash/sessions/${sessionId}/movements`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  closeCashSession: (sessionId: string, payload: CloseCashSessionRequest) =>
    request<CashSessionResponse>(`/cash/sessions/${sessionId}/close`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createEmployee: (payload: CreateEmployeeRequest) =>
    request<EmployeeResponse>("/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateEmployee: (employeeId: string, payload: UpdateEmployeeRequest) =>
    request<EmployeeResponse>(`/employees/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  expenseCategories: () =>
    request<ExpenseCategoryResponse[]>("/expenses/categories"),

  expenses: () => request<ExpenseResponse[]>("/expenses"),

  createExpense: (payload: CreateExpenseRequest) =>
    request<ExpenseResponse>("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  issueExpense: (expenseId: string) =>
    request<ExpenseResponse>(`/expenses/${expenseId}/issue`, {
      method: "POST",
    }),

  cancelExpense: (expenseId: string) =>
    request<ExpenseResponse>(`/expenses/${expenseId}/cancel`, {
      method: "POST",
    }),

  cashReport: (sessionId: string) =>
    request<CashCloseReportResponse>(`/cash/sessions/${sessionId}/report`),

  registerCashPrint: (sessionId: string, payload: RegisterCashPrintRequest) =>
    request<{ ok: true }>(`/cash/sessions/${sessionId}/print-log`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  payOrder: (orderId: string, payload: PayOrderRequest) =>
    request<PayOrderResponse>(`/orders/${orderId}/pay`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  authorizeOrderCredit: (
    orderId: string,
    payload: AuthorizeOrderCreditRequest,
  ) =>
    request<AuthorizeOrderCreditResponse>(`/orders/${orderId}/credit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addNote: (orderId: string, payload: CreateOrderNoteRequest) =>
    request<OrderNoteResponse>(`/orders/${orderId}/notes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  cancelPurchaseOrder: (purchaseOrderId: string) =>
    request<PurchaseOrderResponse>(
      `/purchases/orders/${purchaseOrderId}/cancel`,
      {
        method: "POST",
      },
    ),

  purchaseOrderReceipts: (purchaseOrderId: string) =>
    request<PurchaseOrderReceiptResponse[]>(
      `/purchases/orders/${purchaseOrderId}/receipts`,
    ),

  supplierInvoices: (
    companyId: string,
    branchId?: string,
    supplierId?: string,
  ) =>
    request<SupplierInvoiceResponse[]>(
      `/purchases/supplier-invoices?companyId=${encodeURIComponent(companyId)}${
        branchId ? `&branchId=${encodeURIComponent(branchId)}` : ""
      }${supplierId ? `&supplierId=${encodeURIComponent(supplierId)}` : ""}`,
    ),

  createSupplierInvoice: (payload: CreateSupplierInvoiceRequest) =>
    request<SupplierInvoiceResponse>("/purchases/supplier-invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  supplierPayments: (
    companyId: string,
    branchId?: string,
    supplierId?: string,
  ) =>
    request<SupplierPaymentResponse[]>(
      `/purchases/supplier-payments?companyId=${encodeURIComponent(companyId)}${
        branchId ? `&branchId=${encodeURIComponent(branchId)}` : ""
      }${supplierId ? `&supplierId=${encodeURIComponent(supplierId)}` : ""}`,
    ),

  createSupplierPayment: (payload: CreateSupplierPaymentRequest) =>
    request<SupplierPaymentResponse>("/purchases/supplier-payments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  accountsPayableReport: (
    companyId: string,
    branchId?: string,
    dateFrom?: string,
    dateTo?: string,
    supplierId?: string,
  ) => {
    const params = new URLSearchParams({
      companyId,
    });

    if (branchId) {
      params.set("branchId", branchId);
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    if (supplierId) {
      params.set("supplierId", supplierId);
    }

    return request<AccountsPayableReportResponse>(
      `/purchases/accounts-payable/report?${params.toString()}`,
    );
  },

  adminUsers: () => request<AdminUserResponse[]>("/users"),

  adminUser: (id: string) => request<AdminUserResponse>(`/users/${id}`),

  adminRoles: () => request<UserRoleSummaryResponse[]>("/users/roles"),

  adminPermissions: () =>
    request<PermissionSummaryResponse[]>("/users/permissions"),

  createAdminUser: (payload: CreateAdminUserRequest) =>
    request<AdminUserResponse>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAdminUser: (id: string, payload: UpdateAdminUserRequest) =>
    request<AdminUserResponse>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateAdminUserStatus: (id: string, payload: UpdateAdminUserStatusRequest) =>
    request<AdminUserResponse>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  resetAdminUserPassword: (
    id: string,
    payload: ResetAdminUserPasswordRequest,
  ) =>
    request<{ ok: true }>(`/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateAdminUserRoles: (id: string, payload: UpdateAdminUserRolesRequest) =>
    request<AdminUserResponse>(`/users/${id}/roles`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  adminUserBranchOptions: () =>
    request<UserBranchOptionResponse[]>("/users/branch-options"),

  updateAdminUserBranchAccess: (
    id: string,
    payload: UpdateAdminUserBranchAccessRequest,
  ) =>
    request<AdminUserResponse>(`/users/${id}/branch-access`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  branches: () => request<BranchAdminResponse[]>("/branches"),

  branch: (id: string) => request<BranchAdminResponse>(`/branches/${id}`),

  createBranch: (payload: CreateBranchRequest) =>
    request<BranchAdminResponse>("/branches", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateBranch: (id: string, payload: UpdateBranchRequest) =>
    request<BranchAdminResponse>(`/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  locationPoints: (branchId?: string) =>
    request<LocationPointOfSaleResponse[]>(
      `/locations/points${
        branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""
      }`,
    ),

  locationPoint: (id: string) =>
    request<LocationPointOfSaleResponse>(
      `/locations/points/${encodeURIComponent(id)}`,
    ),

  createLocationPoint: (payload: CreateLocationPointOfSaleRequest) =>
    request<LocationPointOfSaleResponse>("/locations/points", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateLocationPoint: (
    id: string,
    payload: UpdateLocationPointOfSaleRequest,
  ) =>
    request<LocationPointOfSaleResponse>(
      `/locations/points/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  locationCashRegisters: (branchId?: string) =>
    request<LocationCashRegisterResponse[]>(
      `/locations/cash-registers${
        branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""
      }`,
    ),

  locationCashRegister: (id: string) =>
    request<LocationCashRegisterResponse>(
      `/locations/cash-registers/${encodeURIComponent(id)}`,
    ),

  createLocationCashRegister: (payload: CreateLocationCashRegisterRequest) =>
    request<LocationCashRegisterResponse>("/locations/cash-registers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateLocationCashRegister: (
    id: string,
    payload: UpdateLocationCashRegisterRequest,
  ) =>
    request<LocationCashRegisterResponse>(
      `/locations/cash-registers/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  employeeBranches: () =>
    request<EmployeeBranchResponse[]>("/employees/branches"),

  approveExpense: (expenseId: string) =>
    request<ExpenseResponse>(`/expenses/${expenseId}/approve`, {
      method: "POST",
    }),

  customerCollectionFollowUps: () =>
    request<CustomerCollectionFollowUpsResponse>(
      "/customers/receivables/follow-ups",
    ),

  resolveCustomerCollectionFollowUp: (
    customerId: string,
    activityId: string,
    payload: ResolveCustomerCollectionFollowUpRequest,
  ) =>
    request<ResolveCustomerCollectionFollowUpResponse>(
      `/customers/${customerId}/collection-activities/${activityId}/resolve`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),
};
