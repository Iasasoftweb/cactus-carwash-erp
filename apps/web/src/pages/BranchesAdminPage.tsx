import {
  Boxes,
  Building2,
  Pencil,
  Plus,
  Settings2,
  Store,
  WalletCards,
} from "lucide-react";
import {
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ERP_PERMISSIONS,
} from "@cactus/shared";
import type {
  BranchAdminResponse,
  BranchModuleResponse,
  BusinessModuleType,
  CompanyModuleResponse,
  LocationCashRegisterResponse,
  LocationPointOfSaleResponse,
  OperationalAreaResponse,
  PosCapabilityResponse,
  PosCapabilityType,
} from "@cactus/shared";

import { api } from "../lib/api";
import { hasPermission } from "../lib/authStorage";

type TabValue =
  | "branches"
  | "points"
  | "modules"
  | "registers";

type ModalValue =
  | "branch"
  | "point"
  | "register"
  | "capabilities"
  | null;

const PAGE_SIZE = 10;

const BUSINESS_MODULES: Array<{
  value: BusinessModuleType;
  label: string;
}> = [
  { value: "POS", label: "POS" },
  { value: "CAR_WASH", label: "Car Wash" },
  { value: "INVENTORY", label: "Inventario" },
  { value: "PURCHASES", label: "Órdenes de compra" },
  { value: "ACCOUNTS_RECEIVABLE", label: "Cuentas por cobrar" },
  { value: "ACCOUNTS_PAYABLE", label: "Cuentas por pagar" },
  { value: "EXPENSES", label: "Gastos" },
];

const CAPABILITIES: Array<{
  value: PosCapabilityType;
  label: string;
}> = [
  { value: "RETAIL", label: "Venta minorista" },
  { value: "FOOD_SERVICE", label: "Alimentos y bebidas" },
  { value: "WEIGHTED_PRODUCTS", label: "Productos por peso" },
  { value: "HOLD_ORDERS", label: "Órdenes en espera" },
  { value: "TABLES", label: "Servicio en mesas" },
  { value: "KITCHEN_TICKETS", label: "Comandas de cocina" },
  { value: "DELIVERY", label: "Entrega a domicilio" },
];

const EMPTY_BRANCH_FORM = {
  name: "",
  code: "",
  address: "",
  phone: "",
  active: true,
};

const EMPTY_POINT_FORM = {
  branchId: "",
  name: "",
  code: "",
  description: "",
  active: true,
};

const EMPTY_REGISTER_FORM = {
  branchId: "",
  pointOfSaleId: "",
  operationalAreaId: "",
  name: "",
  code: "",
  active: true,
};

