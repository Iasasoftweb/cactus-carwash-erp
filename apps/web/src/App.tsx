import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ERP_PERMISSIONS, POS_REPORTING_PERMISSIONS } from "@cactus/shared";

import { AccountsPayablePage } from "./pages/AccountsPayablePage";
import { AdminCompanyPage } from "./pages/AdminCompanyPage";
import { BranchesAdminPage } from "./pages/BranchesAdminPage";
import { BusinessConfigurationPage } from "./pages/BusinessConfigurationPage";
import { CashManagementPage } from "./pages/CashManagementPage";
import { CashPrintPage } from "./pages/CashPrintPage";
import { CustomerReceivablesPage } from "./pages/CustomerReceivablesPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesAdminPage } from "./pages/EmployeesAdminPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { HoldOrdersPage } from "./pages/HoldOrdersPage";
import { InventoryMovementsPage } from "./pages/InventoryMovementsPage";
import { InventoryReplenishmentPage } from "./pages/InventoryReplenishmentPage";
import { InventoryTransfersPage } from './pages/InventoryTransfersPage';
import { InventoryOverviewPage } from './pages/InventoryOverviewPage';
import { InventoryKardexPage } from './pages/InventoryKardexPage';
import { InventoryCountsPage } from './pages/InventoryCountsPage';
import { InventoryAuditPage } from './pages/InventoryAuditPage';
import { KitchenAnalyticsPage } from "./pages/KitchenAnalyticsPage";
import { KitchenDisplayPage } from "./pages/KitchenDisplayPage";
import { LoginPage } from "./pages/LoginPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrderTicketsPage } from "./pages/OrderTicketsPage";
import { PosExecutiveDashboardPage } from "./pages/PosExecutiveDashboardPage";
import { PosSalesReportPage } from "./pages/PosSalesReportPage";
import { PosWorkspacePage } from "./pages/PosWorkspacePage";
import { ProductsAdminPage } from "./pages/ProductsAdminPage";
import { PurchaseOrderDetailPage } from "./pages/PurchaseOrderDetailPage";
import { PurchaseOrdersPage } from "./pages/PurchaseOrdersPage";
import { StaffAssignmentPage } from "./pages/StaffAssignmentPage";
import { SuppliersAdminPage } from "./pages/SuppliersAdminPage";
import { UsersAdminPage } from "./pages/UsersAdminPage";
import { ModuleRouteGuard } from "./routes/ModuleRouteGuard";
import { PermissionRouteGuard } from "./routes/PermissionRouteGuard";
import { PlatformAdminRouteGuard } from "./routes/PlatformAdminRouteGuard";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { ProductAssignmentsPage } from "./pages/ProductAssignmentsPage";
import { PriceLevelsPage } from "./pages/PriceLevelsPage";
import { ProductPricingPage } from "./pages/ProductPricingPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.productView,
                  ERP_PERMISSIONS.productManage,
                ]}
              />
            }
          >
            <Route path="/admin/pricing/levels" element={<PriceLevelsPage />} />
            <Route
              path="/admin/products/:id/prices"
              element={<ProductPricingPage />}
            />
          </Route>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route element={<PlatformAdminRouteGuard />}>
            <Route path="/admin/company" element={<AdminCompanyPage />} />
          </Route>

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.companyView,
                  ERP_PERMISSIONS.companyManage,
                ]}
              />
            }
          >
            <Route path="/admin/branches" element={<BranchesAdminPage />} />
          </Route>

          <Route element={<ModuleRouteGuard module="CAR_WASH" />}>
            <Route path="/orders/new" element={<NewOrderPage />} />
            <Route path="/pos" element={<NewOrderPage />} />
            <Route path="/orders/hold" element={<HoldOrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/orders/:id/tickets" element={<OrderTicketsPage />} />
          </Route>

          <Route element={<ModuleRouteGuard module="POS" />}>
            <Route path="/sales-pos" element={<PosWorkspacePage />} />
            <Route path="/kitchen" element={<KitchenDisplayPage />} />
            <Route
              path="/kitchen/analytics"
              element={<KitchenAnalyticsPage />}
            />
            <Route path="/food-service" element={<PosWorkspacePage />} />
            <Route
              path="/coffee-bar"
              element={<Navigate to="/food-service" replace />}
            />
            <Route
              path="/retail-pos"
              element={<Navigate to="/sales-pos" replace />}
            />
            <Route
              element={
                <PermissionRouteGuard
                  anyOf={[POS_REPORTING_PERMISSIONS.viewExecutiveDashboard]}
                />
              }
            >
              <Route
                path="/admin/pos-executive-dashboard"
                element={<PosExecutiveDashboardPage />}
              />
            </Route>
            <Route
              element={
                <PermissionRouteGuard
                  anyOf={[POS_REPORTING_PERMISSIONS.viewSalesReport]}
                />
              }
            >
              <Route
                path="/admin/reports/pos-sales"
                element={<PosSalesReportPage />}
              />
            </Route>
          </Route>

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.userView,
                  ERP_PERMISSIONS.userManage,
                  ERP_PERMISSIONS.userPasswordReset,
                  ERP_PERMISSIONS.userRoleManage,
                ]}
              />
            }
          >
            <Route path="/admin/users" element={<UsersAdminPage />} />
          </Route>

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.customerView,
                  ERP_PERMISSIONS.customerManage,
                  ERP_PERMISSIONS.customerCreditManage,
                ]}
              />
            }
          >
            <Route path="/customers" element={<CustomersPage />} />
            <Route
              path="/customers/receivables"
              element={<CustomerReceivablesPage />}
            />
          </Route>

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.cashView,
                  ERP_PERMISSIONS.cashSessionOperate,
                  ERP_PERMISSIONS.cashManage,
                ]}
              />
            }
          >
            <Route path="/cash" element={<CashManagementPage />} />
          </Route>

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.cashReprint,
                  ERP_PERMISSIONS.cashSessionOperate,
                  ERP_PERMISSIONS.cashManage,
                ]}
              />
            }
          >
            <Route
              path="/cash/sessions/:id/print/:document"
              element={<CashPrintPage />}
            />
          </Route>

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.expenseView,
                  ERP_PERMISSIONS.expenseCreate,
                  ERP_PERMISSIONS.expenseApprove,
                  ERP_PERMISSIONS.expenseManage,
                ]}
              />
            }
          >
            <Route path="/expenses" element={<ExpensesPage />} />
          </Route>

          <Route path="/admin/employees" element={<EmployeesAdminPage />} />
          <Route path="/staff/assignment" element={<StaffAssignmentPage />} />
          <Route
            path="/admin/purchases/accounts-payable"
            element={<AccountsPayablePage />}
          />
          <Route
            path="/admin/purchases/suppliers"
            element={<SuppliersAdminPage />}
          />
          <Route
            path="/admin/purchases/orders"
            element={<PurchaseOrdersPage />}
          />
          <Route
            path="/admin/purchases/orders/:id"
            element={<PurchaseOrderDetailPage />}
          />
          <Route path="/admin/products" element={<ProductsAdminPage />} />
          <Route
            path="/admin/products/:id/inventory"
            element={<InventoryMovementsPage />}
          />
          <Route
            path="/admin/inventory/replenishment"
            element={<InventoryReplenishmentPage />}
          />

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[
                  ERP_PERMISSIONS.inventoryView,
                  ERP_PERMISSIONS.inventoryManage,
                ]}
              />
            }
          >
            <Route
              path="/admin/inventory/overview"
              element={<InventoryOverviewPage />}
            />
            <Route
              path="/admin/inventory/kardex"
              element={<InventoryKardexPage />}
            />
            <Route
              path="/admin/inventory/counts"
              element={<InventoryCountsPage />}
            />
            <Route
              path="/admin/inventory/audit"
              element={<InventoryAuditPage />}
            />
          </Route>

          <Route
            element={
              <PermissionRouteGuard
                anyOf={[ERP_PERMISSIONS.inventoryManage]}
              />
            }
          >
            <Route
              path="/admin/inventory/transfers"
              element={<InventoryTransfersPage />}
            />
          </Route>
          <Route
            path="/admin/business-configuration"
            element={<BusinessConfigurationPage />}
          />
          <Route
            path="/admin/products/assign"
            element={<ProductAssignmentsPage />}
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
