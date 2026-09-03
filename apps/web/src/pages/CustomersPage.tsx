import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
  CustomerResponse,
  CustomerVehicleResponse,
  CustomerInvoiceResponse,
  CustomerInvoiceDetailResponse,
  VehicleTypeResponse,
  PaymentMethodResponse,
  CashRegisterSummaryResponse,
  CustomerPriceLevelSummaryResponse,
  PriceLevelResponse,
} from "@cactus/shared";
import { ERP_PERMISSIONS } from "@cactus/shared";
import { api } from "../lib/api";
import { hasPermission } from "../lib/authStorage";
import { Users } from "lucide-react";

const PAGE_SIZE = 10;

type CustomerForm = {
  type: "GENERAL" | "REGISTERED";
  displayName: string;
  legalName: string;
  phone: string;
  email: string;
  taxId: string;
  priceLevelId: string;
  active: boolean;
};

const EMPTY_FORM: CustomerForm = {
  type: "REGISTERED",
  displayName: "",
  legalName: "",
  phone: "",
  email: "",
  taxId: "",
  priceLevelId: "",
  active: true,
};

export function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  const canManage = hasPermission(ERP_PERMISSIONS.customerManage);

  const canManageCredit = hasPermission(ERP_PERMISSIONS.customerCreditManage);

  const [customers, setCustomers] = useState<CustomerResponse[]>([]);

  const [priceLevels, setPriceLevels] = useState<PriceLevelResponse[]>([]);

  const [customerPriceLevels, setCustomerPriceLevels] = useState<
    CustomerPriceLevelSummaryResponse[]
  >([]);

  const [selected, setSelected] = useState<CustomerResponse | null>(null);

  const [vehicles, setVehicles] = useState<CustomerVehicleResponse[]>([]);

  const [carWashEnabled, setCarWashEnabled] = useState(false);

  const [customerInvoices, setCustomerInvoices] = useState<
    CustomerInvoiceResponse[]
  >([]);

  const [selectedInvoice, setSelectedInvoice] =
    useState<CustomerInvoiceDetailResponse | null>(null);

  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>(
    [],
  );

  const [cashRegisters, setCashRegisters] = useState<
    CashRegisterSummaryResponse[]
  >([]);

  const [paymentAmount, setPaymentAmount] = useState("");

  const [paymentMethodId, setPaymentMethodId] = useState("");

  const [cashRegisterId, setCashRegisterId] = useState("");

  const [paymentReference, setPaymentReference] = useState("");

  const [paymentSaving, setPaymentSaving] = useState(false);

  const [paymentFormOpen, setPaymentFormOpen] = useState(false);

  const [creditNoteFormOpen, setCreditNoteFormOpen] = useState(false);

  const [creditNoteAmount, setCreditNoteAmount] = useState("");

  const [creditNoteReason, setCreditNoteReason] = useState("");

  const [creditNoteSaving, setCreditNoteSaving] = useState(false);

  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeResponse[]>([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [creditEnabled, setCreditEnabled] = useState(false);

  const [creditLimit, setCreditLimit] = useState(0);

  const [creditDays, setCreditDays] = useState(0);

  const [vehicleTypeId, setVehicleTypeId] = useState("");

  const [vehicleDescription, setVehicleDescription] = useState("");

  const [vehiclePlate, setVehiclePlate] = useState("");

  const [vehicleColor, setVehicleColor] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return customers.slice(start, start + PAGE_SIZE);
  }, [customers, page]);

  const customerPriceLevelById = useMemo(
    () =>
      new Map(
        customerPriceLevels.map((row) => [row.customerId, row]),
      ),
    [customerPriceLevels],
  );

  const defaultPriceLevelName =
    priceLevels.find((level) => level.isDefault)?.name ?? "Detalle";

  async function loadCustomers(query = search): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const [rows, customerLevelRows] = await Promise.all([
        api.customers(query),
        api.customerPriceLevels(),
      ]);

      setCustomers(rows);
      setCustomerPriceLevels(customerLevelRows);
      setPage(1);

      if (selected && !rows.some((row) => row.id === selected.id)) {
        setSelected(null);
        setVehicles([]);
        setIsDetailModalOpen(false);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar clientes.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value: number): string {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(value);
  }

  function formatDate(value: string | null): string {
    if (!value) return "—";

    return new Intl.DateTimeFormat("es-DO", {
      dateStyle: "medium",
    }).format(new Date(value));
  }

  function invoiceStatusLabel(
    status: CustomerInvoiceResponse["status"],
  ): string {
    switch (status) {
      case "ISSUED":
        return "Emitida";
      case "PARTIALLY_PAID":
        return "Pago parcial";
      case "PAID":
        return "Pagada";
      case "CREDIT":
        return "Crédito";
      case "CREDIT_NOTED":
        return "Acreditada";
      default:
        return status;
    }
  }

  async function loadPaymentContext(): Promise<void> {
    try {
      const [methods, registers] = await Promise.all([
        api.paymentMethods(),
        api.cashRegisters(),
      ]);

      setPaymentMethods(methods.filter((method) => method.type !== "CREDIT"));

      setCashRegisters(
        registers.filter(
          (register) => register.active && register.openSession !== null,
        ),
      );
    } catch (reason) {
      setPaymentMethods([]);
      setCashRegisters([]);

      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar los medios de cobro.",
      );
    }
  }

  function openPaymentForm(): void {
    if (!selectedInvoice) {
      return;
    }

    setPaymentAmount(selectedInvoice.balance.toFixed(2));
    setPaymentMethodId("");
    setCashRegisterId("");
    setPaymentReference("");
    setPaymentFormOpen(true);
    setError("");
    setNotice("");

    void loadPaymentContext();
  }

  function closePaymentForm(): void {
    if (paymentSaving) {
      return;
    }

    setPaymentFormOpen(false);
    setPaymentAmount("");
    setPaymentMethodId("");
    setCashRegisterId("");
    setPaymentReference("");
  }

  async function saveInvoicePayment(): Promise<void> {
    if (!selected || !selectedInvoice) {
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto del abono debe ser mayor que cero.");
      return;
    }

    if (amount > selectedInvoice.balance) {
      setError("El abono no puede superar el saldo pendiente de la factura.");
      return;
    }

    if (!paymentMethodId) {
      setError("Seleccione un método de pago.");
      return;
    }

    if (!cashRegisterId) {
      setError("Seleccione una caja abierta.");
      return;
    }

    setPaymentSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await api.payCustomerInvoice(
        selected.id,
        selectedInvoice.id,
        {
          amount,
          paymentMethodId,
          cashRegisterId,
          reference: paymentReference.trim() || undefined,
        },
      );

      setNotice(result.message);
      setPaymentFormOpen(false);

      await loadCustomerInvoices(selected.id);

      await openInvoiceDetail(selected.id, selectedInvoice.id);

      setPaymentAmount("");
      setPaymentMethodId("");
      setCashRegisterId("");
      setPaymentReference("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible registrar el abono.",
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  function openCreditNoteForm(): void {
    if (!selectedInvoice) {
      return;
    }

    setCreditNoteAmount(selectedInvoice.balance.toFixed(2));
    setCreditNoteReason("");
    setCreditNoteFormOpen(true);
    setError("");
    setNotice("");
  }

  function closeCreditNoteForm(): void {
    if (creditNoteSaving) {
      return;
    }

    setCreditNoteFormOpen(false);
    setCreditNoteAmount("");
    setCreditNoteReason("");
  }

  async function saveCreditNote(): Promise<void> {
    if (!selected || !selectedInvoice) {
      return;
    }

    const amount = Number(creditNoteAmount);

    const reason = creditNoteReason.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto de la nota de crédito debe ser mayor que cero.");
      return;
    }

    if (amount > selectedInvoice.balance) {
      setError(
        "La nota de crédito no puede superar el saldo pendiente de la factura.",
      );
      return;
    }

    if (!reason) {
      setError("Debe indicar el motivo de la nota de crédito.");
      return;
    }

    setCreditNoteSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await api.issueCustomerCreditNote(
        selected.id,
        selectedInvoice.id,
        {
          amount,
          reason,
        },
      );

      setNotice(result.message);
      setCreditNoteFormOpen(false);

      await loadCustomerInvoices(selected.id);

      await openInvoiceDetail(selected.id, selectedInvoice.id);

      setCreditNoteAmount("");
      setCreditNoteReason("");
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "No fue posible emitir la nota de crédito.",
      );
    } finally {
      setCreditNoteSaving(false);
    }
  }

  async function cancelInvoiceCreditNote(creditNoteId: string): Promise<void> {
    if (!selected || !selectedInvoice) return;

    setError("");
    setNotice("");

    try {
      const result = await api.cancelCustomerCreditNote(
        selected.id,
        selectedInvoice.id,
        creditNoteId,
      );

      setNotice(result.message);

      await loadCustomerInvoices(selected.id);
      await openInvoiceDetail(selected.id, selectedInvoice.id);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cancelar la nota de crédito.",
      );
    }
  }

  async function loadCustomerInvoices(customerId: string): Promise<void> {
    setLoadingInvoices(true);

    try {
      const rows = await api.customerInvoices(customerId);

      setCustomerInvoices(rows);
    } catch (reason) {
      setCustomerInvoices([]);
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar las facturas del cliente.",
      );
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function openInvoiceDetail(
    customerId: string,
    invoiceId: string,
  ): Promise<void> {
    setLoadingInvoiceDetail(true);
    setError("");

    try {
      const detail = await api.customerInvoice(customerId, invoiceId);

      setSelectedInvoice(detail);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el detalle de la factura.",
      );
    } finally {
      setLoadingInvoiceDetail(false);
    }
  }

  async function selectCustomer(customer: CustomerResponse): Promise<void> {
    setSelected(customer);
    setCreditEnabled(customer.creditEnabled);
    setCreditLimit(customer.creditLimit);
    setCreditDays(customer.creditDays);
    setError("");
    setNotice("");
    setIsDetailModalOpen(true);

    setSelectedInvoice(null);
    setCustomerInvoices([]);

    try {
      if (carWashEnabled) {
        const [vehicleRows, invoiceRows] = await Promise.all([
          api.customerVehicles(customer.id),
          api.customerInvoices(customer.id),
        ]);

        setVehicles(vehicleRows);
        setCustomerInvoices(invoiceRows);
      } else {
        const invoiceRows = await api.customerInvoices(customer.id);

        setVehicles([]);
        setCustomerInvoices(invoiceRows);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el detalle del cliente.",
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialContext(): Promise<void> {
      try {
        const [customerRows, points, levelRows, customerLevelRows] =
          await Promise.all([
          api.customers(),
          api.posPoints(),
          api.priceLevels(),
          api.customerPriceLevels(),
        ]);

        if (cancelled) return;

        setCustomers(customerRows);
        setPriceLevels(levelRows);
        setCustomerPriceLevels(customerLevelRows);

        const point = points[0];

        if (!point) {
          setCarWashEnabled(false);
          setVehicleTypes([]);
          return;
        }

        const [companyRows, branchRows] = await Promise.all([
          api.companyModules(point.companyId),
          api.branchModules(point.companyId, point.branchId),
        ]);

        if (cancelled) return;

        const companyCarWash = companyRows.find(
          (row) => row.module === "CAR_WASH",
        );

        const branchCarWash = branchRows.find(
          (row) => row.module === "CAR_WASH",
        );

        const enabled = Boolean(
          companyCarWash?.enabled && branchCarWash?.enabled,
        );

        setCarWashEnabled(enabled);

        if (!enabled) {
          setVehicles([]);
          setVehicleTypes([]);
          setVehicleTypeId("");
          return;
        }

        const typeRows = await api.vehicleTypes();

        if (cancelled) return;

        setVehicleTypes(typeRows);

        setVehicleTypeId(typeRows[0]?.id ?? "");
      } catch (reason) {
        if (!cancelled) {
          setCarWashEnabled(false);
          setVehicleTypes([]);

          setError(
            reason instanceof Error
              ? reason.message
              : "No fue posible cargar la configuración de clientes.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialContext();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isFormModalOpen && !isDetailModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !saving) {
        setIsFormModalOpen(false);
        setIsDetailModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFormModalOpen, isDetailModalOpen, saving]);


  useEffect(() => {
  const customerId =
    searchParams.get('customerId');

  const invoiceId =
    searchParams.get('invoiceId');

  if (
    loading ||
    !customerId ||
    deepLinkHandled
  ) {
    return;
  }

const customer =
  customers.find(
    (row) =>
      row.id === customerId,
  );

if (!customer) {
  return;
}


const selectedCustomer = customer;

setDeepLinkHandled(true);

let cancelled = false;

async function openFromReceivables(): Promise<void> {
  await selectCustomer(
    selectedCustomer,
  );

  if (
    cancelled ||
    !invoiceId
  ) {
    return;
  }

  await openInvoiceDetail(
    selectedCustomer.id,
    invoiceId,
  );
}
 
  

  void openFromReceivables();

  return () => {
    cancelled = true;
  };
}, [
  loading,
  customers,
  searchParams,
  deepLinkHandled,
]);


  function resetForm(): void {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      priceLevelId:
        priceLevels.find((level) => level.isDefault && level.active)?.id ?? '',
    });
  }

  function openCreateCustomer(): void {
    resetForm();
    setError("");
    setNotice("");
    setIsFormModalOpen(true);
  }

  function editCustomer(customer: CustomerResponse): void {
    setEditingId(customer.id);
    setForm({
      type: customer.type === "GENERAL" ? "GENERAL" : "REGISTERED",
      displayName: customer.displayName,
      legalName: customer.legalName ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      taxId: customer.taxId ?? "",
      priceLevelId:
        customerPriceLevelById.get(customer.id)?.priceLevelId ??
        priceLevels.find((level) => level.isDefault && level.active)?.id ??
        "",
      active: customer.active,
    });
    setError("");
    setNotice("");
    setIsFormModalOpen(true);
  }

  function closeFormModal(): void {
    if (saving) return;

    setIsFormModalOpen(false);
    resetForm();
  }

  function closeDetailModal(): void {
    if (saving) return;

    setIsDetailModalOpen(false);
    setSelectedInvoice(null);
    setCustomerInvoices([]);
  }

  async function saveCustomer(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (!canManage) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { priceLevelId, ...customerPayload } = form;
      const effectivePriceLevelId =
        priceLevelId ||
        priceLevels.find((level) => level.isDefault && level.active)?.id ||
        '';

      if (!effectivePriceLevelId) {
        throw new Error(
          'La empresa no tiene un nivel de precio predeterminado activo.',
        );
      }

      if (editingId) {
        await api.updateCustomer(editingId, customerPayload);

        await api.updateCustomerPriceLevel(editingId, {
          priceLevelId: effectivePriceLevelId,
        });

        setNotice("Cliente actualizado.");
      } else {
        const created = await api.createCustomer(customerPayload);

        await api.updateCustomerPriceLevel(created.id, {
          priceLevelId: effectivePriceLevelId,
        });

        setNotice("Cliente creado.");
      }

      setIsFormModalOpen(false);
      resetForm();
      await loadCustomers("");
      setSearch("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar el cliente.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCredit(): Promise<void> {
    if (!selected || !canManageCredit) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updated = await api.updateCustomerCredit(selected.id, {
        creditEnabled,
        creditLimit,
        creditDays,
      });

      setSelected(updated);
      setNotice("Política de crédito actualizada.");

      await loadCustomers(search);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible actualizar el crédito.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addVehicle(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (!selected || !canManage || !carWashEnabled) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.createCustomerVehicle(selected.id, {
        vehicleTypeId,
        description: vehicleDescription,
        plate: vehiclePlate || undefined,
        color: vehicleColor || undefined,
      });

      const rows = await api.customerVehicles(selected.id);

      setVehicles(rows);
      setVehicleDescription("");
      setVehiclePlate("");
      setVehicleColor("");
      setNotice("Vehículo agregado.");

      await loadCustomers(search);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible agregar el vehículo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Users size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Clientes</h1>

            <p>Directorio de clientes, crédito y estado de cuenta.</p>
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
        <p className="maintenance-alert maintenance-alert--error">{error}</p>
      ) : null}

      {notice ? (
        <p className="maintenance-alert maintenance-alert--success">{notice}</p>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div className="maintenance-toolbar__heading">
            <div>
              <p className="eyebrow">DIRECTORIO</p>
              <h2>Clientes</h2>
            </div>

            <span className="maintenance-count">
              {customers.length}
              {customers.length === 1 ? " cliente" : " clientes"}
            </span>
          </div>

          <div className="maintenance-toolbar__actions">
            <form
              className="maintenance-search"
              onSubmit={(event) => {
                event.preventDefault();
                void loadCustomers();
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar clientes..."
                aria-label="Buscar clientes"
              />

              <button
                type="submit"
                className="secondary-button"
                disabled={loading}
              >
                Buscar
              </button>
            </form>

            {canManage ? (
              <button
                className="erp-button-primary"
                type="button"
                onClick={openCreateCustomer}
              >
                Nuevo cliente
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="operations-empty">No hay clientes para mostrar.</div>
        ) : (
          <>
            <div className="maintenance-table-wrap">
              <table className="maintenance-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Nivel de precio</th>
                    <th>Teléfono</th>
                    <th>Crédito</th>
                    <th>Límite</th>
                    {carWashEnabled ? <th>Vehículos</th> : null}
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.displayName}</strong>
                        <small>{customer.taxId ?? "Sin RNC/Cédula"}</small>
                      </td>

                      <td>
                        <span className="maintenance-badge maintenance-badge--neutral">
                          {customer.type === "CREDIT"
                            ? "Crédito"
                            : customer.type === "GENERAL"
                              ? "General"
                              : "Registrado"}
                        </span>
                      </td>

                      <td>
                        <span className="maintenance-badge maintenance-badge--neutral">
                          {customerPriceLevelById.get(customer.id)
                            ?.priceLevelName ?? defaultPriceLevelName}
                        </span>
                      </td>

                      <td>{customer.phone ?? "—"}</td>

                      <td>
                        <span
                          className={
                            customer.creditEnabled
                              ? "maintenance-badge maintenance-badge--success"
                              : "maintenance-badge maintenance-badge--muted"
                          }
                        >
                          {customer.creditEnabled
                            ? "Habilitado"
                            : "Sin crédito"}
                        </span>
                      </td>

                      <td>RD$ {customer.creditLimit.toFixed(2)}</td>

                      {carWashEnabled ? <td>{customer.vehicleCount}</td> : null}

                      <td>
                        <span
                          className={
                            customer.active
                              ? "maintenance-badge maintenance-badge--success"
                              : "maintenance-badge maintenance-badge--danger"
                          }
                        >
                          {customer.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td>
                        <div className="maintenance-row-actions">
                          <button
                            type="button"
                            className="maintenance-icon-button"
                            title="Ver cliente"
                            aria-label={`Ver ${customer.displayName}`}
                            onClick={() => {
                              void selectCustomer(customer);
                            }}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <circle
                                cx="12"
                                cy="12"
                                r="2.7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              />
                            </svg>
                          </button>

                          {canManage ? (
                            <button
                              type="button"
                              className="maintenance-icon-button"
                              title="Editar cliente"
                              aria-label={`Editar ${customer.displayName}`}
                              onClick={() => editCustomer(customer)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M4 20h4l11-11-4-4L4 16v4Z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="m13.5 6.5 4 4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="maintenance-pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>

      {canManage && isFormModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFormModal();
            }
          }}
        >
          <section
            className="maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-form-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">{editingId ? "EDICIÓN" : "NUEVO"}</p>

                <h2 id="customer-form-modal-title">
                  {editingId ? "Editar cliente" : "Nuevo cliente"}
                </h2>

                <p>Datos generales del cliente.</p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeFormModal}
              >
                ×
              </button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={(event) => {
                void saveCustomer(event);
              }}
            >
              <div className="maintenance-modal__body">
                <div className="maintenance-form-grid">
                  <label>
                    Tipo
                    <select
                      value={form.type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          type: event.target.value as "GENERAL" | "REGISTERED",
                        }))
                      }
                    >
                      <option value="REGISTERED">Registrado</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </label>

                  <label>
                    Nivel de precio
                    <select
                      value={form.priceLevelId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priceLevelId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Usar nivel predeterminado</option>
                      {priceLevels
                        .filter((level) => level.active)
                        .map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                            {level.isDefault ? " · Predeterminado" : ""}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    Nombre
                    <input
                      required
                      value={form.displayName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Razón social
                    <input
                      value={form.legalName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          legalName: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    RNC / Cédula
                    <input
                      value={form.taxId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          taxId: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <label className="maintenance-switch">
                  <span>
                    <strong>Cliente activo</strong>
                    <small>
                      Permite utilizar este cliente en nuevas operaciones.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />

                  <i aria-hidden="true" />
                </label>
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={closeFormModal}
                >
                  Cancelar
                </button>

                <button type="submit" disabled={saving}>
                  {saving
                    ? "Guardando..."
                    : editingId
                      ? "Guardar cambios"
                      : "Crear cliente"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {selected && isDetailModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetailModal();
            }
          }}
        >
          <section
            className="maintenance-modal maintenance-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-detail-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">DETALLE</p>

                <h2 id="customer-detail-modal-title">{selected.displayName}</h2>

                <p>
                  {selected.phone ?? "Sin teléfono"}
                  {" · "}
                  {selected.email ?? "Sin email"}
                </p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeDetailModal}
              >
                ×
              </button>
            </header>

            <div className="maintenance-modal__body">
              <div className="maintenance-summary-grid">
                <article>
                  <span>Tipo</span>
                  <strong>{selected.type}</strong>
                </article>

                <article>
                  <span>Nivel de precio</span>
                  <strong>
                    {customerPriceLevelById.get(selected.id)
                      ?.priceLevelName ?? defaultPriceLevelName}
                  </strong>
                </article>

                <article>
                  <span>Crédito</span>
                  <strong>
                    {selected.creditEnabled ? "Habilitado" : "Deshabilitado"}
                  </strong>
                </article>

                <article>
                  <span>Límite</span>
                  <strong>RD$ {selected.creditLimit.toFixed(2)}</strong>
                </article>

                <article>
                  <span>Días</span>
                  <strong>{selected.creditDays}</strong>
                </article>
              </div>

              {canManageCredit ? (
                <section className="maintenance-section">
                  <div>
                    <h3>Política de crédito</h3>
                    <p>Configura disponibilidad, límite y plazo.</p>
                  </div>

                  <label className="maintenance-switch">
                    <span>
                      <strong>Crédito habilitado</strong>
                      <small>Permite ventas a crédito para este cliente.</small>
                    </span>

                    <input
                      type="checkbox"
                      checked={creditEnabled}
                      onChange={(event) =>
                        setCreditEnabled(event.target.checked)
                      }
                    />

                    <i aria-hidden="true" />
                  </label>

                  <div className="maintenance-inline-fields">
                    <label>
                      Límite
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={creditLimit}
                        onChange={(event) =>
                          setCreditLimit(Number(event.target.value))
                        }
                      />
                    </label>

                    <label>
                      Días
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={creditDays}
                        onChange={(event) =>
                          setCreditDays(Number(event.target.value))
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="erp-button-primary"
                      disabled={saving}
                      onClick={() => {
                        void saveCredit();
                      }}
                    >
                      Guardar crédito
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="maintenance-section">
                <div>
                  <h3>Estado de cuenta</h3>
                  <p>Facturas, saldos, pagos y notas de crédito del cliente.</p>
                </div>

                {loadingInvoices ? (
                  <div className="operations-empty">
                    Cargando estado de cuenta...
                  </div>
                ) : customerInvoices.length === 0 ? (
                  <div className="operations-empty">
                    Este cliente no tiene facturas registradas.
                  </div>
                ) : (
                  <div className="maintenance-table-wrap">
                    <table className="maintenance-table">
                      <thead>
                        <tr>
                          <th>Factura</th>
                          <th>Fecha</th>
                          <th>Vence</th>
                          <th>Estado</th>
                          <th>Total</th>
                          <th>Saldo</th>
                          <th />
                        </tr>
                      </thead>

                      <tbody>
                        {customerInvoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>
                              <strong>{invoice.invoiceNumber}</strong>
                              <small>{invoice.orderNumber}</small>
                            </td>

                            <td>{formatDate(invoice.issuedAt)}</td>

                            <td>{formatDate(invoice.dueDate)}</td>

                            <td>
                              <span className="maintenance-badge">
                                {invoiceStatusLabel(invoice.status)}
                              </span>
                            </td>

                            <td>{formatMoney(invoice.total)}</td>

                            <td>
                              <strong>{formatMoney(invoice.balance)}</strong>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="secondary-button"
                                disabled={loadingInvoiceDetail}
                                onClick={() => {
                                  void openInvoiceDetail(
                                    selected.id,
                                    invoice.id,
                                  );
                                }}
                              >
                                Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedInvoice ? (
                  <div className="maintenance-section">
                    <div>
                      <h3>Factura {selectedInvoice.invoiceNumber}</h3>

                      <p>
                        Estado: {invoiceStatusLabel(selectedInvoice.status)}
                        {" · "}
                        Saldo: {formatMoney(selectedInvoice.balance)}
                      </p>
                    </div>

                    <div className="maintenance-summary-grid">
                      <article>
                        <span>Subtotal</span>
                        <strong>{formatMoney(selectedInvoice.subtotal)}</strong>
                      </article>

                      <article>
                        <span>Impuestos</span>
                        <strong>
                          {formatMoney(selectedInvoice.taxAmount)}
                        </strong>
                      </article>

                      <article>
                        <span>Total</span>
                        <strong>{formatMoney(selectedInvoice.total)}</strong>
                      </article>

                      <article>
                        <span>Saldo</span>
                        <strong>{formatMoney(selectedInvoice.balance)}</strong>
                      </article>
                    </div>

                    <div>
                      <h3>Pagos</h3>

                      {selectedInvoice.payments.length === 0 ? (
                        <div className="operations-empty">
                          Esta factura no tiene pagos aplicados.
                        </div>
                      ) : (
                        <div className="maintenance-list">
                          {selectedInvoice.payments.map((payment) => (
                            <article key={payment.paymentId}>
                              <strong>
                                {formatMoney(payment.amount)}
                                {" · "}
                                {payment.paymentMethodName}
                              </strong>

                              <span>
                                {formatDate(payment.receivedAt)}
                                {" · "}
                                {payment.reference ?? "Sin referencia"}
                              </span>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3>Notas de crédito</h3>

                      {selectedInvoice.creditNotes.length === 0 ? (
                        <div className="operations-empty">
                          Esta factura no tiene notas de crédito.
                        </div>
                      ) : (
                        <div className="maintenance-list">
                          {selectedInvoice.creditNotes.map((note) => (
                            <article key={note.id}>
                              <strong>
                                {note.creditNoteNo}
                                {" · "}
                                {formatMoney(note.amount)}
                              </strong>

                              <span>
                                {note.status === "CANCELLED"
                                  ? "Cancelada"
                                  : "Emitida"}
                                {" · "}
                                {note.reason}
                                {" · "}
                                {formatDate(note.issuedAt)}
                              </span>

                              {canManageCredit && note.status === "ISSUED" ? (
                                <button
                                  type="button"
                                  className="erp-button-danger"
                                  onClick={() => {
                                    const confirmed = window.confirm(
                                      `¿Cancelar la nota de crédito ${note.creditNoteNo}?`,
                                    );

                                    if (!confirmed) return;

                                    void cancelInvoiceCreditNote(note.id);
                                  }}
                                >
                                  Cancelar nota de crédito
                                </button>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="maintenance-form-actions">
                      {canManageCredit && selectedInvoice.balance > 0 ? (
                        <button
                          type="button"
                          className="erp-button-primary"
                          onClick={openPaymentForm}
                        >
                          Registrar abono
                        </button>
                      ) : null}

                      {canManageCredit && selectedInvoice.balance > 0 ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={openCreditNoteForm}
                        >
                          Emitir nota de crédito
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setSelectedInvoice(null)}
                      >
                        Cerrar detalle de factura
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        disabled={loadingInvoices}
                        onClick={() => {
                          void loadCustomerInvoices(selected.id);
                        }}
                      >
                        Actualizar estado
                      </button>
                    </div>
                  </div>
                ) : null}

                {creditNoteFormOpen && selectedInvoice ? (
                  <div className="maintenance-modal-backdrop">
                    <section
                      className="maintenance-modal customer-credit-note-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Emitir nota de crédito"
                    >
                      <div className="maintenance-modal__header">
                        <div>
                          <h3>Emitir nota de crédito</h3>
                          <p>
                            Factura {selectedInvoice.invoiceNumber}
                            {" · "}
                            Saldo {formatMoney(selectedInvoice.balance)}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="maintenance-modal__close"
                          onClick={closeCreditNoteForm}
                          disabled={creditNoteSaving}
                          aria-label="Cerrar"
                        >
                          ×
                        </button>
                      </div>

                      <div className="maintenance-form-grid">
                        <label>
                          Monto
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={selectedInvoice.balance}
                            value={creditNoteAmount}
                            onChange={(event) =>
                              setCreditNoteAmount(event.target.value)
                            }
                            disabled={creditNoteSaving}
                          />
                        </label>

                        <label>
                          Motivo
                          <input
                            type="text"
                            value={creditNoteReason}
                            onChange={(event) =>
                              setCreditNoteReason(event.target.value)
                            }
                            placeholder="Ej. ajuste comercial"
                            disabled={creditNoteSaving}
                          />
                        </label>
                      </div>

                      <div className="maintenance-modal__footer">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={closeCreditNoteForm}
                          disabled={creditNoteSaving}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="erp-button-primary"
                          onClick={() => {
                            void saveCreditNote();
                          }}
                          disabled={creditNoteSaving}
                        >
                          {creditNoteSaving
                            ? "Emitiendo..."
                            : "Emitir nota de crédito"}
                        </button>
                      </div>
                    </section>
                  </div>
                ) : null}

                {paymentFormOpen && selectedInvoice ? (
                  <div className="maintenance-modal-backdrop">
                    <section
                      className="maintenance-modal customer-payment-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Registrar abono"
                    >
                      <div className="maintenance-modal__header">
                        <div>
                          <h3>Registrar abono</h3>
                          <p>
                            Factura {selectedInvoice.invoiceNumber}
                            {" · "}
                            Saldo {formatMoney(selectedInvoice.balance)}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="maintenance-modal__close"
                          onClick={closePaymentForm}
                          disabled={paymentSaving}
                          aria-label="Cerrar"
                        >
                          ×
                        </button>
                      </div>

                      <div className="maintenance-form-grid">
                        <label>
                          Monto
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={selectedInvoice.balance}
                            value={paymentAmount}
                            onChange={(event) =>
                              setPaymentAmount(event.target.value)
                            }
                            disabled={paymentSaving}
                          />
                        </label>

                        <label>
                          Método de pago
                          <select
                            value={paymentMethodId}
                            onChange={(event) =>
                              setPaymentMethodId(event.target.value)
                            }
                            disabled={paymentSaving}
                          >
                            <option value="">Seleccionar...</option>

                            {paymentMethods.map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Caja abierta
                          <select
                            value={cashRegisterId}
                            onChange={(event) =>
                              setCashRegisterId(event.target.value)
                            }
                            disabled={paymentSaving}
                          >
                            <option value="">Seleccionar...</option>

                            {cashRegisters.map((register) => (
                              <option key={register.id} value={register.id}>
                                {register.name}
                                {register.pointOfSaleName
                                  ? ` · ${register.pointOfSaleName}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Referencia
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(event) =>
                              setPaymentReference(event.target.value)
                            }
                            placeholder="Opcional"
                            disabled={paymentSaving}
                          />
                        </label>
                      </div>

                      {cashRegisters.length === 0 ? (
                        <div className="operations-empty">
                          No hay cajas abiertas disponibles para registrar el
                          cobro.
                        </div>
                      ) : null}

                      <div className="maintenance-modal__footer">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={closePaymentForm}
                          disabled={paymentSaving}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="erp-button-primary"
                          onClick={() => {
                            void saveInvoicePayment();
                          }}
                          disabled={paymentSaving || cashRegisters.length === 0}
                        >
                          {paymentSaving ? "Registrando..." : "Registrar abono"}
                        </button>
                      </div>
                    </section>
                  </div>
                ) : null}
              </section>

              {carWashEnabled ? (
                <section className="maintenance-section">
                  <div>
                    <h3>Vehículos</h3>
                    <p>Vehículos asociados a este cliente.</p>
                  </div>

                  {vehicles.length === 0 ? (
                    <div className="operations-empty">
                      Este cliente no tiene vehículos registrados.
                    </div>
                  ) : (
                    <div className="maintenance-list">
                      {vehicles.map((vehicle) => (
                        <article key={vehicle.id}>
                          <strong>{vehicle.description}</strong>

                          <span>
                            {vehicle.vehicleTypeName}
                            {" · "}
                            {vehicle.plate ?? "Sin placa"}
                            {" · "}
                            {vehicle.color ?? "Sin color"}
                          </span>
                        </article>
                      ))}
                    </div>
                  )}

                  {canManage ? (
                    <form
                      className="maintenance-form-grid maintenance-form-grid--vehicle"
                      onSubmit={(event) => {
                        void addVehicle(event);
                      }}
                    >
                      <label>
                        Tipo de vehículo
                        <select
                          value={vehicleTypeId}
                          onChange={(event) =>
                            setVehicleTypeId(event.target.value)
                          }
                          required
                        >
                          {vehicleTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Descripción
                        <input
                          required
                          value={vehicleDescription}
                          onChange={(event) =>
                            setVehicleDescription(event.target.value)
                          }
                          placeholder="Ej. Toyota Corolla 2022"
                        />
                      </label>

                      <label>
                        Placa
                        <input
                          value={vehiclePlate}
                          onChange={(event) =>
                            setVehiclePlate(event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Color
                        <input
                          value={vehicleColor}
                          onChange={(event) =>
                            setVehicleColor(event.target.value)
                          }
                        />
                      </label>

                      <div className="maintenance-form-actions">
                        <button
                          className="erp-button-primary"
                          type="submit"
                          disabled={saving || !vehicleTypeId}
                        >
                          Agregar vehículo
                        </button>
                      </div>
                    </form>
                  ) : null}
                </section>
              ) : null}
            </div>

            <footer className="maintenance-modal__footer">
              <button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={closeDetailModal}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