export function BranchesAdminPage() {
  const navigate = useNavigate();

  const canManageCompany = hasPermission(
    ERP_PERMISSIONS.companyManage,
  );

  const canManageCash =
    canManageCompany ||
    hasPermission(
      ERP_PERMISSIONS.cashManage,
    );

  const canManageModules =
    canManageCompany ||
    hasPermission(
      ERP_PERMISSIONS.businessConfigurationManage,
    );

  const [activeTab, setActiveTab] =
    useState<TabValue>("branches");

  const [modal, setModal] =
    useState<ModalValue>(null);

  const [branches, setBranches] =
    useState<BranchAdminResponse[]>([]);

  const [points, setPoints] =
    useState<LocationPointOfSaleResponse[]>([]);

  const [registers, setRegisters] =
    useState<LocationCashRegisterResponse[]>([]);

  const [companyModules, setCompanyModules] =
    useState<CompanyModuleResponse[]>([]);

  const [branchModules, setBranchModules] =
    useState<BranchModuleResponse[]>([]);

  const [areas, setAreas] =
    useState<OperationalAreaResponse[]>([]);

  const [capabilities, setCapabilities] =
    useState<PosCapabilityResponse[]>([]);

  const [editingId, setEditingId] =
    useState("");

  const [capabilityPoint, setCapabilityPoint] =
    useState<LocationPointOfSaleResponse | null>(
      null,
    );

  const [branchForm, setBranchForm] =
    useState(EMPTY_BRANCH_FORM);

  const [pointForm, setPointForm] =
    useState(EMPTY_POINT_FORM);

  const [registerForm, setRegisterForm] =
    useState(EMPTY_REGISTER_FORM);

  const [branchFilter, setBranchFilter] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function load(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const branchRows =
        await api.branches();

      const companyId =
        branchRows[0]?.companyId;

      const [
        pointRows,
        registerRows,
        companyModuleRows,
        branchModuleRows,
      ] = await Promise.all([
        api.locationPoints(),
        api.locationCashRegisters(),
        companyId
          ? api.companyModules(companyId)
          : Promise.resolve([]),
        companyId
          ? api.branchModules(companyId)
          : Promise.resolve([]),
      ]);

      setBranches(branchRows);
      setPoints(pointRows);
      setRegisters(registerRows);
      setCompanyModules(companyModuleRows);
      setBranchModules(branchModuleRows);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar la configuración de sucursales.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [activeTab]);

  useEffect(() => {
    if (modal !== "register") {
      return;
    }

    if (!registerForm.branchId) {
      setAreas([]);
      return;
    }

    void api
      .operationalAreas(
        registerForm.branchId,
      )
      .then(setAreas)
      .catch((reason) => {
        setAreas([]);
        setError(
          reason instanceof Error
            ? reason.message
            : "No fue posible cargar las áreas operativas.",
        );
      });
  }, [modal, registerForm.branchId]);

  const filteredItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (
      activeTab === "branches" ||
      activeTab === "modules"
    ) {
      return branches.filter((branch) => {
        if (
          activeTab === "modules" &&
          branchFilter &&
          branch.id !== branchFilter
        ) {
          return false;
        }

        return [
          branch.name,
          branch.code,
          branch.address ?? "",
          branch.phone ?? "",
        ].some((value) =>
          value.toLowerCase().includes(query),
        );
      });
    }

    if (activeTab === "points") {
      return points.filter((point) => {
        if (
          branchFilter &&
          point.branchId !== branchFilter
        ) {
          return false;
        }

        return [
          point.name,
          point.code,
          point.branchName,
          point.description ?? "",
        ].some((value) =>
          value.toLowerCase().includes(query),
        );
      });
    }

    return registers.filter((register) => {
      if (
        branchFilter &&
        register.branchId !== branchFilter
      ) {
        return false;
      }

      return [
        register.name,
        register.code,
        register.branchName,
        register.pointOfSaleName ?? "",
        register.operationalAreaName ?? "",
      ].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [
    activeTab,
    branchFilter,
    branchModules,
    branches,
    companyModules,
    points,
    registers,
    search,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredItems.length / PAGE_SIZE,
    ),
  );

  const visibleItems = filteredItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function clearNotices(): void {
    setError("");
    setMessage("");
  }

  function closeModal(): void {
    if (saving) {
      return;
    }

    setModal(null);
    setEditingId("");
    setCapabilityPoint(null);
    setCapabilities([]);
    setAreas([]);
  }

  function openCreate(): void {
    clearNotices();
    setEditingId("");

    const defaultBranchId =
      branchFilter ||
      branches.find((branch) => branch.active)
        ?.id ||
      "";

    if (activeTab === "branches") {
      setBranchForm(EMPTY_BRANCH_FORM);
      setModal("branch");
      return;
    }

    if (activeTab === "points") {
      setPointForm({
        ...EMPTY_POINT_FORM,
        branchId: defaultBranchId,
      });
      setModal("point");
      return;
    }

    setRegisterForm({
      ...EMPTY_REGISTER_FORM,
      branchId: defaultBranchId,
    });
    setModal("register");
  }

  function editBranch(
    branch: BranchAdminResponse,
  ): void {
    clearNotices();
    setEditingId(branch.id);
    setBranchForm({
      name: branch.name,
      code: branch.code,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      active: branch.active,
    });
    setModal("branch");
  }

  function editPoint(
    point: LocationPointOfSaleResponse,
  ): void {
    clearNotices();
    setEditingId(point.id);
    setPointForm({
      branchId: point.branchId,
      name: point.name,
      code: point.code,
      description: point.description ?? "",
      active: point.active,
    });
    setModal("point");
  }

  function editRegister(
    register: LocationCashRegisterResponse,
  ): void {
    clearNotices();
    setEditingId(register.id);
    setRegisterForm({
      branchId: register.branchId,
      pointOfSaleId:
        register.pointOfSaleId ?? "",
      operationalAreaId:
        register.operationalAreaId ?? "",
      name: register.name,
      code: register.code,
      active: register.active,
    });
    setModal("register");
  }

  async function openCapabilities(
    point: LocationPointOfSaleResponse,
  ): Promise<void> {
    clearNotices();
    setCapabilityPoint(point);
    setModal("capabilities");
    setSaving(true);

    try {
      setCapabilities(
        await api.posCapabilities(point.id),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar las capacidades.",
      );
      setModal(null);
      setCapabilityPoint(null);
    } finally {
      setSaving(false);
    }
  }

  async function saveBranch(
    event: FormEvent,
  ): Promise<void> {
    event.preventDefault();
    setSaving(true);
    clearNotices();

    const payload = {
      name: branchForm.name.trim(),
      code: branchForm.code.trim(),
      address:
        branchForm.address.trim() || null,
      phone:
        branchForm.phone.trim() || null,
      active: branchForm.active,
    };

    try {
      if (editingId) {
        await api.updateBranch(
          editingId,
          payload,
        );
        setMessage(
          "Sucursal actualizada correctamente.",
        );
      } else {
        await api.createBranch(payload);
        setMessage(
          "Sucursal creada correctamente.",
        );
      }

      setModal(null);
      setEditingId("");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la sucursal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function savePoint(
    event: FormEvent,
  ): Promise<void> {
    event.preventDefault();
    setSaving(true);
    clearNotices();

    try {
      if (editingId) {
        await api.updateLocationPoint(
          editingId,
          {
            branchId: pointForm.branchId,
            name: pointForm.name.trim(),
            code: pointForm.code.trim(),
            description:
              pointForm.description.trim() ||
              null,
            active: pointForm.active,
          },
        );
        setMessage(
          "Punto de venta actualizado correctamente.",
        );
      } else {
        await api.createLocationPoint({
          branchId: pointForm.branchId,
          name: pointForm.name.trim(),
          code: pointForm.code.trim(),
          description:
            pointForm.description.trim() ||
            null,
          active: pointForm.active,
        });
        setMessage(
          "Punto de venta creado correctamente.",
        );
      }

      setModal(null);
      setEditingId("");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar el punto de venta.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRegister(
    event: FormEvent,
  ): Promise<void> {
    event.preventDefault();
    setSaving(true);
    clearNotices();

    try {
      if (editingId) {
        await api.updateLocationCashRegister(
          editingId,
          {
            name:
              registerForm.name.trim(),
            code:
              registerForm.code.trim(),
            pointOfSaleId:
              registerForm.pointOfSaleId ||
              null,
            operationalAreaId:
              registerForm.operationalAreaId ||
              null,
            active: registerForm.active,
          },
        );
        setMessage(
          "Caja actualizada correctamente.",
        );
      } else {
        await api.createLocationCashRegister(
          {
            branchId:
              registerForm.branchId,
            name:
              registerForm.name.trim(),
            code:
              registerForm.code.trim(),
            pointOfSaleId:
              registerForm.pointOfSaleId ||
              null,
            operationalAreaId:
              registerForm.operationalAreaId ||
              null,
            active: registerForm.active,
          },
        );
        setMessage(
          "Caja creada correctamente.",
        );
      }

      setModal(null);
      setEditingId("");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la caja.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCapability(
    capability: PosCapabilityType,
    enabled: boolean,
  ): Promise<void> {
    if (!capabilityPoint) {
      return;
    }

    setSaving(true);
    clearNotices();

    try {
      const updated =
        await api.updatePosCapability(
          capabilityPoint.id,
          capability,
          enabled,
        );

      setCapabilities((current) => {
        const exists = current.some(
          (item) =>
            item.capability === capability,
        );

        if (!exists) {
          return [...current, updated];
        }

        return current.map((item) =>
          item.capability === capability
            ? updated
            : item,
        );
      });

      setMessage(
        "Capacidad actualizada correctamente.",
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible actualizar la capacidad.",
      );
    } finally {
      setSaving(false);
    }
  }

  function isCompanyModuleEnabled(
    module: BusinessModuleType,
  ): boolean {
    return (
      companyModules.find(
        (item) => item.module === module,
      )?.enabled ?? false
    );
  }

  function isBranchModuleEnabled(
    branchId: string,
    module: BusinessModuleType,
  ): boolean {
    return (
      branchModules.find(
        (item) =>
          item.branchId === branchId &&
          item.module === module,
      )?.enabled ?? false
    );
  }

  async function toggleBranchModule(
    branchId: string,
    module: BusinessModuleType,
    enabled: boolean,
  ): Promise<void> {
    setSaving(true);
    clearNotices();

    try {
      const updated =
        await api.updateBranchModule(
          branchId,
          module,
          enabled,
        );

      setBranchModules((current) => {
        const exists = current.some(
          (item) =>
            item.branchId === branchId &&
            item.module === module,
        );

        if (!exists) {
          return [...current, updated];
        }

        return current.map((item) =>
          item.branchId === branchId &&
          item.module === module
            ? updated
            : item,
        );
      });

      setMessage(
        `Módulo ${module} actualizado correctamente.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible actualizar el módulo.",
      );
    } finally {
      setSaving(false);
    }
  }

  const activeBranches = branches.filter(
    (branch) => branch.active,
  );

  const registerPoints = points.filter(
    (point) =>
      point.active &&
      point.branchId ===
        registerForm.branchId,
  );

  const title =
    activeTab === "branches"
      ? "Sucursales registradas"
      : activeTab === "points"
        ? "Puntos de venta"
        : activeTab === "modules"
          ? "Módulos por sucursal"
          : "Cajas registradoras";

  const countLabel =
    activeTab === "branches"
      ? filteredItems.length === 1
        ? "sucursal"
        : "sucursales"
      : activeTab === "points"
        ? filteredItems.length === 1
          ? "punto"
          : "puntos"
        : activeTab === "modules"
          ? filteredItems.length === 1
            ? "sucursal"
            : "sucursales"
          : filteredItems.length === 1
            ? "caja"
            : "cajas";

  const canCreate =
    activeTab === "modules"
      ? false
      : activeTab === "registers"
      ? canManageCash
      : canManageCompany;

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Building2 size={22} strokeWidth={1.8} />
          </div>
          <div className="maintenance-header__text">
            <h1>Sucursales y ubicaciones</h1>
            <p>
              Configuración de sucursales, puntos de venta,
              módulos y cajas de la empresa actual.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/dashboard")}
        >
          Volver al panel
        </button>
      </header>

      {error ? (
        <p className="maintenance-alert maintenance-alert--error">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="maintenance-alert maintenance-alert--success">
          {message}
        </p>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div className="maintenance-toolbar__actions">
            <button
              type="button"
              className={
                activeTab === "branches"
                  ? "erp-button-primary"
                  : "secondary-button"
              }
              onClick={() => setActiveTab("branches")}
            >
              <Building2 size={16} />
              Sucursales
            </button>
            <button
              type="button"
              className={
                activeTab === "points"
                  ? "erp-button-primary"
                  : "secondary-button"
              }
              onClick={() => setActiveTab("points")}
            >
              <Store size={16} />
              Puntos de venta
            </button>
            <button
              type="button"
              className={
                activeTab === "modules"
                  ? "erp-button-primary"
                  : "secondary-button"
              }
              onClick={() => setActiveTab("modules")}
            >
              <Boxes size={16} />
              Módulos
            </button>
            <button
              type="button"
              className={
                activeTab === "registers"
                  ? "erp-button-primary"
                  : "secondary-button"
              }
              onClick={() => setActiveTab("registers")}
            >
              <WalletCards size={16} />
              Cajas
            </button>
          </div>
        </div>

        <div className="maintenance-toolbar">
          <div className="maintenance-toolbar__heading">
            <div>
              <p className="eyebrow">ORGANIZACIÓN</p>
              <h2>{title}</h2>
            </div>
            <span className="maintenance-count">
              {filteredItems.length} {countLabel}
            </span>
          </div>

          <div className="maintenance-toolbar__actions">
            {activeTab !== "branches" ? (
              <select
                value={branchFilter}
                onChange={(event) => {
                  setBranchFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filtrar por sucursal"
              >
                <option value="">
                  Todas las sucursales
                </option>
                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="maintenance-search">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar..."
                aria-label="Buscar"
              />
            </div>

            {canCreate ? (
              <button
                className="erp-button-primary"
                type="button"
                onClick={openCreate}
              >
                <Plus size={16} />
                Nuevo
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="operations-empty">
            Cargando configuración...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="operations-empty">
            No hay registros para mostrar.
          </div>
        ) : (
          <>
            <div className="maintenance-table-wrap">
              {activeTab === "branches" ? (
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th>Código</th>
                      <th>Dirección</th>
                      <th>Teléfono</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(visibleItems as BranchAdminResponse[]).map(
                      (branch) => (
                        <tr key={branch.id}>
                          <td><strong>{branch.name}</strong></td>
                          <td>{branch.code}</td>
                          <td>{branch.address ?? "Sin dirección"}</td>
                          <td>{branch.phone ?? "—"}</td>
                          <td>
                            <StatusBadge active={branch.active} />
                          </td>
                          <td>
                            {canManageCompany ? (
                              <IconButton
                                label={`Editar ${branch.name}`}
                                onClick={() => editBranch(branch)}
                              >
                                <Pencil size={16} />
                              </IconButton>
                            ) : null}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              ) : activeTab === "points" ? (
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Punto de venta</th>
                      <th>Código</th>
                      <th>Sucursal</th>
                      <th>Capacidades</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(visibleItems as LocationPointOfSaleResponse[]).map(
                      (point) => (
                        <tr key={point.id}>
                          <td>
                            <strong>{point.name}</strong>
                            <small>{point.description ?? ""}</small>
                          </td>
                          <td>{point.code}</td>
                          <td>{point.branchName}</td>
                          <td>
                            {
                              point.capabilities.filter(
                                (item) => item.enabled,
                              ).length
                            } activas
                          </td>
                          <td>
                            <StatusBadge active={point.active} />
                          </td>
                          <td>
                            <div className="maintenance-row-actions">
                              <IconButton
                                label={`Capacidades de ${point.name}`}
                                onClick={() => {
                                  void openCapabilities(point);
                                }}
                              >
                                <Settings2 size={16} />
                              </IconButton>
                              {canManageCompany ? (
                                <IconButton
                                  label={`Editar ${point.name}`}
                                  onClick={() => editPoint(point)}
                                >
                                  <Pencil size={16} />
                                </IconButton>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              ) : activeTab === "modules" ? (
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th>Código</th>
                      {BUSINESS_MODULES.map(
                        (module) => (
                          <th key={module.value}>
                            {module.label}
                          </th>
                        ),
                      )}
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visibleItems as BranchAdminResponse[]).map(
                      (branch) => (
                        <tr key={branch.id}>
                          <td>
                            <strong>{branch.name}</strong>
                          </td>
                          <td>{branch.code}</td>
                          {BUSINESS_MODULES.map(
                            (module) => {
                              const companyEnabled =
                                isCompanyModuleEnabled(
                                  module.value,
                                );
                              const branchEnabled =
                                isBranchModuleEnabled(
                                  branch.id,
                                  module.value,
                                );

                              return (
                                <td key={module.value}>
                                  <ModuleToggle
                                    checked={
                                      companyEnabled &&
                                      branchEnabled
                                    }
                                    disabled={
                                      saving ||
                                      !canManageModules ||
                                      !companyEnabled ||
                                      !branch.active
                                    }
                                    unavailable={
                                      !companyEnabled
                                    }
                                    label={`${module.label} en ${branch.name}`}
                                    onChange={(enabled) => {
                                      void toggleBranchModule(
                                        branch.id,
                                        module.value,
                                        enabled,
                                      );
                                    }}
                                  />
                                </td>
                              );
                            },
                          )}
                          <td>
                            <StatusBadge
                              active={branch.active}
                            />
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Caja</th>
                      <th>Código</th>
                      <th>Sucursal</th>
                      <th>Punto de venta</th>
                      <th>Área operativa</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(visibleItems as LocationCashRegisterResponse[]).map(
                      (register) => (
                        <tr key={register.id}>
                          <td><strong>{register.name}</strong></td>
                          <td>{register.code}</td>
                          <td>{register.branchName}</td>
                          <td>{register.pointOfSaleName ?? "Sin asignar"}</td>
                          <td>{register.operationalAreaName ?? "Sin asignar"}</td>
                          <td>
                            <StatusBadge active={register.active} />
                          </td>
                          <td>
                            {canManageCash ? (
                              <IconButton
                                label={`Editar ${register.name}`}
                                onClick={() => editRegister(register)}
                              >
                                <Pencil size={16} />
                              </IconButton>
                            ) : null}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="maintenance-pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1),
                  )
                }
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="secondary-button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(totalPages, current + 1),
                  )
                }
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>

      {modal === "branch" ? (
        <Modal
          title={editingId ? "Editar sucursal" : "Nueva sucursal"}
          saving={saving}
          onClose={closeModal}
        >
          <form
            className="maintenance-modal__form"
            onSubmit={(event) => void saveBranch(event)}
          >
            <div className="maintenance-modal__body">
              <div className="maintenance-form-grid">
                <TextField
                  label="Nombre"
                  required
                  value={branchForm.name}
                  onChange={(name) =>
                    setBranchForm({ ...branchForm, name })
                  }
                />
                <TextField
                  label="Código"
                  required
                  value={branchForm.code}
                  onChange={(code) =>
                    setBranchForm({
                      ...branchForm,
                      code: code.toUpperCase(),
                    })
                  }
                />
                <TextField
                  label="Teléfono"
                  value={branchForm.phone}
                  onChange={(phone) =>
                    setBranchForm({ ...branchForm, phone })
                  }
                />
                <TextField
                  label="Dirección"
                  value={branchForm.address}
                  onChange={(address) =>
                    setBranchForm({ ...branchForm, address })
                  }
                />
              </div>
              {editingId ? (
                <ActiveSwitch
                  checked={branchForm.active}
                  label="Sucursal activa"
                  onChange={(active) =>
                    setBranchForm({ ...branchForm, active })
                  }
                />
              ) : null}
            </div>
            <ModalFooter saving={saving} editing={Boolean(editingId)} onCancel={closeModal} />
          </form>
        </Modal>
      ) : null}

      {modal === "point" ? (
        <Modal
          title={editingId ? "Editar punto de venta" : "Nuevo punto de venta"}
          saving={saving}
          onClose={closeModal}
        >
          <form
            className="maintenance-modal__form"
            onSubmit={(event) => void savePoint(event)}
          >
            <div className="maintenance-modal__body">
              <div className="maintenance-form-grid">
                <label>
                  Sucursal
                  <select
                    required
                    value={pointForm.branchId}
                    onChange={(event) =>
                      setPointForm({
                        ...pointForm,
                        branchId: event.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {(editingId ? branches : activeBranches).map(
                      (branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <TextField
                  label="Código"
                  required
                  value={pointForm.code}
                  onChange={(code) =>
                    setPointForm({
                      ...pointForm,
                      code: code.toUpperCase(),
                    })
                  }
                />
                <TextField
                  label="Nombre"
                  required
                  value={pointForm.name}
                  onChange={(name) =>
                    setPointForm({ ...pointForm, name })
                  }
                />
                <TextField
                  label="Descripción"
                  value={pointForm.description}
                  onChange={(description) =>
                    setPointForm({ ...pointForm, description })
                  }
                />
              </div>
              {editingId ? (
                <ActiveSwitch
                  checked={pointForm.active}
                  label="Punto de venta activo"
                  onChange={(active) =>
                    setPointForm({ ...pointForm, active })
                  }
                />
              ) : null}
            </div>
            <ModalFooter saving={saving} editing={Boolean(editingId)} onCancel={closeModal} />
          </form>
        </Modal>
      ) : null}

      {modal === "register" ? (
        <Modal
          title={editingId ? "Editar caja" : "Nueva caja"}
          saving={saving}
          onClose={closeModal}
        >
          <form
            className="maintenance-modal__form"
            onSubmit={(event) => void saveRegister(event)}
          >
            <div className="maintenance-modal__body">
              <div className="maintenance-form-grid">
                <label>
                  Sucursal
                  <select
                    required
                    disabled={Boolean(editingId)}
                    value={registerForm.branchId}
                    onChange={(event) =>
                      setRegisterForm({
                        ...registerForm,
                        branchId: event.target.value,
                        pointOfSaleId: "",
                        operationalAreaId: "",
                      })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {(editingId ? branches : activeBranches).map(
                      (branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <TextField
                  label="Código"
                  required
                  value={registerForm.code}
                  onChange={(code) =>
                    setRegisterForm({
                      ...registerForm,
                      code: code.toUpperCase(),
                    })
                  }
                />
                <TextField
                  label="Nombre"
                  required
                  value={registerForm.name}
                  onChange={(name) =>
                    setRegisterForm({ ...registerForm, name })
                  }
                />
                <label>
                  Punto de venta
                  <select
                    value={registerForm.pointOfSaleId}
                    onChange={(event) =>
                      setRegisterForm({
                        ...registerForm,
                        pointOfSaleId: event.target.value,
                      })
                    }
                  >
                    <option value="">Sin asignar</option>
                    {registerPoints.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Área operativa
                  <select
                    value={registerForm.operationalAreaId}
                    onChange={(event) =>
                      setRegisterForm({
                        ...registerForm,
                        operationalAreaId: event.target.value,
                      })
                    }
                  >
                    <option value="">Sin asignar</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {editingId ? (
                <ActiveSwitch
                  checked={registerForm.active}
                  label="Caja activa"
                  onChange={(active) =>
                    setRegisterForm({ ...registerForm, active })
                  }
                />
              ) : null}
            </div>
            <ModalFooter saving={saving} editing={Boolean(editingId)} onCancel={closeModal} />
          </form>
        </Modal>
      ) : null}

      {modal === "capabilities" && capabilityPoint ? (
        <Modal
          title={`Capacidades: ${capabilityPoint.name}`}
          saving={saving}
          onClose={closeModal}
        >
          <div className="maintenance-modal__body">
            {CAPABILITIES.map((option) => {
              const checked =
                capabilities.find(
                  (item) =>
                    item.capability === option.value,
                )?.enabled ?? false;

              return (
                <ActiveSwitch
                  key={option.value}
                  checked={checked}
                  label={option.label}
                  disabled={saving || !canManageCompany}
                  onChange={(enabled) => {
                    void toggleCapability(
                      option.value,
                      enabled,
                    );
                  }}
                />
              );
            })}
          </div>
          <footer className="maintenance-modal__footer">
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={closeModal}
            >
              Cerrar
            </button>
          </footer>
        </Modal>
      ) : null}
    </main>
  );
}

function ModuleToggle({
  checked,
  disabled,
  unavailable,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  unavailable: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const text = unavailable
    ? "No habilitado en empresa"
    : checked
      ? "Activo"
      : "Inactivo";

  return (
    <button
      type="button"
      className={
        checked
          ? "maintenance-badge maintenance-badge--success"
          : "maintenance-badge maintenance-badge--danger"
      }
      disabled={disabled}
      aria-label={label}
      aria-pressed={checked}
      title={
        unavailable
          ? "Primero habilite este módulo en la configuración de la empresa."
          : label
      }
      onClick={() => onChange(!checked)}
    >
      {text}
    </button>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={
        active
          ? "maintenance-badge maintenance-badge--success"
          : "maintenance-badge maintenance-badge--danger"
      }
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="maintenance-icon-button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TextField({
  label,
  required = false,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        required={required}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </label>
  );
}

function ActiveSwitch({
  checked,
  label,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="maintenance-switch">
      <span>
        <strong>{label}</strong>
        <small>
          Controla la disponibilidad para nuevas operaciones.
        </small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />
      <i aria-hidden="true" />
    </label>
  );
}

function Modal({
  children,
  title,
  saving,
  onClose,
}: {
  children: ReactNode;
  title: string;
  saving: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="maintenance-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        className="maintenance-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
      >
        <header className="maintenance-modal__header">
          <div>
            <p className="eyebrow">CONFIGURACIÓN</p>
            <h2 id="location-modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className="maintenance-modal__close"
            aria-label="Cerrar"
            disabled={saving}
            onClick={onClose}
          >
            X
          </button> 
        </header>
        {children}
      </section>
    </div>
  );
}

function ModalFooter({
  saving,
  editing,
  onCancel,
}: {
  saving: boolean;
  editing: boolean;
  onCancel: () => void;
}) {
  return (
    <footer className="maintenance-modal__footer">
      <button
        type="button"
        className="secondary-button"
        disabled={saving}
        onClick={onCancel}
      >
        Cancelar
      </button>
      <button
        className="erp-button-primary"
        type="submit"
        disabled={saving}
      >
        {saving
          ? "Guardando..."
          : editing
            ? "Guardar cambios"
            : "Crear"}
      </button>
    </footer>
  );
}
