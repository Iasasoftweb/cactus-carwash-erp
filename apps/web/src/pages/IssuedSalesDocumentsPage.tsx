import {
  Ban,
  CalendarRange,
  Eye,
  House,
  Printer,
  ReceiptText,
  RefreshCw,
  Store,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ERP_PERMISSIONS,
  type PointOfSaleResponse,
  type PosIssuedSalesDocumentDetailResponse,
  type PosIssuedSalesDocumentSummaryResponse,
  type PosIssuedSalesDocumentSource,
} from "@cactus/shared";

import { api } from "../lib/api";
import { hasPermission } from "../lib/authStorage";
import {
  printIssuedSalesDocumentTicket,
  resolveIssuedSalesDocumentBusiness,
} from "../lib/issuedSalesDocumentTicket";

function localDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(value: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function sourceLabel(source: PosIssuedSalesDocumentSource): string {
  return source === "POS_DIRECT" ? "Venta directa" : "Cuenta POS";
}

export function IssuedSalesDocumentsPage() {
  const navigate = useNavigate();

  const today = useMemo(() => localDateInputValue(new Date()), []);

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [pointOfSaleId, setPointOfSaleId] = useState("");
  const [query, setQuery] = useState("");

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [documents, setDocuments] = useState<
    PosIssuedSalesDocumentSummaryResponse[]
  >([]);

  const [detail, setDetail] =
    useState<PosIssuedSalesDocumentDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");
  const [error, setError] = useState("");
  const [dashboardContext, setDashboardContext] =
    useState<Awaited<ReturnType<typeof api.dashboardContext>> | null>(null);

  const canVoidSales = hasPermission(ERP_PERMISSIONS.posSaleVoid);

  async function loadDocuments(
    nextDateFrom = dateFrom,
    nextDateTo = dateTo,
    nextPointOfSaleId = pointOfSaleId,
  ): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const result = await api.posIssuedSalesDocuments(
        nextDateFrom,
        nextDateTo,
        nextPointOfSaleId || undefined,
      );

      setDocuments(result.documents);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar las facturas emitidas.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(
    source: PosIssuedSalesDocumentSource,
    id: string,
  ): Promise<void> {
    setDetailLoading(true);
    setError("");

    try {
      const result = await api.posIssuedSalesDocument(source, id);
      setDetail(result);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el detalle de la factura.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function reprintDetail(): void {
    if (!detail) return;

    if (!dashboardContext) {
      setError(
        "No fue posible obtener la identidad comercial para reimprimir.",
      );
      return;
    }

    try {
      const business = resolveIssuedSalesDocumentBusiness(
        dashboardContext,
        detail.branchId,
      );

      printIssuedSalesDocumentTicket(detail, business);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible reimprimir el ticket.",
      );
    }
  }

  function openVoidDialog(): void {
    if (!detail || detail.status !== "ISSUED" || !canVoidSales) {
      return;
    }

    setVoidReason("");
    setVoidError("");
    setVoidDialogOpen(true);
  }

  function closeVoidDialog(): void {
    if (voiding) return;

    setVoidDialogOpen(false);
    setVoidReason("");
    setVoidError("");
  }

  async function confirmVoid(): Promise<void> {
    if (!detail || detail.status !== "ISSUED" || !canVoidSales) {
      return;
    }

    const normalizedReason = voidReason.trim();

    if (normalizedReason.length < 3) {
      setVoidError("El motivo debe contener al menos 3 caracteres.");
      return;
    }

    if (normalizedReason.length > 255) {
      setVoidError("El motivo no puede exceder 255 caracteres.");
      return;
    }

    setVoiding(true);
    setVoidError("");
    setError("");

    try {
      await api.posVoidIssuedSalesDocument(
        detail.source,
        detail.id,
        normalizedReason,
      );

      const refreshedDetail = await api.posIssuedSalesDocument(
        detail.source,
        detail.id,
      );

      setDetail(refreshedDetail);
      setVoidDialogOpen(false);
      setVoidReason("");

      await loadDocuments();
    } catch (reason) {
      setVoidError(
        reason instanceof Error
          ? reason.message
          : "No fue posible anular la factura.",
      );
    } finally {
      setVoiding(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      setLoading(true);
      setError("");

      try {
        const [pointRows, result, context] = await Promise.all([
          api.posPoints(),
          api.posIssuedSalesDocuments(today, today),
          api.dashboardContext(),
        ]);

        if (cancelled) return;

        setPoints(pointRows);
        setDocuments(result.documents);
        setDashboardContext(context);
      } catch (reason) {
        if (cancelled) return;

        setError(
          reason instanceof Error
            ? reason.message
            : "No fue posible cargar las facturas emitidas.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [today]);

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");

    if (!normalized) {
      return documents;
    }

    return documents.filter((document) => {
      const values = [
        document.reference,
        document.pointOfSaleName,
        document.customerAlias ?? "",
        document.paymentMethodName ?? "",
        sourceLabel(document.source),
      ];

      return values.some((value) =>
        value.toLocaleLowerCase("es").includes(normalized),
      );
    });
  }, [documents, query]);

  const total = useMemo(
    () =>
      filteredDocuments.reduce(
        (sum, document) =>
          document.status === "ISSUED"
            ? sum + document.total
            : sum,
        0,
      ),
    [filteredDocuments],
  );

  return (
    <main className="maintenance-page pos-sales-report-page issued-sales-documents-page">
      <header className="maintenance-header pos-sales-report-header">
        <div className="maintenance-header__content">
          <ReceiptText className="maintenance-header__icon" size={28} />

          <div>
            <h1>Facturas emitidas</h1>
            <p>
              Consulta las ventas facturadas en los puntos de venta autorizados.
            </p>
          </div>
        </div>

        <div className="pos-sales-report-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            <House size={16} />
            Inicio
          </button>

          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </header>

      {error ? (
        <div className="maintenance-alert operations-error">{error}</div>
      ) : null}

      <section className="settings-card pos-sales-report-filters issued-sales-documents__filters">
        <div className="pos-sales-report-section-title">
          <CalendarRange size={20} />
          <div>
            <h2>Consulta</h2>
            <p>Filtra por fecha, punto de venta o referencia.</p>
          </div>
        </div>

        <div className="pos-sales-report-filter-grid">
          <label>
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label>
            Hasta
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

          <label>
            Punto de venta
            <select
              value={pointOfSaleId}
              onChange={(event) => setPointOfSaleId(event.target.value)}
            >
              <option value="">Todos</option>

              {points.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Buscar
            <input
              type="search"
              placeholder="Referencia, cliente, método..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={loading}
          >
            Consultar
          </button>
        </div>
      </section>

      <section className="pos-sales-report-kpis issued-sales-documents__kpis">
        <article>
          <div>
            <ReceiptText size={20} />
            <span>Documentos</span>
          </div>
          <strong>{filteredDocuments.length}</strong>
          <small>En el resultado actual</small>
        </article>

        <article className="pos-sales-report-kpi-total">
          <div>
            <Store size={20} />
            <span>Total vigente</span>
          </div>
          <strong>{money(total)}</strong>
          <small>Excluye documentos anulados</small>
        </article>
      </section>

      <section className="settings-card issued-sales-documents__list">
        <div className="pos-sales-report-section-title">
          <ReceiptText size={20} />
          <div>
            <h2>Facturas</h2>
            <p>
              Ventas directas y cuentas POS pagadas, ordenadas desde la más
              reciente.
            </p>
          </div>
        </div>

        <div className="pos-sales-transactions__table-wrap">
          <table className="pos-sales-transactions__table issued-sales-documents__table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Referencia</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Punto de venta</th>
                <th>Cliente</th>
                <th>Método</th>
                <th>Subtotal</th>
                <th>ITBIS</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredDocuments.map((document) => (
                <tr key={`${document.source}:${document.id}`}>
                  <td>{dateTime(document.issuedAt)}</td>
                  <td>
                    <strong className="issued-sales-documents__reference">
                      {document.reference}
                    </strong>
                  </td>
                  <td>
                    <span
                      className={`issued-sales-documents__type ${
                        document.source === "POS_DIRECT"
                          ? "is-direct"
                          : "is-account"
                      }`}
                    >
                      {sourceLabel(document.source)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`issued-sales-documents__status ${
                        document.status === "VOIDED"
                          ? "is-voided"
                          : "is-issued"
                      }`}
                    >
                      {document.status === "VOIDED"
                        ? "ANULADA"
                        : "EMITIDA"}
                    </span>
                  </td>
                  <td>{document.pointOfSaleName}</td>
                  <td>{document.customerAlias || "Consumidor final"}</td>
                  <td>
                    <span className="issued-sales-documents__payment">
                      {document.paymentMethodName || "—"}
                    </span>
                  </td>
                  <td>{money(document.subtotal)}</td>
                  <td>{money(document.taxAmount)}</td>
                  <td>
                    <strong>{money(document.total)}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button issued-sales-documents__view-button"
                      onClick={() =>
                        void openDetail(document.source, document.id)
                      }
                      disabled={detailLoading}
                    >
                      <Eye size={15} />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="operations-empty">
                      No hay facturas emitidas para los filtros indicados.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando facturas...</div>
        ) : null}
      </section>

      {detail ? (
        <div
          role="presentation"
          className="issued-sales-documents__modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetail(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Factura ${detail.reference}`}
            className="issued-sales-documents__modal"
          >
            <header className="issued-sales-documents__modal-header">
              <div className="issued-sales-documents__modal-heading">
                <div className="issued-sales-documents__modal-heading-row">
                  <span
                    className={`issued-sales-documents__type ${
                      detail.source === "POS_DIRECT"
                        ? "is-direct"
                        : "is-account"
                    }`}
                  >
                    {sourceLabel(detail.source)}
                  </span>

                  <span
                    className={`issued-sales-documents__status ${
                      detail.status === "VOIDED"
                        ? "is-voided"
                        : "is-issued"
                    }`}
                  >
                    {detail.status === "VOIDED" ? "ANULADA" : "EMITIDA"}
                  </span>

                  <span className="issued-sales-documents__modal-date">
                    {dateTime(detail.issuedAt)}
                  </span>
                </div>

                <h2>{detail.reference}</h2>

                <p>
                  {detail.pointOfSaleName}
                </p>
              </div>

              <div className="issued-sales-documents__modal-actions">
                <button
                  type="button"
                  onClick={reprintDetail}
                  disabled={!dashboardContext}
                >
                  <Printer size={16} />
                  Reimprimir
                </button>

                {canVoidSales && detail.status === "ISSUED" ? (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={openVoidDialog}
                    disabled={voiding}
                  >
                    <Ban size={16} />
                    Anular factura
                  </button>
                ) : null}

                <button
                  type="button"
                  className="secondary-button issued-sales-documents__modal-close"
                  onClick={() => setDetail(null)}
                  aria-label="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="issued-sales-documents__modal-body">
              {detail.status === "VOIDED" ? (
                <section className="issued-sales-documents__void-info">
                  <div>
                    <Ban size={20} />
                    <div>
                      <strong>Factura anulada</strong>
                      <p>{detail.voidReason || "Sin motivo registrado."}</p>
                    </div>
                  </div>

                  <dl>
                    <div>
                      <dt>Anulada por</dt>
                      <dd>{detail.voidedByUsername || "—"}</dd>
                    </div>
                    <div>
                      <dt>Fecha</dt>
                      <dd>
                        {detail.voidedAt
                          ? dateTime(detail.voidedAt)
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              <section className="issued-sales-documents__modal-summary">
                <div className="issued-sales-documents__modal-customer">
                  <span>Cliente</span>
                  <strong>
                    {detail.customerAlias || "Consumidor final"}
                  </strong>
                </div>

                <div className="issued-sales-documents__modal-metrics">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(detail.subtotal)}</strong>
                  </div>

                  <div>
                    <span>ITBIS</span>
                    <strong>{money(detail.taxAmount)}</strong>
                  </div>

                  <div>
                    <span>Servicio</span>
                    <strong>{money(detail.serviceChargeAmount)}</strong>
                  </div>
                </div>

                <div className="issued-sales-documents__modal-total">
                  <span>Total</span>
                  <strong>{money(detail.total)}</strong>
                </div>
              </section>

              <section className="issued-sales-documents__modal-section">
                <div className="issued-sales-documents__modal-section-heading">
                  <div>
                    <h3>Artículos</h3>
                    <p>
                      {detail.items.length}{" "}
                      {detail.items.length === 1 ? "artículo" : "artículos"}
                    </p>
                  </div>
                </div>

                <div className="issued-sales-documents__modal-table-wrap">
                  <table className="issued-sales-documents__modal-table">
                    <thead>
                      <tr>
                        <th>Artículo</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>ITBIS</th>
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {detail.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.productName}</strong>
                          </td>
                          <td>{item.quantity}</td>
                          <td>{money(item.unitPrice)}</td>
                          <td>{money(item.lineTax)}</td>
                          <td>
                            <strong>{money(item.lineTotal)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="issued-sales-documents__modal-section">
                <div className="issued-sales-documents__modal-section-heading">
                  <div>
                    <h3>Pagos</h3>
                    <p>
                      {detail.payments.length}{" "}
                      {detail.payments.length === 1 ? "pago" : "pagos"}
                    </p>
                  </div>
                </div>

                <div className="issued-sales-documents__modal-table-wrap">
                  <table className="issued-sales-documents__modal-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Método</th>
                        <th>Referencia</th>
                        <th>Monto</th>
                      </tr>
                    </thead>

                    <tbody>
                      {detail.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{dateTime(payment.paidAt)}</td>
                          <td>
                            <span className="issued-sales-documents__payment">
                              {payment.paymentMethodName}
                            </span>
                          </td>
                          <td>{payment.reference || "—"}</td>
                          <td>
                            <strong>{money(payment.amount)}</strong>
                          </td>
                        </tr>
                      ))}

                      {detail.payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="issued-sales-documents__modal-empty"
                          >
                            No se encontró el pago asociado.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {detail && voidDialogOpen ? (
        <div
          role="presentation"
          className="issued-sales-documents__void-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeVoidDialog();
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="issued-sales-void-title"
            className="issued-sales-documents__void-dialog"
          >
            <div className="issued-sales-documents__void-dialog-icon">
              <Ban size={24} />
            </div>

            <div className="issued-sales-documents__void-dialog-content">
              <h2 id="issued-sales-void-title">Anular factura</h2>

              <p>
                Vas a anular <strong>{detail.reference}</strong>. Esta acción
                registrará una reversión financiera y de inventario cuando
                corresponda, conservando el documento original para auditoría.
              </p>

              <label>
                Motivo de la anulación
                <textarea
                  value={voidReason}
                  onChange={(event) => {
                    setVoidReason(event.target.value);
                    if (voidError) setVoidError("");
                  }}
                  maxLength={255}
                  rows={4}
                  autoFocus
                  placeholder="Describe el motivo de la anulación..."
                  disabled={voiding}
                />
              </label>

              <div className="issued-sales-documents__void-counter">
                <span>Mínimo 3 caracteres</span>
                <span>{voidReason.length}/255</span>
              </div>

              {voidError ? (
                <p className="error-message">{voidError}</p>
              ) : null}

              <div className="issued-sales-documents__void-dialog-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeVoidDialog}
                  disabled={voiding}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void confirmVoid()}
                  disabled={
                    voiding ||
                    voidReason.trim().length < 3 ||
                    voidReason.trim().length > 255
                  }
                >
                  <Ban size={16} />
                  {voiding ? "Anulando..." : "Confirmar anulación"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
