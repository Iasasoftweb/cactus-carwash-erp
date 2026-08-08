import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminCompanyPage } from './pages/AdminCompanyPage';
import { CustomersPage } from './pages/CustomersPage';
import { CoffeeBarAccountsPage } from './pages/CoffeeBarAccountsPage';
import { CashManagementPage } from './pages/CashManagementPage';
import { CashPrintPage } from './pages/CashPrintPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { EmployeesAdminPage } from './pages/EmployeesAdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { HoldOrdersPage } from './pages/HoldOrdersPage';
import { LoginPage } from './pages/LoginPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrderTicketsPage } from './pages/OrderTicketsPage';
import { PosRetailPage } from './pages/PosRetailPage';
import { StaffAssignmentPage } from './pages/StaffAssignmentPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders/new" element={<NewOrderPage />} />
          <Route path="/pos" element={<NewOrderPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/retail-pos" element={<PosRetailPage />} />
          <Route path="/coffee-bar" element={<CoffeeBarAccountsPage />} />
          <Route path="/cash" element={<CashManagementPage />} />
          <Route path="/cash/sessions/:id/print/:document" element={<CashPrintPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/admin/employees" element={<EmployeesAdminPage />} />
          <Route path="/orders/hold" element={<HoldOrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/orders/:id/tickets" element={<OrderTicketsPage />} />
          <Route
            path="/staff/assignment"
            element={<StaffAssignmentPage />}
          />
          <Route
            path="/admin/company"
            element={<AdminCompanyPage />}
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
