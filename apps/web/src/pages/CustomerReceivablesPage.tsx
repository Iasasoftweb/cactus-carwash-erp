import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { Banknote, Download, Printer, RefreshCcw } from "lucide-react";
import { ERP_PERMISSIONS } from "@cactus/shared";
import type {
  CreateCustomerCollectionActivityRequest,
  CustomerCollectionActivityResponse,
  CustomerCollectionContactType,
  CustomerCollectionResult,
  CustomerReceivableAgingBucket,
  CustomerReceivableAgingResponse,
  CustomerCollectionFollowUpsResponse,
} from "@cactus/shared";

import { api } from "../lib/api";
import { hasPermission } from "../lib/authStorage";

type AgingFilter = "ALL" | CustomerReceivableAgingBucket;

function money(value: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: string | null): string {
  if (!value) {
    return "Sin vencimiento";
  }

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function bucketLabel(bucket: CustomerReceivableAgingBucket): string {
  switch (bucket) {
    case "CURRENT":
      return "Corriente";

    case "1_30":
      return "1–30 días";

    case "31_60":
      return "31–60 días";

    case "61_90":
      return "61–90 días";

    case "90_PLUS":
      return "90+ días";

    default:
      return bucket;
  }
}

function csvCell(value: string | number | null): string {
  const normalized = value === null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function csvDate(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function contactTypeLabel(value: CustomerCollectionContactType): string {
  const labels: Record<CustomerCollectionContactType, string> = {
    PHONE: "Teléfono",
    WHATSAPP: "WhatsApp",
    EMAIL: "Email",
    SMS: "SMS",
    IN_PERSON: "Presencial",
    OTHER: "Otro",
  };

  return labels[value];
}

function collectionResultLabel(value: CustomerCollectionResult): string {
  const labels: Record<CustomerCollectionResult, string> = {
    CONTACTED: "Contactado",
    NO_ANSWER: "Sin respuesta",
    PROMISE_TO_PAY: "Promesa de pago",
    PAYMENT_REPORTED: "Pago reportado",
    DISPUTED: "Reclamación / disputa",
    FOLLOW_UP_REQUIRED: "Requiere seguimiento",
    OTHER: "Otro",
  };

  return labels[value];
}

export function CustomerReceivablesPage() {
  const navigate = useNavigate();

  function openCustomer(customerId: string): void {
    navigate(`/customers?customerId=${encodeURIComponent(customerId)}`);
  }

  function openInvoice(customerId: string, invoiceId: string): void {
    navigate(
      `/customers?customerId=${encodeURIComponent(
        customerId,
      )}&invoiceId=${encodeURIComponent(invoiceId)}`,
    );
  }

  const [followUps, setFollowUps] =
    useState<CustomerCollectionFollowUpsResponse | null>(null);

  const [followUpsLoading, setFollowUpsLoading] = useState(true);

  const [aging, setAging] = useState<CustomerReceivableAgingResponse | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [filter, setFilter] = useState<AgingFilter>("ALL");

  const [search, setSearch] = useState("");

  const canManageCollections = hasPermission(
    ERP_PERMISSIONS.customerCreditManage,
  );

  const [collectionCustomer, setCollectionCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [collectionActivities, setCollectionActivities] = useState<
    CustomerCollectionActivityResponse[]
  >([]);

  const [collectionLoading, setCollectionLoading] = useState(false);

  const [collectionSaving, setCollectionSaving] = useState(false);

  const [collectionError, setCollectionError] = useState("");

  const [collectionContactType, setCollectionContactType] =
    useState<CustomerCollectionContactType>("PHONE");

  const [collectionResult, setCollectionResult] =
    useState<CustomerCollectionResult>("CONTACTED");

  const [collectionNotes, setCollectionNotes] = useState("");

  const [collectionNextFollowUpAt, setCollectionNextFollowUpAt] = useState("");

  const [collectionPromisedPaymentDate, setCollectionPromisedPaymentDate] =
    useState("");

  const [collectionPromisedAmount, setCollectionPromisedAmount] = useState("");

  const [resolveTarget, setResolveTarget] = useState<{
    activityId: string;
    customerId: string;
    customerName: string;
  } | null>(null);

  const [resolveResolution, setResolveResolution] = useState("");
  const [resolveSaving, setResolveSaving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  function resetCollectionForm(): void {
    setCollectionContactType("PHONE");
    setCollectionResult("CONTACTED");
    setCollectionNotes("");
    setCollectionNextFollowUpAt("");
    setCollectionPromisedPaymentDate("");
    setCollectionPromisedAmount("");
  }

  async function loadCollectionActivities(customerId: string): Promise<void> {
    setCollectionLoading(true);
    setCollectionError("");

    try {
      const rows = await api.customerCollectionActivities(customerId);

      setCollectionActivities(rows);
    } catch (reason) {
      setCollectionActivities([]);

      setCollectionError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el historial de cobranza.",
      );
    } finally {
      setCollectionLoading(false);
    }
  }

  function openCollection(customerId: string, customerName: string): void {
    setCollectionCustomer({
      id: customerId,
      name: customerName,
    });

    resetCollectionForm();

    void loadCollectionActivities(customerId);
  }

  function closeCollection(): void {
    if (collectionSaving) {
      return;
    }

    setCollectionCustomer(null);
    setCollectionActivities([]);
    setCollectionError("");

    resetCollectionForm();
  }

  async function saveCollectionActivity(): Promise<void> {
    if (!collectionCustomer || !canManageCollections || collectionSaving) {
      return;
    }

    const notes = collectionNotes.trim();

    if (!notes) {
      setCollectionError("Debes registrar el detalle de la gestión.");
      return;
    }

    if (
      collectionResult === "PROMISE_TO_PAY" &&
      !collectionPromisedPaymentDate
    ) {
      setCollectionError("Una promesa de pago requiere fecha prometida.");
      return;
    }

    const amountText = collectionPromisedAmount.trim();

    const amount = amountText ? Number(amountText) : undefined;

    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      setCollectionError("El monto prometido debe ser mayor que cero.");
      return;
    }

    const payload: CreateCustomerCollectionActivityRequest = {
      contactType: collectionContactType,

      result: collectionResult,

      notes,

      ...(collectionNextFollowUpAt
        ? {
            nextFollowUpAt: new Date(
              `${collectionNextFollowUpAt}T12:00:00`,
            ).toISOString(),
          }
        : {}),

      ...(collectionPromisedPaymentDate
        ? {
            promisedPaymentDate: new Date(
              `${collectionPromisedPaymentDate}T12:00:00`,
            ).toISOString(),
          }
        : {}),

      ...(amount !== undefined
        ? {
            promisedAmount: amount,
          }
        : {}),
    };

    setCollectionSaving(true);
    setCollectionError("");

    try {
      await api.createCustomerCollectionActivity(
        collectionCustomer.id,
        payload,
      );

      resetCollectionForm();

      await Promise.all([
        loadCollectionActivities(collectionCustomer.id),
        loadFollowUps(),
      ]);
    } catch (reason) {
      setCollectionError(
        reason instanceof Error
          ? reason.message
          : "No fue posible registrar la gestión de cobranza.",
      );
    } finally {
      setCollectionSaving(false);
    }
  }

  function openResolveFollowUp(
    activityId: string,
    customerId: string,
    customerName: string,
  ): void {
    setResolveTarget({
      activityId,
      customerId,
      customerName,
    });
    setResolveResolution("");
    setResolveError("");
  }

  function closeResolveFollowUp(): void {
    if (resolveSaving) {
      return;
    }

    setResolveTarget(null);
    setResolveResolution("");
    setResolveError("");
  }

  async function resolveFollowUp(): Promise<void> {
    if (
      !resolveTarget ||
      !canManageCollections ||
      resolveSaving
    ) {
      return;
    }

    const resolution = resolveResolution.trim();

    if (!resolution) {
      setResolveError(
        "Debes indicar la resolución del seguimiento.",
      );
      return;
    }

    setResolveSaving(true);
    setResolveError("");

    try {
      await api.resolveCustomerCollectionFollowUp(
        resolveTarget.customerId,
        resolveTarget.activityId,
        {
          resolution,
        },
      );

      const customerId =
        resolveTarget.customerId;

      setResolveTarget(null);
      setResolveResolution("");

      await Promise.all([
        loadFollowUps(),
        collectionCustomer?.id === customerId
          ? loadCollectionActivities(customerId)
          : Promise.resolve(),
      ]);
    } catch (reason) {
      setResolveError(
        reason instanceof Error
          ? reason.message
          : "No fue posible marcar el seguimiento como atendido.",
      );
    } finally {
      setResolveSaving(false);
    }
  }

  async function loadAging(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const response = await api.customerReceivablesAging();

      setAging(response);
    } catch (reason) {
      setAging(null);

      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar las cuentas por cobrar.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFollowUps(): Promise<void> {
    setFollowUpsLoading(true);

    try {
      const response = await api.customerCollectionFollowUps();

      setFollowUps(response);
    } catch {
      setFollowUps(null);
    } finally {
      setFollowUpsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadAging(), loadFollowUps()]);
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!aging) {
      return [];
    }

    const normalizedSearch = search.trim().toLowerCase();

    return aging.invoices.filter((invoice) => {
      if (filter !== "ALL" && invoice.bucket !== filter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        invoice.customerName.toLowerCase().includes(normalizedSearch) ||
        invoice.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
        invoice.orderNumber.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [aging, filter, search]);

  const printSummary = useMemo(() => {
    const summary = {
      totalReceivable: 0,
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
      overdueBalance: 0,
      openInvoices: filteredInvoices.length,
      overdueInvoices: 0,
      overdueCustomers: 0,
    };

    const overdueCustomerIds = new Set<string>();

    for (const invoice of filteredInvoices) {
      summary.totalReceivable += invoice.balance;

      switch (invoice.bucket) {
        case "CURRENT":
          summary.current += invoice.balance;
          break;

        case "1_30":
          summary.days1To30 += invoice.balance;
          break;

        case "31_60":
          summary.days31To60 += invoice.balance;
          break;

        case "61_90":
          summary.days61To90 += invoice.balance;
          break;

        case "90_PLUS":
          summary.days90Plus += invoice.balance;
          break;
      }

      if (invoice.daysOverdue > 0) {
        summary.overdueBalance += invoice.balance;

        summary.overdueInvoices += 1;

        overdueCustomerIds.add(invoice.customerId);
      }
    }

    summary.overdueCustomers = overdueCustomerIds.size;

    return summary;
  }, [filteredInvoices]);

  const printCustomers = useMemo(() => {
    const rows = new Map<
      string,
      {
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
      }
    >();

    for (const invoice of filteredInvoices) {
      const customer = rows.get(invoice.customerId) ?? {
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        totalReceivable: 0,
        current: 0,
        days1To30: 0,
        days31To60: 0,
        days61To90: 0,
        days90Plus: 0,
        overdueBalance: 0,
        openInvoices: 0,
        overdueInvoices: 0,
      };

      customer.totalReceivable += invoice.balance;

      customer.openInvoices += 1;

      switch (invoice.bucket) {
        case "CURRENT":
          customer.current += invoice.balance;
          break;

        case "1_30":
          customer.days1To30 += invoice.balance;
          break;

        case "31_60":
          customer.days31To60 += invoice.balance;
          break;

        case "61_90":
          customer.days61To90 += invoice.balance;
          break;

        case "90_PLUS":
          customer.days90Plus += invoice.balance;
          break;
      }

      if (invoice.daysOverdue > 0) {
        customer.overdueBalance += invoice.balance;

        customer.overdueInvoices += 1;
      }

      rows.set(invoice.customerId, customer);
    }

    return [...rows.values()].sort(
      (a, b) => b.totalReceivable - a.totalReceivable,
    );
  }, [filteredInvoices]);

  function printReport(): void {
    if (!aging || filteredInvoices.length === 0) {
      return;
    }

    window.print();
  }

  function exportCsv(): void {
    if (!aging || filteredInvoices.length === 0) return;

    const headers = [
      "Cliente",
      "Factura",
      "Orden",
      "Fecha emisión",
      "Fecha vencimiento",
      "Antigüedad",
      "Días vencidos",
      "Total",
      "Saldo",
    ];

    const rows = filteredInvoices.map((invoice) => [
      invoice.customerName,
      invoice.invoiceNumber,
      invoice.orderNumber,
      csvDate(invoice.issuedAt),
      csvDate(invoice.dueDate),
      bucketLabel(invoice.bucket),
      invoice.daysOverdue,
      invoice.total,
      invoice.balance,
    ]);

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `cuentas-por-cobrar-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="module-page maintenance-page cxc-receivables-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Banknote size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Cuentas por cobrar</h1>

            <p>Cartera, vencimientos y antigüedad de saldos de clientes.</p>
          </div>
        </div>

        <div className="maintenance-toolbar__actions">
          <button
            type="button"
            className="secondary-button"
            disabled={loading || filteredInvoices.length === 0}
            onClick={printReport}
          >
            <Printer size={15} />
            Imprimir reporte
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={loading || filteredInvoices.length === 0}
            onClick={exportCsv}
          >
            <Download size={15} />
            Exportar CSV
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={loading || followUpsLoading}
            onClick={() => {
              void Promise.all([loadAging(), loadFollowUps()]);
            }}
          >
            <RefreshCcw size={15} />
            Actualizar
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/customers")}
          >
            Clientes
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            Volver al panel
          </button>
        </div>
      </header>

      {error ? (
        <p className="maintenance-alert maintenance-alert--error">{error}</p>
      ) : null}

      {loading ? (
        <div className="operations-empty">Cargando cuentas por cobrar...</div>
      ) : !aging ? (
        <div className="operations-empty">
          No hay información de cartera disponible.
        </div>
      ) : (
        <>
          <section className="settings-card maintenance-card">
            <div className="maintenance-toolbar">
              <div className="maintenance-toolbar__heading">
                <div>
                  <p className="eyebrow">RESUMEN</p>

                  <h2>Cartera de clientes</h2>
                </div>

                <span className="maintenance-count">
                  {aging.summary.openInvoices}{" "}
                  {aging.summary.openInvoices === 1
                    ? "factura abierta"
                    : "facturas abiertas"}
                </span>
              </div>
            </div>

            <div className="maintenance-summary-grid">
              <article>
                <span>Cartera total</span>
                <strong>{money(aging.summary.totalReceivable)}</strong>
              </article>

              <article>
                <span>Corriente</span>
                <strong>{money(aging.summary.current)}</strong>
              </article>

              <article>
                <span>Saldo vencido</span>
                <strong>{money(aging.summary.overdueBalance)}</strong>
              </article>

              <article>
                <span>Clientes vencidos</span>
                <strong>{aging.summary.overdueCustomers}</strong>
              </article>
            </div>

            <div className="maintenance-summary-grid">
              <article>
                <span>1–30 días</span>
                <strong>{money(aging.summary.days1To30)}</strong>
              </article>

              <article>
                <span>31–60 días</span>
                <strong>{money(aging.summary.days31To60)}</strong>
              </article>

              <article>
                <span>61–90 días</span>
                <strong>{money(aging.summary.days61To90)}</strong>
              </article>

              <article>
                <span>90+ días</span>
                <strong>{money(aging.summary.days90Plus)}</strong>
              </article>
            </div>
          </section>

          <section className="settings-card maintenance-card">
            <div className="maintenance-toolbar">
              <div className="maintenance-toolbar__heading">
                <div>
                  <p className="eyebrow">SEGUIMIENTOS</p>
                  <h2>Cobranza pendiente</h2>
                </div>
                <span className="maintenance-count">
                  {followUps?.summary.total ?? 0}{" "}
                  {(followUps?.summary.total ?? 0) === 1
                    ? "seguimiento"
                    : "seguimientos"}
                </span>
              </div>
            </div>

            {followUpsLoading ? (
              <div className="operations-empty">Cargando seguimientos...</div>
            ) : !followUps || followUps.items.length === 0 ? (
              <div className="operations-empty">
                No existen seguimientos pendientes.
              </div>
            ) : (
              <>
                <div className="maintenance-summary-grid">
                  <article>
                    <span>Vencidos</span>
                    <strong>{followUps.summary.overdue}</strong>
                  </article>
                  <article>
                    <span>Para hoy</span>
                    <strong>{followUps.summary.today}</strong>
                  </article>
                  <article>
                    <span>Próximos</span>
                    <strong>{followUps.summary.upcoming}</strong>
                  </article>
                  <article>
                    <span>Total</span>
                    <strong>{followUps.summary.total}</strong>
                  </article>
                </div>

                <div className="maintenance-table-wrap">
                  <table className="maintenance-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Seguimiento</th>
                        <th>Estado</th>
                        <th>Resultado</th>
                        <th>Promesa</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {followUps.items.map((item) => (
                        <tr key={item.activityId}>
                          <td>
                            <strong>{item.customerName}</strong>
                          </td>
                          <td>{dateTime(item.nextFollowUpAt)}</td>
                          <td>
                            <span
                              className={
                                item.status === "OVERDUE"
                                  ? "maintenance-badge maintenance-badge--danger"
                                  : item.status === "TODAY"
                                    ? "maintenance-badge maintenance-badge--warning"
                                    : "maintenance-badge maintenance-badge--success"
                              }
                            >
                              {item.status === "OVERDUE"
                                ? "Vencido"
                                : item.status === "TODAY"
                                  ? "Hoy"
                                  : "Próximo"}
                            </span>
                          </td>
                          <td>{collectionResultLabel(item.result)}</td>
                          <td>
                            {item.promisedPaymentDate ? (
                              <>
                                {dateTime(item.promisedPaymentDate)}
                                {item.promisedAmount !== null
                                  ? ` · ${money(item.promisedAmount)}`
                                  : ""}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <div className="cxc-customer-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() =>
                                  openCollection(
                                    item.customerId,
                                    item.customerName,
                                  )
                                }
                              >
                                Cobranza
                              </button>

                              {canManageCollections ? (
                                <button
                                  type="button"
                                  className="erp-button-primary"
                                  onClick={() =>
                                    openResolveFollowUp(
                                      item.activityId,
                                      item.customerId,
                                      item.customerName,
                                    )
                                  }
                                >
                                  Marcar atendido
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="settings-card maintenance-card">
            <div className="maintenance-toolbar">
              <div className="maintenance-toolbar__heading">
                <div>
                  <p className="eyebrow">CLIENTES</p>

                  <h2>Cartera por cliente</h2>
                </div>

                <span className="maintenance-count">
                  {aging.customers.length}{" "}
                  {aging.customers.length === 1 ? "cliente" : "clientes"}
                </span>
              </div>
            </div>

            {aging.customers.length === 0 ? (
              <div className="operations-empty">
                No existen clientes con saldo pendiente.
              </div>
            ) : (
              <div className="maintenance-table-wrap">
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Cartera</th>
                      <th>Corriente</th>
                      <th>1–30</th>
                      <th>31–60</th>
                      <th>61–90</th>
                      <th>90+</th>
                      <th>Vencido</th>
                      <th>Facturas</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {aging.customers.map((customer) => (
                      <tr key={customer.customerId}>
                        <td>
                          <strong>{customer.customerName}</strong>

                          <small>
                            {customer.overdueInvoices > 0
                              ? `${customer.overdueInvoices} vencida(s)`
                              : "Sin vencimientos"}
                          </small>
                        </td>

                        <td>
                          <strong>{money(customer.totalReceivable)}</strong>
                        </td>

                        <td>{money(customer.current)}</td>

                        <td>{money(customer.days1To30)}</td>

                        <td>{money(customer.days31To60)}</td>

                        <td>{money(customer.days61To90)}</td>

                        <td>{money(customer.days90Plus)}</td>

                        <td>
                          <strong>{money(customer.overdueBalance)}</strong>
                        </td>

                        <td>{customer.openInvoices}</td>

                        <td>
                          <div className="cxc-customer-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                openCollection(
                                  customer.customerId,
                                  customer.customerName,
                                )
                              }
                            >
                              Cobranza
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openCustomer(customer.customerId)}
                            >
                              Ver cliente
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="settings-card maintenance-card">
            <div className="maintenance-toolbar">
              <div className="maintenance-toolbar__heading">
                <div>
                  <p className="eyebrow">DETALLE</p>

                  <h2>Facturas abiertas</h2>
                </div>

                <span className="maintenance-count">
                  {filteredInvoices.length}{" "}
                  {filteredInvoices.length === 1 ? "factura" : "facturas"}
                </span>
              </div>

              <div className="maintenance-toolbar__actions">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cliente, factura u orden..."
                  aria-label="Buscar cartera"
                />

                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as AgingFilter)
                  }
                  aria-label="Filtrar antigüedad"
                >
                  <option value="ALL">Todas</option>

                  <option value="CURRENT">Corrientes</option>

                  <option value="1_30">1–30 días</option>

                  <option value="31_60">31–60 días</option>

                  <option value="61_90">61–90 días</option>

                  <option value="90_PLUS">90+ días</option>
                </select>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="operations-empty">
                No hay facturas para el filtro seleccionado.
              </div>
            ) : (
              <div className="maintenance-table-wrap">
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Factura</th>
                      <th>Orden</th>
                      <th>Emisión</th>
                      <th>Vencimiento</th>
                      <th>Antigüedad</th>
                      <th>Total</th>
                      <th>Saldo</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.invoiceId}>
                        <td>
                          <strong>{invoice.customerName}</strong>
                        </td>

                        <td>{invoice.invoiceNumber}</td>

                        <td>{invoice.orderNumber}</td>

                        <td>{date(invoice.issuedAt)}</td>

                        <td>{date(invoice.dueDate)}</td>

                        <td>
                          <span
                            className={
                              invoice.bucket === "CURRENT"
                                ? "maintenance-badge maintenance-badge--success"
                                : "maintenance-badge maintenance-badge--danger"
                            }
                          >
                            {bucketLabel(invoice.bucket)}
                          </span>

                          {invoice.daysOverdue > 0 ? (
                            <small>{invoice.daysOverdue} días vencida</small>
                          ) : null}
                        </td>

                        <td>{money(invoice.total)}</td>

                        <td>
                          <strong>{money(invoice.balance)}</strong>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              openInvoice(invoice.customerId, invoice.invoiceId)
                            }
                          >
                            Ver factura
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="maintenance-form-actions">
              <small>
                Corte:{" "}
                {new Intl.DateTimeFormat("es-DO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(aging.asOf))}
              </small>
            </div>
          </section>
        </>
      )}
      {resolveTarget ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeResolveFollowUp();
            }
          }}
        >
          <section
            className="maintenance-modal cxc-followup-resolve-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cxc-followup-resolve-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">SEGUIMIENTO</p>

                <h2 id="cxc-followup-resolve-title">
                  Marcar atendido
                </h2>

                <p>{resolveTarget.customerName}</p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={resolveSaving}
                onClick={closeResolveFollowUp}
              >
                ×
              </button>
            </header>

            <div className="maintenance-modal__body">
              {resolveError ? (
                <p className="maintenance-alert maintenance-alert--error">
                  {resolveError}
                </p>
              ) : null}

              <label className="cxc-collection-form__notes">
                <span>Resolución del seguimiento</span>

                <textarea
                  value={resolveResolution}
                  disabled={resolveSaving}
                  maxLength={500}
                  rows={4}
                  placeholder="Indica cómo fue atendido el seguimiento..."
                  onChange={(event) =>
                    setResolveResolution(
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>

            <footer className="maintenance-modal__footer">
              <button
                type="button"
                className="secondary-button"
                disabled={resolveSaving}
                onClick={closeResolveFollowUp}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="erp-button-primary"
                disabled={
                  resolveSaving ||
                  !resolveResolution.trim()
                }
                onClick={() => {
                  void resolveFollowUp();
                }}
              >
                {resolveSaving
                  ? "Guardando..."
                  : "Marcar atendido"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {collectionCustomer ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCollection();
            }
          }}
        >
          <section
            className="maintenance-modal cxc-collection-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cxc-collection-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">COBRANZA</p>

                <h2 id="cxc-collection-title">{collectionCustomer.name}</h2>

                <p>Historial, seguimiento y promesas de pago.</p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={collectionSaving}
                onClick={closeCollection}
              >
                ×
              </button>
            </header>

            <div className="maintenance-modal__body cxc-collection-modal__body">
              {collectionError ? (
                <p className="maintenance-alert maintenance-alert--error">
                  {collectionError}
                </p>
              ) : null}

              {canManageCollections ? (
                <section className="cxc-collection-form">
                  <div className="maintenance-toolbar__heading">
                    <div>
                      <p className="eyebrow">NUEVA GESTIÓN</p>

                      <h3>Registrar seguimiento</h3>
                    </div>
                  </div>

                  <div className="cxc-collection-form__grid">
                    <label>
                      <span>Canal</span>

                      <select
                        value={collectionContactType}
                        disabled={collectionSaving}
                        onChange={(event) =>
                          setCollectionContactType(
                            event.target.value as CustomerCollectionContactType,
                          )
                        }
                      >
                        <option value="PHONE">Teléfono</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="IN_PERSON">Presencial</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </label>

                    <label>
                      <span>Resultado</span>

                      <select
                        value={collectionResult}
                        disabled={collectionSaving}
                        onChange={(event) => {
                          const value = event.target
                            .value as CustomerCollectionResult;

                          setCollectionResult(value);

                          if (value !== "PROMISE_TO_PAY") {
                            setCollectionPromisedPaymentDate("");
                            setCollectionPromisedAmount("");
                          }
                        }}
                      >
                        <option value="CONTACTED">Contactado</option>

                        <option value="NO_ANSWER">Sin respuesta</option>

                        <option value="PROMISE_TO_PAY">Promesa de pago</option>

                        <option value="PAYMENT_REPORTED">Pago reportado</option>

                        <option value="DISPUTED">Reclamación / disputa</option>

                        <option value="FOLLOW_UP_REQUIRED">
                          Requiere seguimiento
                        </option>

                        <option value="OTHER">Otro</option>
                      </select>
                    </label>

                    <label>
                      <span>Próximo seguimiento</span>

                      <input
                        type="date"
                        value={collectionNextFollowUpAt}
                        disabled={collectionSaving}
                        onChange={(event) =>
                          setCollectionNextFollowUpAt(event.target.value)
                        }
                      />
                    </label>

                    {collectionResult === "PROMISE_TO_PAY" ? (
                      <>
                        <label>
                          <span>Fecha prometida</span>

                          <input
                            type="date"
                            value={collectionPromisedPaymentDate}
                            disabled={collectionSaving}
                            onChange={(event) =>
                              setCollectionPromisedPaymentDate(
                                event.target.value,
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>Monto prometido</span>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={collectionPromisedAmount}
                            disabled={collectionSaving}
                            placeholder="0.00"
                            onChange={(event) =>
                              setCollectionPromisedAmount(event.target.value)
                            }
                          />
                        </label>
                      </>
                    ) : null}
                  </div>

                  <label className="cxc-collection-form__notes">
                    <span>Detalle de la gestión</span>

                    <textarea
                      value={collectionNotes}
                      disabled={collectionSaving}
                      maxLength={4000}
                      rows={4}
                      placeholder="Resultado del contacto, acuerdos, observaciones..."
                      onChange={(event) =>
                        setCollectionNotes(event.target.value)
                      }
                    />
                  </label>

                  <div className="maintenance-form-actions">
                    <button
                      type="button"
                      className="erp-button-primary"
                      disabled={collectionSaving || !collectionNotes.trim()}
                      onClick={() => {
                        void saveCollectionActivity();
                      }}
                    >
                      {collectionSaving ? "Guardando..." : "Registrar gestión"}
                    </button>
                  </div>
                </section>
              ) : (
                <p className="cxc-collection-readonly">
                  Puedes consultar el historial. Tu rol no permite registrar
                  gestiones de cobranza.
                </p>
              )}

              <section className="cxc-collection-history">
                <div className="maintenance-toolbar__heading">
                  <div>
                    <p className="eyebrow">HISTORIAL</p>

                    <h3>Gestiones registradas</h3>
                  </div>

                  <span className="maintenance-count">
                    {collectionActivities.length}
                  </span>
                </div>

                {collectionLoading ? (
                  <div className="operations-empty">Cargando historial...</div>
                ) : collectionActivities.length === 0 ? (
                  <div className="operations-empty">
                    No existen gestiones de cobranza registradas.
                  </div>
                ) : (
                  <div className="cxc-collection-timeline">
                    {collectionActivities.map((activity) => (
                      <article
                        key={activity.id}
                        className="cxc-collection-activity"
                      >
                        <div className="cxc-collection-activity__header">
                          <div>
                            <strong>
                              {collectionResultLabel(activity.result)}
                            </strong>

                            <span>
                              {contactTypeLabel(activity.contactType)}
                            </span>
                          </div>

                          <time>{dateTime(activity.createdAt)}</time>
                        </div>

                        <p>{activity.notes}</p>

                        <dl>
                          <div>
                            <dt>Registrado por</dt>
                            <dd>{activity.createdByName ?? "Usuario"}</dd>
                          </div>

                          <div>
                            <dt>Próximo seguimiento</dt>
                            <dd>{dateTime(activity.nextFollowUpAt)}</dd>
                          </div>

                          {activity.promisedPaymentDate ? (
                            <div>
                              <dt>Promesa de pago</dt>

                              <dd>
                                {dateTime(activity.promisedPaymentDate)}

                                {activity.promisedAmount !== null
                                  ? ` · ${money(activity.promisedAmount)}`
                                  : ""}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="maintenance-modal__footer">
              <button
                type="button"
                className="secondary-button"
                disabled={collectionSaving}
                onClick={closeCollection}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {aging ? (
        <section className="cxc-print-only">
          <header className="cxc-print-header">
            <div>
              <h1>Cuentas por cobrar</h1>
              <p>Reporte de antigüedad de saldos</p>
            </div>

            <div className="cxc-print-meta">
              <strong>
                Corte:{" "}
                {new Intl.DateTimeFormat("es-DO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(aging.asOf))}
              </strong>

              <span>
                Filtro: {filter === "ALL" ? "Todas" : bucketLabel(filter)}
              </span>

              <span>Búsqueda: {search.trim() || "Sin filtro"}</span>
            </div>
          </header>

          <section className="cxc-print-summary">
            <article>
              <span>Cartera</span>
              <strong>{money(printSummary.totalReceivable)}</strong>
            </article>

            <article>
              <span>Corriente</span>
              <strong>{money(printSummary.current)}</strong>
            </article>

            <article>
              <span>Vencido</span>
              <strong>{money(printSummary.overdueBalance)}</strong>
            </article>

            <article>
              <span>Facturas</span>
              <strong>{printSummary.openInvoices}</strong>
            </article>

            <article>
              <span>1–30</span>
              <strong>{money(printSummary.days1To30)}</strong>
            </article>

            <article>
              <span>31–60</span>
              <strong>{money(printSummary.days31To60)}</strong>
            </article>

            <article>
              <span>61–90</span>
              <strong>{money(printSummary.days61To90)}</strong>
            </article>

            <article>
              <span>90+</span>
              <strong>{money(printSummary.days90Plus)}</strong>
            </article>
          </section>

          <h2>Cartera por cliente</h2>

          <table className="cxc-print-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Cartera</th>
                <th>Corriente</th>
                <th>1–30</th>
                <th>31–60</th>
                <th>61–90</th>
                <th>90+</th>
                <th>Vencido</th>
              </tr>
            </thead>

            <tbody>
              {printCustomers.map((customer) => (
                <tr key={customer.customerId}>
                  <td>{customer.customerName}</td>
                  <td>{money(customer.totalReceivable)}</td>
                  <td>{money(customer.current)}</td>
                  <td>{money(customer.days1To30)}</td>
                  <td>{money(customer.days31To60)}</td>
                  <td>{money(customer.days61To90)}</td>
                  <td>{money(customer.days90Plus)}</td>
                  <td>{money(customer.overdueBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Facturas abiertas</h2>

          <table className="cxc-print-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Factura</th>
                <th>Vence</th>
                <th>Antigüedad</th>
                <th>Días</th>
                <th>Total</th>
                <th>Saldo</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.invoiceId}>
                  <td>{invoice.customerName}</td>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{date(invoice.dueDate)}</td>
                  <td>{bucketLabel(invoice.bucket)}</td>
                  <td>{invoice.daysOverdue}</td>
                  <td>{money(invoice.total)}</td>
                  <td>{money(invoice.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <footer className="cxc-print-footer">
            Generado desde Cuentas por cobrar.
          </footer>
        </section>
      ) : null}
    </main>
  );
}
