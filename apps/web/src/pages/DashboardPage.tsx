import {
  AlertTriangle,
  Banknote,
  Boxes,
  CarFront,
  ChevronRight,
  Coffee,
  Gauge,
  LogOut,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  UsersRound,
  WalletCards,
  Building2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ERP_PERMISSIONS, POS_REPORTING_PERMISSIONS } from "@cactus/shared";
import type {
  BranchModuleResponse,
  CompanyModuleResponse,
  DashboardContextResponse,
  DashboardFinancialSummaryResponse,
  PointOfSaleResponse,
} from "@cactus/shared";
import { api, apiAssetUrl } from "../lib/api";
import { POS_ROUTES } from "../routes/posRoutes";
import { getAuthUser, hasPermission } from "../lib/authStorage";

function money(value: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const username = authUser?.fullName || authUser?.username || "Usuario";
  const isPlatformAdmin = authUser?.isPlatformAdmin ?? false;

  const [dashboardContext, setDashboardContext] =
    useState<DashboardContextResponse | null>(null);
  const [financialSummary, setFinancialSummary] =
    useState<DashboardFinancialSummaryResponse | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedPoint, setSelectedPoint] =
    useState<PointOfSaleResponse | null>(null);
  const [companyModules, setCompanyModules] = useState<CompanyModuleResponse[]>(
    [],
  );
  const [branchModules, setBranchModules] = useState<BranchModuleResponse[]>(
    [],
  );
  const [modulesLoading, setModulesLoading] = useState(true);

  async function loadDashboardContext(): Promise<void> {
    setModulesLoading(true);

    try {
      const [context, points] = await Promise.all([
        api.dashboardContext(),
        api.posPoints(),
      ]);

      setDashboardContext(context);

      const initialBranchId = context.canViewAllBranchesFinancial
        ? ''
        : context.branches[0]?.id ?? '';

      setSelectedBranchId(initialBranchId);

      const point =
        points.find((row) => {
          const code = row.code?.toUpperCase() ?? "";
          const name = row.name.toUpperCase();
          return code.includes("COFFEE") || name.includes("COFFEE");
        }) ?? points[0];

      if (!point) {
        setSelectedPoint(null);
        setCompanyModules([]);
        setBranchModules([]);
      } else {
        const [companyRows, branchRows] = await Promise.all([
          api.companyModules(point.companyId),
          api.branchModules(point.companyId, point.branchId),
        ]);

        setSelectedPoint(point);
        setCompanyModules(companyRows);
        setBranchModules(branchRows);
      }

      if (context.canViewFinancialDashboard) {
        setFinancialLoading(true);
        setFinancialSummary(
          await api.dashboardFinancialSummary(initialBranchId || undefined),
        );
      } else {
        setFinancialSummary(null);
      }
    } catch {
      setDashboardContext(null);
      setFinancialSummary(null);
      setCompanyModules([]);
      setBranchModules([]);
    } finally {
      setFinancialLoading(false);
      setModulesLoading(false);
    }
  }

  async function changeFinancialBranch(branchId: string): Promise<void> {
    setSelectedBranchId(branchId);
    setFinancialLoading(true);

    try {
      setFinancialSummary(
        await api.dashboardFinancialSummary(branchId || undefined),
      );
    } catch {
      setFinancialSummary(null);
    } finally {
      setFinancialLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardContext();
  }, []);

  const companyPosModule = companyModules.find((row) => row.module === "POS");
  const branchPosModule = branchModules.find((row) => row.module === "POS");

  const companyCarWashModule = companyModules.find(
    (row) => row.module === "CAR_WASH",
  );
  const branchCarWashModule = branchModules.find(
    (row) => row.module === "CAR_WASH",
  );

  const posEnabled =
    !modulesLoading &&
    companyPosModule?.enabled === true &&
    branchPosModule?.enabled === true;

  const carWashEnabled =
    !modulesLoading &&
    companyCarWashModule?.enabled === true &&
    branchCarWashModule?.enabled === true;

  const canViewExecutive = hasPermission(
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  );

  const canViewPosReports = hasPermission(
    POS_REPORTING_PERMISSIONS.viewSalesReport,
  );

  const canViewCustomers =
    hasPermission(ERP_PERMISSIONS.customerView) ||
    hasPermission(ERP_PERMISSIONS.customerManage) ||
    hasPermission(ERP_PERMISSIONS.customerCreditManage);

  const canAccessCash =
    hasPermission(ERP_PERMISSIONS.cashView) ||
    hasPermission(ERP_PERMISSIONS.cashSessionOperate) ||
    hasPermission(ERP_PERMISSIONS.cashManage);

  const canAccessExpenses =
    hasPermission(ERP_PERMISSIONS.expenseView) ||
    hasPermission(ERP_PERMISSIONS.expenseCreate) ||
    hasPermission(ERP_PERMISSIONS.expenseApprove) ||
    hasPermission(ERP_PERMISSIONS.expenseManage);

  const canAccessUsers =
    hasPermission(ERP_PERMISSIONS.userView) ||
    hasPermission(ERP_PERMISSIONS.userManage) ||
    hasPermission(ERP_PERMISSIONS.userPasswordReset) ||
    hasPermission(ERP_PERMISSIONS.userRoleManage);

  const canAccessBranches =
    hasPermission(ERP_PERMISSIONS.companyView) ||
    hasPermission(ERP_PERMISSIONS.companyManage);

  const canAccessInventory =
    hasPermission(ERP_PERMISSIONS.inventoryView) ||
    hasPermission(ERP_PERMISSIONS.inventoryManage);

  const canViewFinancialDashboard =
    dashboardContext?.canViewFinancialDashboard ?? false;
  const overdueInvoices =
    financialSummary?.overduePayableInvoices ?? 0;
  const overdueReceivables =
    financialSummary?.overdueReceivableInvoices ?? 0;
  const alertCount = overdueInvoices + overdueReceivables;
  const selectedFinancialBranch = dashboardContext?.branches.find(
    (branch) => branch.id === selectedBranchId,
  );
  const visibleBranchName = selectedBranchId
    ? selectedFinancialBranch?.name ?? selectedPoint?.branchName ?? 'Sucursal'
    : dashboardContext?.canViewAllBranchesFinancial
      ? 'Todas las sucursales'
      : selectedPoint?.branchName ?? 'Sin sucursal seleccionada';

  function logout(): void {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  }

  return (
    <main className="dashboard-v2">
      <aside className="dashboard-v2__sidebar">
        <button
          type="button"
          className="dashboard-v2__brand"
          onClick={() => navigate("/dashboard")}
        >
          <img
            src="/images/cactuspos.png"
            alt="Cactus ERP"
          />
        </button>

        <div className="dashboard-v2__sidebar-title">Centro Operativo</div>

        <nav className="dashboard-v2__nav">
          <div className="dashboard-v2__nav-group">
            <small>OPERACIÓN</small>

            <button
              type="button"
              className="is-active"
              onClick={() => navigate("/dashboard")}
            >
              <Gauge size={17} />
              <span>Inicio</span>
            </button>

            {carWashEnabled ? (
              <button type="button" onClick={() => navigate("/pos")}>
                <CarFront size={17} />
                <span>CarWash</span>
              </button>
            ) : null}

            {posEnabled ? (
              <button
                type="button"
                onClick={() => navigate(POS_ROUTES.workspace)}
              >
                <Coffee size={17} />
                <span>Punto de Venta</span>
              </button>
            ) : null}

            {canAccessCash ? (
              <button type="button" onClick={() => navigate("/cash")}>
                <WalletCards size={17} />
                <span>Caja</span>
              </button>
            ) : null}

            {canAccessExpenses ? (
              <button type="button" onClick={() => navigate("/expenses")}>
                <ReceiptText size={17} />
                <span>Gastos</span>
              </button>
            ) : null}
          </div>

          {posEnabled && (canViewExecutive || canViewPosReports) ? (
            <div className="dashboard-v2__nav-group">
              <small>ANÁLISIS</small>

              {canViewExecutive ? (
                <button
                  type="button"
                  onClick={() => navigate("/admin/pos-executive-dashboard")}
                >
                  <Banknote size={17} />
                  <span>Panel ejecutivo POS</span>
                </button>
              ) : null}

              {canViewPosReports ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/reports/pos-sales")}
                  >
                    <ReceiptText size={17} />
                    <span>Reportes POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/admin/sales/issued-documents")
                    }
                  >
                    <ReceiptText size={17} />
                    <span>Facturas emitidas</span>
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="dashboard-v2__nav-group">
            <small>GESTIÓN</small>

            {canViewCustomers ? (
              <button type="button" onClick={() => navigate("/customers")}>
                <Users size={17} />
                <span>Clientes</span>
              </button>
            ) : null}

            {canViewCustomers ? (
              <button
                type="button"
                onClick={() => navigate("/customers/receivables")}
              >
                <Banknote size={17} />
                <span>Cuentas por cobrar</span>
              </button>
            ) : null}

            <button type="button" onClick={() => navigate("/admin/employees")}>
              <UserCog size={17} />
              <span>Empleados</span>
            </button>

            <button type="button" onClick={() => navigate("/admin/products")}>
              <ShoppingBasket size={17} />
              <span>Productos</span>
            </button>

            {canAccessInventory ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/admin/inventory/overview")}
                >
                  <Boxes size={17} />
                  <span>Inventario</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/admin/inventory/kardex")}
                >
                  <PackageCheck size={17} />
                  <span>Kardex</span>
                </button>
              </>
            ) : null}
          </div>

          <div className="dashboard-v2__nav-group">
            <small>COMPRAS</small>

            <button
              type="button"
              onClick={() => navigate("/admin/purchases/suppliers")}
            >
              <Truck size={17} />
              <span>Suplidores</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/purchases/orders")}
            >
              <ShoppingCart size={17} />
              <span>Órdenes de compra</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/inventory/replenishment")}
            >
              <Boxes size={17} />
              <span>Reposición</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/purchases/accounts-payable")}
            >
              <WalletCards size={17} />
              <span>Cuentas por pagar</span>
            </button>
          </div>

          <div className="dashboard-v2__nav-group dashboard-v2__nav-group--system">
            <small>SISTEMA</small>

            {canAccessUsers ? (
              <button type="button" onClick={() => navigate("/admin/users")}>
                <UsersRound size={17} />
                <span>Usuarios</span>
              </button>
            ) : null}

            {canAccessBranches ? (
              <button type="button" onClick={() => navigate("/admin/branches")}>
                <Building2 size={17} />
                <span>Sucursales</span>
              </button>
            ) : null}

            {isPlatformAdmin ? (
              <button type="button" onClick={() => navigate("/admin/company")}>
                <Settings size={17} />
                <span>Empresas</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate("/admin/business-configuration")}
            >
              <Settings size={17} />
              <span>Configuración</span>
            </button>
          </div>
        </nav>

        <div className="dashboard-v2__profile">
          <div className="dashboard-v2__avatar">
            {username.charAt(0).toUpperCase()}
          </div>

          <div className="dashboard-v2__profile-copy">
            <strong>{username}</strong>
            <small>Sesión activa</small>
          </div>

          <button
            type="button"
            className="dashboard-v2__logout"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <section className="dashboard-v2__workspace">
        <header className="dashboard-v2__header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              minWidth: 0,
            }}
          >
            {dashboardContext?.companyLogoUrl ? (
              <div
                style={{
                  width: 68,
                  height: 68,
                  flex: "0 0 68px",
                  display: "grid",
                  placeItems: "center",
                  padding: 7,
                  border: "1px solid #dce4df",
                  borderRadius: 14,
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <img
                  src={apiAssetUrl(dashboardContext.companyLogoUrl)}
                  alt={`Logo de ${dashboardContext.companyName}`}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            ) : null}

            <div style={{ minWidth: 0 }}>
              <span className="dashboard-v2__eyebrow">CENTRO OPERATIVO</span>
              <h1>{dashboardContext?.companyName || "Centro de Control"}</h1>
              <p>Resumen general de operaciones y finanzas.</p>
            </div>
          </div>

          <div className="dashboard-v2__header-actions">
            {canViewFinancialDashboard && dashboardContext ? (
              <label className="dashboard-v2__context">
                <span>Resumen financiero</span>
                <select
                  value={selectedBranchId}
                  disabled={financialLoading}
                  onChange={(event) => {
                    void changeFinancialBranch(event.target.value);
                  }}
                >
                  {dashboardContext.canViewAllBranchesFinancial ? (
                    <option value="">Toda la empresa</option>
                  ) : null}
                  {dashboardContext.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {selectedPoint ? (
              <div className="dashboard-v2__context">
                <span>Sucursal activa</span>
                <strong style={{ fontSize: "1rem", lineHeight: 1.25 }}>
                  {selectedPoint.branchName ?? "Sucursal sin nombre"}
                </strong>
                <small>{selectedPoint.name}</small>
              </div>
            ) : null}

            <button
              type="button"
              className="dashboard-v2__refresh"
              onClick={() => void loadDashboardContext()}
              disabled={financialLoading || modulesLoading}
              title="Actualizar Dashboard"
              aria-label="Actualizar Dashboard"
            >
              <RefreshCcw size={17} />
            </button>

            {carWashEnabled ? (
              <button
                type="button"
                className="dashboard-v2__primary"
                onClick={() => navigate("/pos")}
              >
                <CarFront size={17} />
                Nueva orden
              </button>
            ) : null}
          </div>
        </header>

        <div className="dashboard-v2__update-line">
          <span>
            Alcance: {visibleBranchName}
          </span>
          <span>
            {dashboardContext?.companyName ?? "Empresa no identificada"}
          </span>
        </div>

        <section className="dashboard-v2__kpis">
          {posEnabled && canViewFinancialDashboard ? (
            <article className="dashboard-v2__kpi">
              <span className="dashboard-v2__kpi-icon dashboard-v2__kpi-icon--success">
                <Banknote size={22} />
              </span>
              <div>
                <span>Ventas de hoy</span>
                <strong>
                  {financialLoading
                    ? "Cargando..."
                    : money(financialSummary?.salesToday ?? 0)}
                </strong>
                <small>
                  {financialSummary?.salesTransactionsToday ?? 0} transacciones
                </small>
              </div>
            </article>
          ) : null}

          {carWashEnabled ? (
            <article className="dashboard-v2__kpi">
              <span className="dashboard-v2__kpi-icon dashboard-v2__kpi-icon--info">
                <CarFront size={22} />
              </span>
              <div>
                <span>Órdenes activas</span>
                <strong>Pendiente integración</strong>
                <small>Requiere resumen operativo CarWash</small>
              </div>
            </article>
          ) : null}

          {canAccessCash ? (
            <article className="dashboard-v2__kpi">
              <span className="dashboard-v2__kpi-icon dashboard-v2__kpi-icon--success">
                <WalletCards size={22} />
              </span>
              <div>
                <span>Estado de caja</span>
                <strong>Pendiente integración</strong>
                <small>Requiere estado de sesión actual</small>
              </div>
            </article>
          ) : null}

          {canViewFinancialDashboard ? (
            <article className="dashboard-v2__kpi">
              <span className="dashboard-v2__kpi-icon dashboard-v2__kpi-icon--warning">
                <AlertTriangle size={22} />
              </span>
              <div>
                <span>Alertas financieras</span>
                <strong>{financialLoading ? "..." : alertCount}</strong>
                <small>
                  {overdueReceivables} por cobrar · {overdueInvoices} por pagar
                </small>
              </div>
            </article>
          ) : null}

          {canViewFinancialDashboard ? (
            <article className="dashboard-v2__kpi">
              <span className="dashboard-v2__kpi-icon dashboard-v2__kpi-icon--success">
                <Banknote size={22} />
              </span>
              <div>
                <span>Resultado operativo de hoy</span>
                <strong>
                  {financialLoading
                    ? "Cargando..."
                    : money(financialSummary?.operatingNetToday ?? 0)}
                </strong>
                <small>Ventas menos gastos emitidos</small>
              </div>
            </article>
          ) : null}
        </section>

        <section className="dashboard-v2__panel dashboard-v2__attention">
          <div className="dashboard-v2__section-head">
            <div>
              <span>REQUIERE ATENCIÓN</span>
              <h2>Prioridades del negocio</h2>
            </div>

            {canViewFinancialDashboard ? (
              <button
                type="button"
                className="dashboard-v2__text-action"
                onClick={() => navigate("/admin/purchases/accounts-payable")}
              >
                Ver cuentas por pagar
                <ChevronRight size={15} />
              </button>
            ) : null}
          </div>

          <div className="dashboard-v2__attention-grid">
            {canViewFinancialDashboard ? (
              <>
                <button
                  type="button"
                  className="dashboard-v2__attention-card dashboard-v2__attention-card--danger"
                  onClick={() =>
                    navigate("/admin/purchases/accounts-payable?view=overdue")
                  }
                >
                  <span className="dashboard-v2__attention-icon">
                    <AlertTriangle size={20} />
                  </span>
                  <span>
                    <small>CUENTAS POR PAGAR</small>
                    <strong>
                      {financialLoading
                        ? "Cargando..."
                        : `${overdueInvoices} facturas vencidas`}
                    </strong>
                    <b>
                      {financialLoading
                        ? "—"
                        : money(financialSummary?.overduePayableBalance ?? 0)}
                    </b>
                  </span>
                  <ChevronRight size={18} />
                </button>

                <button
                  type="button"
                  className="dashboard-v2__attention-card dashboard-v2__attention-card--warning"
                  onClick={() => navigate("/customers/receivables")}
                >
                  <span className="dashboard-v2__attention-icon">
                    <Banknote size={20} />
                  </span>
                  <span>
                    <small>CUENTAS POR COBRAR</small>
                    <strong>
                      {financialLoading
                        ? "Cargando..."
                        : `${overdueReceivables} facturas vencidas`}
                    </strong>
                    <b>
                      {financialLoading
                        ? "—"
                        : money(financialSummary?.overdueReceivableBalance ?? 0)}
                    </b>
                  </span>
                  <ChevronRight size={18} />
                </button>
              </>
            ) : null}

            <button
              type="button"
              className="dashboard-v2__attention-card dashboard-v2__attention-card--info"
              onClick={() => navigate("/admin/inventory/replenishment")}
            >
              <span className="dashboard-v2__attention-icon">
                <Boxes size={20} />
              </span>
              <span>
                <small>INVENTARIO</small>
                <strong>Stock crítico</strong>
                <b>Consultar reposición</b>
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        <section className="dashboard-v2__middle-grid">
          <section className="dashboard-v2__panel">
            <div className="dashboard-v2__section-head">
              <div>
                <span>OPERACIÓN DE HOY</span>
                <h2>Estado operacional</h2>
              </div>
            </div>

            <div className="dashboard-v2__operation-grid">
              {carWashEnabled ? (
                <>
                  <div className="dashboard-v2__operation-stat">
                    <CarFront size={19} />
                    <span>En espera</span>
                    <strong>—</strong>
                    <small>Pendiente integración</small>
                  </div>

                  <div className="dashboard-v2__operation-stat">
                    <PackageCheck size={19} />
                    <span>En proceso</span>
                    <strong>—</strong>
                    <small>Pendiente integración</small>
                  </div>
                </>
              ) : null}

              {posEnabled ? (
                <div className="dashboard-v2__operation-stat">
                  <Coffee size={19} />
                  <span>Tickets POS</span>
                  <strong>—</strong>
                  <small>Pendiente integración</small>
                </div>
              ) : null}

              {canAccessCash ? (
                <div className="dashboard-v2__operation-stat">
                  <WalletCards size={19} />
                  <span>Caja</span>
                  <strong>—</strong>
                  <small>Pendiente integración</small>
                </div>
              ) : null}
            </div>

            <div className="dashboard-v2__integration-note">
              Esta sección está preparada para consumir métricas reales sin
              utilizar datos ficticios.
            </div>
          </section>

          <section className="dashboard-v2__panel">
            <div className="dashboard-v2__section-head">
              <div>
                <span>ACCESOS RÁPIDOS</span>
                <h2>Módulos de trabajo</h2>
              </div>
            </div>

            <div className="dashboard-v2__quick-grid">
              {carWashEnabled ? (
                <button type="button" onClick={() => navigate("/pos")}>
                  <span>
                    <CarFront size={19} />
                  </span>
                  <div>
                    <strong>CarWash</strong>
                    <small>Operación</small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ) : null}

              {posEnabled ? (
                <button
                  type="button"
                  onClick={() => navigate(POS_ROUTES.workspace)}
                >
                  <span>
                    <Coffee size={19} />
                  </span>
                  <div>
                    <strong>Punto de Venta</strong>
                    <small>Ventas y facturación</small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ) : null}

              {canAccessCash ? (
                <button type="button" onClick={() => navigate("/cash")}>
                  <span>
                    <WalletCards size={19} />
                  </span>
                  <div>
                    <strong>Caja</strong>
                    <small>Apertura y cierre</small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ) : null}

              {canAccessExpenses ? (
                <button type="button" onClick={() => navigate("/expenses")}>
                  <span>
                    <ReceiptText size={19} />
                  </span>
                  <div>
                    <strong>Gastos</strong>
                    <small>Registro y control</small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ) : null}

              <button type="button" onClick={() => navigate("/admin/products")}>
                <span>
                  <ShoppingBasket size={19} />
                </span>
                <div>
                  <strong>Productos</strong>
                  <small>Catálogo</small>
                </div>
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/purchases/orders")}
              >
                <span>
                  <ShoppingCart size={19} />
                </span>
                <div>
                  <strong>Compras</strong>
                  <small>Órdenes</small>
                </div>
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/inventory/replenishment")}
              >
                <span>
                  <Boxes size={19} />
                </span>
                <div>
                  <strong>Reposición</strong>
                  <small>Stock mínimo</small>
                </div>
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/purchases/accounts-payable")}
              >
                <span>
                  <WalletCards size={19} />
                </span>
                <div>
                  <strong>Cuentas por pagar</strong>
                  <small>Compromisos</small>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        </section>

        <section className="dashboard-v2__bottom-grid">
          {canViewFinancialDashboard ? (
          <section className="dashboard-v2__panel">
            <div className="dashboard-v2__section-head">
              <div>
                <span>FINANZAS</span>
                <h2>Resumen financiero</h2>
              </div>
            </div>

            <div className="dashboard-v2__finance-grid">
              <div>
                <span>Saldo por pagar</span>
                <strong>
                  {financialLoading
                    ? "Cargando..."
                    : money(financialSummary?.accountsPayableBalance ?? 0)}
                </strong>
                <small>
                  Compromisos pendientes
                </small>
              </div>

              <div className="is-danger">
                <span>Vencido</span>
                <strong>
                  {financialLoading
                    ? "Cargando..."
                    : money(financialSummary?.overduePayableBalance ?? 0)}
                </strong>
                <small>{overdueInvoices} facturas</small>
              </div>

              <div className="is-warning">
                <span>Saldo por cobrar</span>
                <strong>
                  {financialLoading
                    ? "Cargando..."
                    : money(financialSummary?.accountsReceivableBalance ?? 0)}
                </strong>
                <small>{overdueReceivables} facturas vencidas</small>
              </div>
            </div>
          </section>
          ) : null}

          <section className="dashboard-v2__panel">
            <div className="dashboard-v2__section-head">
              <div>
                <span>ACTIVIDAD RECIENTE</span>
                <h2>Movimiento del ERP</h2>
              </div>
            </div>

            <div className="dashboard-v2__empty-state">
              <span className="dashboard-v2__empty-icon">
                <ReceiptText size={22} />
              </span>
              <strong>UI preparada para actividad real</strong>
              <p>
                Esta sección requiere una fuente consolidada de ventas, caja,
                compras e inventario.
              </p>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
