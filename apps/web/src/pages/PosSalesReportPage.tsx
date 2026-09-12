import {
  BarChart3,
  CalendarRange,
  ChevronLeft,
  CreditCard,
  DollarSign,
  Download,
  House,
  PackageSearch,
  Printer,
  ReceiptText,
  ShieldAlert,
  Store,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  PointOfSaleResponse,
  PosDailySalesReportResponse,
  PosSaleMode,
  PosOperationalProfitabilityReportResponse,
  PosProfitabilityByPointReportResponse,
  PosProfitabilityEvaluationResponse,
  PosProfitabilityReportResponse,
  PosProfitabilityTrendResponse,
  PosSalesComparisonResponse,
  PosSalesTransactionResponse,
  PosSalesTrendResponse,
  PosSalesTransactionType,
} from "@cactus/shared";
import { api } from "../lib/api";

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function csvValue(value: string | number): string {
  const normalized = String(value ?? "");

  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

function saleModeLabel(mode: PosSaleMode): string {
  switch (mode) {
    case "DINE_IN":
      return "Consumo local";
    case "TAKEAWAY":
      return "Para llevar";
    case "DIRECT":
      return "Venta directa";
  }
}

function transactionTypeLabel(type: PosSalesTransactionType): string {
  return type === "DIRECT" ? "Venta directa" : "Cuenta HOLD";
}

type TrendChartPoint = {
  date: string;
  value: number;
};

function TrendLineChart({
  title,
  subtitle,
  points,
  valueFormatter,
}: {
  title: string;
  subtitle: string;
  points: TrendChartPoint[];
  valueFormatter: (value: number) => string;
}) {
  const width = 760;
  const height = 240;
  const paddingLeft = 54;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 38;

  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = Math.max(maxValue - minValue, 1);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const xFor = (index: number): number =>
    points.length <= 1
      ? paddingLeft + chartWidth / 2
      : paddingLeft + (index / (points.length - 1)) * chartWidth;

  const yFor = (value: number): number =>
    paddingTop + ((maxValue - value) / range) * chartHeight;

  const path = points
    .map((point, index) => {
      const x = xFor(index);
      const y = yFor(point.value);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return {
      value: maxValue - ratio * range,
      y: paddingTop + ratio * chartHeight,
    };
  });

  const xTickIndexes =
    points.length <= 6
      ? points.map((_, index) => index)
      : Array.from(
          new Set([
            0,
            Math.floor((points.length - 1) * 0.25),
            Math.floor((points.length - 1) * 0.5),
            Math.floor((points.length - 1) * 0.75),
            points.length - 1,
          ]),
        );

  return (
    <article className="pos-sales-chart-card">
      <div className="pos-sales-chart-card__heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <strong>
          {points.length > 0
            ? valueFormatter(points[points.length - 1].value)
            : valueFormatter(0)}
        </strong>
      </div>

      {points.length === 0 ? (
        <div className="operations-empty">No hay datos para graficar.</div>
      ) : (
        <div className="pos-sales-chart-card__canvas">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title}. ${subtitle}`}
          >
            {yTicks.map((tick, index) => (
              <g key={`y-${index}`}>
                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={tick.y}
                  y2={tick.y}
                  className="pos-sales-chart-grid-line"
                />
                <text
                  x={paddingLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="pos-sales-chart-axis-text"
                >
                  {valueFormatter(tick.value)}
                </text>
              </g>
            ))}

            {xTickIndexes.map((index) => {
              const point = points[index];

              return (
                <text
                  key={`x-${index}`}
                  x={xFor(index)}
                  y={height - 12}
                  textAnchor="middle"
                  className="pos-sales-chart-axis-text"
                >
                  {new Date(`${point.date}T00:00:00`).toLocaleDateString(
                    "es-DO",
                    {
                      day: "2-digit",
                      month: "2-digit",
                    },
                  )}
                </text>
              );
            })}

            <path d={path} fill="none" className="pos-sales-chart-line" />

            {points.map((point, index) => (
              <circle
                key={point.date}
                cx={xFor(index)}
                cy={yFor(point.value)}
                r="4"
                className="pos-sales-chart-dot"
              >
                <title>
                  {`${new Date(`${point.date}T00:00:00`).toLocaleDateString(
                    "es-DO",
                  )}: ${valueFormatter(point.value)}`}
                </title>
              </circle>
            ))}
          </svg>
        </div>
      )}
    </article>
  );
}

type ProfitabilitySeriesPoint = {
  date: string;
  revenue: number;
  cost: number;
  margin: number;
};

function ProfitabilityTrendChart({
  points,
}: {
  points: ProfitabilitySeriesPoint[];
}) {
  const width = 820;
  const height = 260;
  const paddingLeft = 58;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 40;

  const maxValue = Math.max(
    ...points.flatMap((point) => [point.revenue, point.cost, point.margin]),
    0,
  );

  const range = Math.max(maxValue, 1);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const xFor = (index: number): number =>
    points.length <= 1
      ? paddingLeft + chartWidth / 2
      : paddingLeft + (index / (points.length - 1)) * chartWidth;

  const yFor = (value: number): number =>
    paddingTop + ((maxValue - value) / range) * chartHeight;

  const pathFor = (
    selector: (point: ProfitabilitySeriesPoint) => number,
  ): string =>
    points
      .map((point, index) => {
        const x = xFor(index);
        const y = yFor(selector(point));

        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;

    return {
      value: maxValue - ratio * range,
      y: paddingTop + ratio * chartHeight,
    };
  });

  const xTickIndexes =
    points.length <= 6
      ? points.map((_, index) => index)
      : Array.from(
          new Set([
            0,
            Math.floor((points.length - 1) * 0.25),
            Math.floor((points.length - 1) * 0.5),
            Math.floor((points.length - 1) * 0.75),
            points.length - 1,
          ]),
        );

  return (
    <div className="pos-profitability-trend-chart">
      <div className="pos-profitability-trend-chart__legend">
        <span>
          <i className="pos-profitability-trend-chart__swatch pos-profitability-trend-chart__swatch--revenue" />
          Ingreso
        </span>
        <span>
          <i className="pos-profitability-trend-chart__swatch pos-profitability-trend-chart__swatch--cost" />
          Costo
        </span>
        <span>
          <i className="pos-profitability-trend-chart__swatch pos-profitability-trend-chart__swatch--margin" />
          Margen
        </span>
      </div>

      <div className="pos-profitability-trend-chart__canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Tendencia diaria de ingreso, costo y margen"
        >
          {yTicks.map((tick, index) => (
            <g key={`profit-y-${index}`}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={tick.y}
                y2={tick.y}
                className="pos-profitability-trend-grid"
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="pos-profitability-trend-axis"
              >
                {money(tick.value)}
              </text>
            </g>
          ))}

          {xTickIndexes.map((index) => {
            const point = points[index];

            return (
              <text
                key={`profit-x-${index}`}
                x={xFor(index)}
                y={height - 12}
                textAnchor="middle"
                className="pos-profitability-trend-axis"
              >
                {new Date(`${point.date}T00:00:00`).toLocaleDateString(
                  "es-DO",
                  {
                    day: "2-digit",
                    month: "2-digit",
                  },
                )}
              </text>
            );
          })}

          <path
            d={pathFor((point) => point.revenue)}
            fill="none"
            className="pos-profitability-trend-line pos-profitability-trend-line--revenue"
          />

          <path
            d={pathFor((point) => point.cost)}
            fill="none"
            className="pos-profitability-trend-line pos-profitability-trend-line--cost"
          />

          <path
            d={pathFor((point) => point.margin)}
            fill="none"
            className="pos-profitability-trend-line pos-profitability-trend-line--margin"
          />
        </svg>
      </div>
    </div>
  );
}

type ProfitabilityPolicyDraft = {
  enabled: boolean;
  minimumGrossMarginPercent: number;
  minimumCostCoveragePercent: number;
  alertLowMarginEnabled: boolean;
  alertIncompleteCostEnabled: boolean;
};

type PaginationState<T> = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  items: T[];
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

function useLocalPagination<T>(
  items: T[],
  resetKey: string,
  defaultPageSize = 10,
): PaginationState<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;

    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    items: paginatedItems,
    setPage,
    setPageSize,
  };
}

function ListPagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav className="report-pagination" aria-label="Navegación de listado">
      <div className="report-pagination__summary">
        <strong>
          {firstItem}–{lastItem}
        </strong>
        <span>de {totalItems}</span>
      </div>

      <label className="report-pagination__size">
        Mostrar
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </label>

      <div className="report-pagination__controls">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label="Primera página"
        >
          «
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Anterior
        </button>

        <span>
          Página <strong>{page}</strong> de <strong>{totalPages}</strong>
        </span>

        <button
          type="button"
          className="secondary-button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Siguiente
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          aria-label="Última página"
        >
          »
        </button>
      </div>
    </nav>
  );
}

type PosReportView =
  | "summary"
  | "transactions"
  | "products"
  | "operations"
  | "shift-items"
  | "comparisons"
  | "trends"
  | "controls";

const POS_REPORT_VIEW_TITLES: Record<PosReportView, string> = {
  summary: "Resumen de ventas",
  transactions: "Ventas y transacciones",
  products: "Productos y rentabilidad",
  operations: "Cajeros y turnos",
  "shift-items": "Artículos por turno",
  comparisons: "Comparativos",
  trends: "Tendencias",
  controls: "Control y alertas",
};

export function PosSalesReportPage() {
  const navigate = useNavigate();

  const today = useMemo(() => localDateInputValue(new Date()), []);

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [pointOfSaleId, setPointOfSaleId] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [report, setReport] = useState<PosDailySalesReportResponse | null>(
    null,
  );
  const [comparison, setComparison] =
    useState<PosSalesComparisonResponse | null>(null);
  const [trend, setTrend] = useState<PosSalesTrendResponse | null>(null);
  const [profitability, setProfitability] =
    useState<PosProfitabilityReportResponse | null>(null);
  const [profitabilityTrend, setProfitabilityTrend] =
    useState<PosProfitabilityTrendResponse | null>(null);
  const [profitabilityEvaluation, setProfitabilityEvaluation] =
    useState<PosProfitabilityEvaluationResponse | null>(null);
  const [operationalProfitability, setOperationalProfitability] =
    useState<PosOperationalProfitabilityReportResponse | null>(null);
  const [profitabilityByPoint, setProfitabilityByPoint] =
    useState<PosProfitabilityByPointReportResponse | null>(null);
  const [comparisonPointIds, setComparisonPointIds] = useState<string[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [policyDraft, setPolicyDraft] = useState<ProfitabilityPolicyDraft>({
    enabled: true,
    minimumGrossMarginPercent: 20,
    minimumCostCoveragePercent: 95,
    alertLowMarginEnabled: true,
    alertIncompleteCostEnabled: true,
  });
  const [policySaving, setPolicySaving] = useState(false);
  const [policyNotice, setPolicyNotice] = useState("");
  const [transactions, setTransactions] = useState<
    PosSalesTransactionResponse[]
  >([]);
  const [transactionQuery, setTransactionQuery] = useState("");
  const [transactionType, setTransactionType] = useState<
    "" | PosSalesTransactionType
  >("");
  const [saleModeFilter, setSaleModeFilter] = useState<"" | PosSaleMode>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [consulting, setConsulting] = useState(false);
  const [error, setError] = useState("");
  const [activeReport, setActiveReport] = useState<PosReportView | null>(null);

  async function loadReport(
    nextPointOfSaleId: string,
    nextDateFrom: string,
    nextDateTo: string,
  ): Promise<void> {
    if (!nextPointOfSaleId) {
      setReport(null);
      return;
    }

    setConsulting(true);
    setError("");

    try {
      const [
        data,
        transactionData,
        comparisonData,
        trendData,
        profitabilityData,
        profitabilityTrendData,
        profitabilityEvaluationData,
        operationalProfitabilityData,
      ] = await Promise.all([
        api.posDailySalesReport(nextPointOfSaleId, nextDateFrom, nextDateTo),
        api.posSalesTransactionsReport(
          nextPointOfSaleId,
          nextDateFrom,
          nextDateTo,
        ),
        api.posSalesComparison(nextPointOfSaleId, nextDateFrom, nextDateTo),
        api.posSalesTrend(nextPointOfSaleId, nextDateFrom, nextDateTo),
        api.posProfitabilityReport(nextPointOfSaleId, nextDateFrom, nextDateTo),
        api.posProfitabilityTrend(nextPointOfSaleId, nextDateFrom, nextDateTo),
        api.posProfitabilityEvaluation(
          nextPointOfSaleId,
          nextDateFrom,
          nextDateTo,
        ),
        api.posOperationalProfitability(
          nextPointOfSaleId,
          nextDateFrom,
          nextDateTo,
        ),
      ]);

      setReport(data);
      setTransactions(transactionData.transactions);
      setComparison(comparisonData);
      setTrend(trendData);
      setProfitability(profitabilityData);
      setProfitabilityTrend(profitabilityTrendData);
      setProfitabilityEvaluation(profitabilityEvaluationData);
      setOperationalProfitability(operationalProfitabilityData);
      setPolicyDraft({
        enabled: profitabilityEvaluationData.policy.enabled,
        minimumGrossMarginPercent:
          profitabilityEvaluationData.policy.minimumGrossMarginPercent,
        minimumCostCoveragePercent:
          profitabilityEvaluationData.policy.minimumCostCoveragePercent,
        alertLowMarginEnabled:
          profitabilityEvaluationData.policy.alertLowMarginEnabled,
        alertIncompleteCostEnabled:
          profitabilityEvaluationData.policy.alertIncompleteCostEnabled,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el reporte de ventas.",
      );
      setReport(null);
      setTransactions([]);
      setComparison(null);
      setTrend(null);
      setProfitability(null);
      setProfitabilityTrend(null);
      setProfitabilityEvaluation(null);
      setOperationalProfitability(null);
    } finally {
      setConsulting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError("");

        const pointRows = await api.posPoints();

        if (cancelled) return;

        setPoints(pointRows);
        setComparisonPointIds(pointRows.map((point) => point.id));

        const firstPoint = pointRows[0];

        if (!firstPoint) {
          throw new Error("No existe un punto de venta configurado.");
        }

        setPointOfSaleId(firstPoint.id);

        const [
          data,
          transactionData,
          comparisonData,
          trendData,
          profitabilityData,
          profitabilityTrendData,
          profitabilityEvaluationData,
          operationalProfitabilityData,
          profitabilityByPointData,
        ] = await Promise.all([
          api.posDailySalesReport(firstPoint.id, today, today),
          api.posSalesTransactionsReport(firstPoint.id, today, today),
          api.posSalesComparison(firstPoint.id, today, today),
          api.posSalesTrend(firstPoint.id, today, today),
          api.posProfitabilityReport(firstPoint.id, today, today),
          api.posProfitabilityTrend(firstPoint.id, today, today),
          api.posProfitabilityEvaluation(firstPoint.id, today, today),
          api.posOperationalProfitability(firstPoint.id, today, today),
          api.posProfitabilityByPoint(
            pointRows.map((point) => point.id),
            today,
            today,
          ),
        ]);

        if (!cancelled) {
          setReport(data);
          setTransactions(transactionData.transactions);
          setComparison(comparisonData);
          setTrend(trendData);
          setProfitability(profitabilityData);
          setProfitabilityTrend(profitabilityTrendData);
          setProfitabilityEvaluation(profitabilityEvaluationData);
          setOperationalProfitability(operationalProfitabilityData);
          setProfitabilityByPoint(profitabilityByPointData);
          setPolicyDraft({
            enabled: profitabilityEvaluationData.policy.enabled,
            minimumGrossMarginPercent:
              profitabilityEvaluationData.policy.minimumGrossMarginPercent,
            minimumCostCoveragePercent:
              profitabilityEvaluationData.policy.minimumCostCoveragePercent,
            alertLowMarginEnabled:
              profitabilityEvaluationData.policy.alertLowMarginEnabled,
            alertIncompleteCostEnabled:
              profitabilityEvaluationData.policy.alertIncompleteCostEnabled,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No fue posible cargar el reporte de ventas.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [today]);

  const paymentTotal = useMemo(
    () =>
      report?.byPaymentMethod.reduce((sum, row) => sum + row.amount, 0) ?? 0,
    [report],
  );

  const paymentDifference = report
    ? Math.round((report.total - paymentTotal) * 100) / 100
    : 0;

  const paymentMethodOptions = useMemo(() => {
    const rows = new Map<string, string>();

    for (const transaction of transactions) {
      if (transaction.paymentMethodId && transaction.paymentMethodName) {
        rows.set(transaction.paymentMethodId, transaction.paymentMethodName);
      }
    }

    return [...rows.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalized = transactionQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      if (transactionType && transaction.transactionType !== transactionType) {
        return false;
      }

      if (saleModeFilter && transaction.saleMode !== saleModeFilter) {
        return false;
      }

      if (
        paymentMethodFilter &&
        transaction.paymentMethodId !== paymentMethodFilter
      ) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        transaction.reference.toLowerCase().includes(normalized) ||
        (transaction.customerAlias ?? "").toLowerCase().includes(normalized) ||
        (transaction.paymentMethodName ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [
    transactions,
    transactionQuery,
    transactionType,
    saleModeFilter,
    paymentMethodFilter,
  ]);

  const paginationResetKey = [pointOfSaleId, dateFrom, dateTo].join("|");

  const transactionPagination = useLocalPagination(
    filteredTransactions,
    [
      paginationResetKey,
      transactionQuery,
      transactionType,
      saleModeFilter,
      paymentMethodFilter,
    ].join("|"),
  );

  const categoryPagination = useLocalPagination(
    profitability?.byCategory ?? [],
    paginationResetKey,
  );

  const productPagination = useLocalPagination(
    profitability?.byProduct ?? [],
    paginationResetKey,
  );

  const alertPagination = useLocalPagination(
    profitabilityEvaluation?.alerts ?? [],
    [paginationResetKey, profitabilityEvaluation?.generatedAt ?? ""].join("|"),
  );

  const profitabilityDayPagination = useLocalPagination(
    profitabilityTrend?.byDay ?? [],
    paginationResetKey,
  );

  const salesDayPagination = useLocalPagination(
    trend?.byDay ?? [],
    paginationResetKey,
  );

  const employeeProfitabilityPagination = useLocalPagination(
    operationalProfitability?.byEmployee ?? [],
    paginationResetKey,
  );

  const shiftProfitabilityPagination = useLocalPagination(
    operationalProfitability?.byShift ?? [],
    paginationResetKey,
  );

  const pointProfitabilityPagination = useLocalPagination(
    profitabilityByPoint?.byPoint ?? [],
    [
      paginationResetKey,
      comparisonPointIds.join(","),
      profitabilityByPoint?.generatedAt ?? "",
    ].join("|"),
  );

  const operationalSummary = useMemo(() => {
    const employees = operationalProfitability?.byEmployee ?? [];

    return {
      employeesCount: employees.length,
      shiftsCount: operationalProfitability?.byShift.length ?? 0,
      topEmployee: employees[0] ?? null,
      attributedSales: employees.reduce((sum, row) => sum + row.salesCount, 0),
    };
  }, [operationalProfitability]);

  const pointComparisonHighlights = useMemo(() => {
    const rows = profitabilityByPoint?.byPoint ?? [];

    const bestGrossMargin =
      rows.length > 0
        ? rows.reduce((best, row) =>
            row.grossMargin > best.grossMargin ? row : best,
          )
        : null;

    const bestMarginPercent = rows
      .filter(
        (row) => row.grossMarginPercent !== null && row.costCoveragePercent > 0,
      )
      .reduce<
        (typeof rows)[number] | null
      >((best, row) => (!best || (row.grossMarginPercent ?? -Infinity) > (best.grossMarginPercent ?? -Infinity) ? row : best), null);

    const incompleteCoverageCount = rows.filter(
      (row) => row.costCoverageStatus !== "COMPLETE",
    ).length;

    return {
      bestGrossMargin,
      bestMarginPercent,
      incompleteCoverageCount,
    };
  }, [profitabilityByPoint]);

  const totalTrendPoints = useMemo(
    () =>
      trend?.byDay.map((row) => ({
        date: row.date,
        value: row.total,
      })) ?? [],
    [trend],
  );

  const averageTicketTrendPoints = useMemo(
    () =>
      trend?.byDay.map((row) => ({
        date: row.date,
        value: row.averageTicket,
      })) ?? [],
    [trend],
  );

  function deltaLabel(value: number | null): string {
    if (value === null) return "Nuevo";

    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(1)}%`;
  }

  function deltaClass(value: number | null): string {
    if (value === null) {
      return "pos-sales-comparison__delta pos-sales-comparison__delta--new";
    }

    if (value > 0) {
      return "pos-sales-comparison__delta pos-sales-comparison__delta--up";
    }

    if (value < 0) {
      return "pos-sales-comparison__delta pos-sales-comparison__delta--down";
    }

    return "pos-sales-comparison__delta";
  }

  const profitabilityTrendPoints = useMemo(
    () =>
      profitabilityTrend?.byDay.map((row) => ({
        date: row.date,
        revenue: row.netRevenue,
        cost: row.costOfGoodsSold,
        margin: row.grossMargin,
      })) ?? [],
    [profitabilityTrend],
  );

  const profitabilityTrendAlerts = useMemo(
    () =>
      profitabilityEvaluation?.alerts.filter(
        (alert) => alert.scope === "DAY",
      ) ?? [],
    [profitabilityEvaluation],
  );

  const topMarginProducts = useMemo(
    () =>
      profitability?.byProduct
        .filter((row) => row.costCoverageStatus !== "NO_COST_DATA")
        .slice()
        .sort(
          (a, b) =>
            b.grossMargin - a.grossMargin || b.netRevenue - a.netRevenue,
        )
        .slice(0, 5) ?? [],
    [profitability],
  );

  const lowMarginProducts = useMemo(() => {
    if (!profitability || !profitabilityEvaluation) {
      return [];
    }

    const ids = new Set(
      profitabilityEvaluation.alerts
        .filter(
          (alert) =>
            alert.scope === "PRODUCT" &&
            alert.type === "LOW_MARGIN" &&
            alert.entityId,
        )
        .map((alert) => alert.entityId as string),
    );

    return profitability.byProduct
      .filter((row) => ids.has(row.productId))
      .slice()
      .sort(
        (a, b) =>
          (a.grossMarginPercent ?? 0) - (b.grossMarginPercent ?? 0) ||
          b.netRevenue - a.netRevenue,
      )
      .slice(0, 5);
  }, [profitability, profitabilityEvaluation]);

  const productsWithoutCost = useMemo(
    () =>
      profitability?.byProduct
        .filter((row) => row.unknownCostLines > 0)
        .slice()
        .sort((a, b) => b.unknownCostRevenue - a.unknownCostRevenue)
        .slice(0, 5) ?? [],
    [profitability],
  );

  const topCategory = useMemo(
    () =>
      profitability?.byCategory
        .slice()
        .sort(
          (a, b) =>
            b.grossMargin - a.grossMargin || b.netRevenue - a.netRevenue,
        )[0] ?? null,
    [profitability],
  );

  function profitabilityCoverageLabel(): string {
    if (!profitability) return "";

    switch (profitability.summary.costCoverageStatus) {
      case "COMPLETE":
        return "Cobertura completa";
      case "PARTIAL":
        return "Cobertura parcial";
      case "NO_COST_DATA":
        return "Sin datos de costo";
    }
  }

  async function saveProfitabilityPolicy(): Promise<void> {
    if (!pointOfSaleId) return;

    setPolicySaving(true);
    setPolicyNotice("");
    setError("");

    try {
      await api.updatePosProfitabilityPolicy(pointOfSaleId, policyDraft);

      const evaluation = await api.posProfitabilityEvaluation(
        pointOfSaleId,
        dateFrom,
        dateTo,
      );

      setProfitabilityEvaluation(evaluation);
      setPolicyDraft({
        enabled: evaluation.policy.enabled,
        minimumGrossMarginPercent: evaluation.policy.minimumGrossMarginPercent,
        minimumCostCoveragePercent:
          evaluation.policy.minimumCostCoveragePercent,
        alertLowMarginEnabled: evaluation.policy.alertLowMarginEnabled,
        alertIncompleteCostEnabled:
          evaluation.policy.alertIncompleteCostEnabled,
      });

      setPolicyNotice("Política de rentabilidad actualizada.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la política de rentabilidad.",
      );
    } finally {
      setPolicySaving(false);
    }
  }

  function toggleComparisonPoint(pointId: string): void {
    setComparisonPointIds((current) =>
      current.includes(pointId)
        ? current.filter((id) => id !== pointId)
        : [...current, pointId],
    );
  }

  async function loadPointProfitabilityComparison(): Promise<void> {
    if (comparisonPointIds.length === 0) {
      setError("Selecciona al menos un punto de venta para comparar.");
      return;
    }

    setComparisonLoading(true);
    setError("");

    try {
      const data = await api.posProfitabilityByPoint(
        comparisonPointIds,
        dateFrom,
        dateTo,
      );

      setProfitabilityByPoint(data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar la comparación entre puntos de venta.",
      );
    } finally {
      setComparisonLoading(false);
    }
  }

  function exportPointProfitabilityCsv(): void {
    if (!profitabilityByPoint) return;

    const header = [
      "PuntoVenta",
      "Ventas",
      "TicketPromedio",
      "IngresoNeto",
      "IngresoConCosto",
      "CostoVendido",
      "MargenBruto",
      "MargenPorcentaje",
      "IngresoSinCosto",
      "LineasCostoConocido",
      "LineasCostoDesconocido",
      "CoberturaCostoPorcentaje",
      "EstadoCobertura",
    ];

    const rows = profitabilityByPoint.byPoint.map((row) => [
      row.pointOfSaleName,
      row.salesCount,
      row.averageTicket.toFixed(2),
      row.netRevenue.toFixed(2),
      row.marginBasisRevenue.toFixed(2),
      row.costOfGoodsSold.toFixed(2),
      row.grossMargin.toFixed(2),
      row.grossMarginPercent === null ? "" : row.grossMarginPercent.toFixed(1),
      row.unknownCostRevenue.toFixed(2),
      row.knownCostLines,
      row.unknownCostLines,
      row.costCoveragePercent.toFixed(1),
      row.costCoverageStatus,
    ]);

    const summaryRows = [
      [],
      ["RESUMEN CONSOLIDADO"],
      ["POSComparados", profitabilityByPoint.pointsCount],
      ["Ventas", profitabilityByPoint.summary.salesCount],
      ["TicketPromedio", profitabilityByPoint.summary.averageTicket.toFixed(2)],
      ["IngresoNeto", profitabilityByPoint.summary.netRevenue.toFixed(2)],
      [
        "IngresoConCosto",
        profitabilityByPoint.summary.marginBasisRevenue.toFixed(2),
      ],
      ["CostoVendido", profitabilityByPoint.summary.costOfGoodsSold.toFixed(2)],
      ["MargenBruto", profitabilityByPoint.summary.grossMargin.toFixed(2)],
      [
        "MargenPorcentaje",
        profitabilityByPoint.summary.grossMarginPercent === null
          ? ""
          : profitabilityByPoint.summary.grossMarginPercent.toFixed(1),
      ],
      [
        "IngresoSinCosto",
        profitabilityByPoint.summary.unknownCostRevenue.toFixed(2),
      ],
      [
        "CoberturaCostoPorcentaje",
        profitabilityByPoint.summary.costCoveragePercent.toFixed(1),
      ],
      ["EstadoCobertura", profitabilityByPoint.summary.costCoverageStatus],
      ["FechaDesde", profitabilityByPoint.dateFrom],
      ["FechaHasta", profitabilityByPoint.dateTo],
    ];

    const csv = [
      header.map(csvValue).join(","),
      ...rows.map((row) => row.map(csvValue).join(",")),
      ...summaryRows.map((row) => row.map(csvValue).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `comparativo-rentabilidad-pos-${profitabilityByPoint.dateFrom}-${profitabilityByPoint.dateTo}.csv`
        .replaceAll(" ", "-")
        .toLowerCase();

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportOperationalEmployeesCsv(): void {
    if (!operationalProfitability) return;

    const header = [
      "EmpleadoNo",
      "Empleado",
      "Sesiones",
      "Ventas",
      "IngresoNeto",
      "IngresoConCosto",
      "CostoVendido",
      "MargenBruto",
      "MargenPorcentaje",
      "IngresoSinCosto",
      "CoberturaCostoPorcentaje",
      "EstadoCobertura",
    ];

    const rows = operationalProfitability.byEmployee.map((row) => [
      row.employeeNo,
      row.employeeName,
      row.sessionsCount,
      row.salesCount,
      row.netRevenue.toFixed(2),
      row.marginBasisRevenue.toFixed(2),
      row.costOfGoodsSold.toFixed(2),
      row.grossMargin.toFixed(2),
      row.grossMarginPercent === null ? "" : row.grossMarginPercent.toFixed(1),
      row.unknownCostRevenue.toFixed(2),
      row.costCoveragePercent.toFixed(1),
      row.costCoverageStatus,
    ]);

    const csv = [
      header.map(csvValue).join(","),
      ...rows.map((row) => row.map(csvValue).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `rentabilidad-empleados-${operationalProfitability.pointOfSaleName}-${operationalProfitability.dateFrom}-${operationalProfitability.dateTo}.csv`
        .replaceAll(" ", "-")
        .toLowerCase();

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportOperationalShiftsCsv(): void {
    if (!operationalProfitability) return;

    const header = [
      "SesionCajaId",
      "EmpleadoNo",
      "Empleado",
      "Caja",
      "Apertura",
      "Cierre",
      "Estado",
      "Ventas",
      "IngresoNeto",
      "IngresoConCosto",
      "CostoVendido",
      "MargenBruto",
      "MargenPorcentaje",
      "IngresoSinCosto",
      "CoberturaCostoPorcentaje",
      "EstadoCobertura",
    ];

    const rows = operationalProfitability.byShift.map((row) => [
      row.cashSessionId,
      row.employeeNo,
      row.employeeName,
      row.cashRegisterName,
      new Date(row.openedAt).toLocaleString("es-DO"),
      row.closedAt ? new Date(row.closedAt).toLocaleString("es-DO") : "",
      row.status,
      row.salesCount,
      row.netRevenue.toFixed(2),
      row.marginBasisRevenue.toFixed(2),
      row.costOfGoodsSold.toFixed(2),
      row.grossMargin.toFixed(2),
      row.grossMarginPercent === null ? "" : row.grossMarginPercent.toFixed(1),
      row.unknownCostRevenue.toFixed(2),
      row.costCoveragePercent.toFixed(1),
      row.costCoverageStatus,
    ]);

    const csv = [
      header.map(csvValue).join(","),
      ...rows.map((row) => row.map(csvValue).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `rentabilidad-turnos-${operationalProfitability.pointOfSaleName}-${operationalProfitability.dateFrom}-${operationalProfitability.dateTo}.csv`
        .replaceAll(" ", "-")
        .toLowerCase();

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv(): void {
    if (!report) return;

    const header = [
      "FechaHora",
      "Referencia",
      "Tipo",
      "Modalidad",
      "Cliente",
      "MetodoPago",
      "Subtotal",
      "ITBIS",
      "Servicio",
      "Total",
    ];

    const rows = filteredTransactions.map((transaction) => [
      new Date(transaction.paidAt).toLocaleString("es-DO"),
      transaction.reference,
      transactionTypeLabel(transaction.transactionType),
      saleModeLabel(transaction.saleMode),
      transaction.customerAlias ?? "",
      transaction.paymentMethodName ?? "",
      transaction.subtotal.toFixed(2),
      transaction.taxAmount.toFixed(2),
      transaction.serviceChargeAmount.toFixed(2),
      transaction.total.toFixed(2),
    ]);

    const csv = [
      header.map(csvValue).join(","),
      ...rows.map((row) => row.map(csvValue).join(",")),
    ].join("\\n");

    const blob = new Blob([`\\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `ventas-pos-${report.pointOfSaleName}-${report.dateFrom}-${report.dateTo}.csv`
        .replaceAll(" ", "-")
        .toLowerCase();

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function printReport(): void {
    if (!report) return;

    const popup = window.open("", "_blank", "width=1100,height=800");

    if (!popup) {
      setError(
        "El navegador bloqueó la ventana de impresión. Permite ventanas emergentes.",
      );
      return;
    }

    const paymentRows = report.byPaymentMethod
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.paymentMethodName)}</td>
            <td class="number">${row.transactions}</td>
            <td class="number">${money(row.amount)}</td>
          </tr>
        `,
      )
      .join("");

    const modeRows = report.bySaleMode
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(saleModeLabel(row.saleMode))}</td>
            <td class="number">${row.transactions}</td>
            <td class="number">${money(row.subtotal)}</td>
            <td class="number">${money(row.taxAmount)}</td>
            <td class="number">${money(row.serviceChargeAmount)}</td>
            <td class="number">${money(row.total)}</td>
          </tr>
        `,
      )
      .join("");

    const transactionRows = filteredTransactions
      .map(
        (transaction) => `
          <tr>
            <td>${escapeHtml(
              new Date(transaction.paidAt).toLocaleString("es-DO"),
            )}</td>
            <td>${escapeHtml(transaction.reference)}</td>
            <td>${escapeHtml(
              transactionTypeLabel(transaction.transactionType),
            )}</td>
            <td>${escapeHtml(saleModeLabel(transaction.saleMode))}</td>
            <td>${escapeHtml(transaction.customerAlias ?? "—")}</td>
            <td>${escapeHtml(transaction.paymentMethodName ?? "—")}</td>
            <td class="number">${money(transaction.subtotal)}</td>
            <td class="number">${money(transaction.taxAmount)}</td>
            <td class="number">${money(transaction.serviceChargeAmount)}</td>
            <td class="number">${money(transaction.total)}</td>
          </tr>
        `,
      )
      .join("");

    popup.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Reporte de ventas POS</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * { box-sizing: border-box; }

            body {
              margin: 0;
              color: #17211a;
              font-family: Inter, Arial, sans-serif;
              font-size: 11px;
            }

            h1, h2, p { margin: 0; }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              align-items: flex-start;
              margin-bottom: 16px;
            }

            .brand {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: .08em;
            }

            .meta {
              text-align: right;
              color: #56645b;
            }

            .kpis {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 8px;
              margin-bottom: 16px;
            }

            .kpi {
              padding: 10px;
              border: 1px solid #d7e0da;
              border-radius: 8px;
            }

            .kpi span {
              display: block;
              color: #68766d;
              margin-bottom: 4px;
            }

            .kpi strong {
              font-size: 15px;
            }

            section {
              margin-top: 16px;
            }

            section h2 {
              margin-bottom: 7px;
              font-size: 13px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th, td {
              padding: 6px 7px;
              border: 1px solid #dfe6e1;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f5f2;
              font-weight: 800;
            }

            .number {
              text-align: right;
              white-space: nowrap;
            }

            .footer {
              margin-top: 12px;
              color: #6b786f;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">CACTUS</div>
              <h1>Reporte de Ventas POS</h1>
              <p>${escapeHtml(report.pointOfSaleName)}</p>
            </div>

            <div class="meta">
              <div>Desde: ${escapeHtml(report.dateFrom)}</div>
              <div>Hasta: ${escapeHtml(report.dateTo)}</div>
              <div>
                Generado:
                ${escapeHtml(
                  new Date(report.generatedAt).toLocaleString("es-DO"),
                )}
              </div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi">
              <span>Ventas</span>
              <strong>${report.salesCount}</strong>
            </div>
            <div class="kpi">
              <span>Subtotal</span>
              <strong>${money(report.subtotal)}</strong>
            </div>
            <div class="kpi">
              <span>ITBIS</span>
              <strong>${money(report.taxAmount)}</strong>
            </div>
            <div class="kpi">
              <span>Servicio</span>
              <strong>${money(report.serviceChargeAmount)}</strong>
            </div>
            <div class="kpi">
              <span>Total</span>
              <strong>${money(report.total)}</strong>
            </div>
          </div>

          <section>
            <h2>Por método de pago</h2>
            <table>
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Transacciones</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>${paymentRows}</tbody>
            </table>
          </section>

          <section>
            <h2>Por modalidad de venta</h2>
            <table>
              <thead>
                <tr>
                  <th>Modalidad</th>
                  <th>Transacciones</th>
                  <th>Subtotal</th>
                  <th>ITBIS</th>
                  <th>Servicio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${modeRows}</tbody>
            </table>
          </section>

          <section>
            <h2>
              Detalle de transacciones (${filteredTransactions.length})
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha / hora</th>
                  <th>Referencia</th>
                  <th>Tipo</th>
                  <th>Modalidad</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th>Subtotal</th>
                  <th>ITBIS</th>
                  <th>Servicio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${transactionRows}</tbody>
            </table>
          </section>

          <div class="footer">
            La impresión refleja los filtros visibles aplicados al detalle
            transaccional en pantalla.
          </div>

          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.print();
                window.close();
              }, 150);
            });
          </script>
        </body>
      </html>
    `);

    popup.document.close();
  }

  return (
    <main className="module-page maintenance-page pos-sales-report-page">
      <header className="module-header maintenance-header pos-sales-report-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <BarChart3 size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Reporte de ventas POS</h1>
            <p>Consolidado de ventas directas y cuentas HOLD pagadas.</p>
          </div>
        </div>

        <div className="pos-sales-report-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/admin/company")}
          >
            <ChevronLeft size={14} />
            Administración
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            <House size={14} />
            Menú principal
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={printReport}
            disabled={!report || loading || consulting}
          >
            <Printer size={14} />
            Imprimir
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={
              !report ||
              loading ||
              consulting ||
              filteredTransactions.length === 0
            }
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </header>

      {error ? (
        <div className="maintenance-alert maintenance-alert--error">
          {error}
        </div>
      ) : null}

      <section className="settings-card pos-sales-report-filters">
        <div className="pos-sales-report-section-title">
          <CalendarRange size={20} />
          <div>
            <p className="eyebrow">FILTROS</p>
            <h2>Período de consulta</h2>
          </div>
        </div>

        <div className="pos-sales-report-filter-grid">
          <label>
            Punto de venta
            <select
              value={pointOfSaleId}
              onChange={(event) => setPointOfSaleId(event.target.value)}
              disabled={loading}
            >
              {points.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.branchName
                    ? `${point.branchName} · ${point.name} · ${point.code}`
                    : `${point.name} · ${point.code}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              disabled={loading}
            />
          </label>

          <label>
            Hasta
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => setDateTo(event.target.value)}
              disabled={loading}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              void loadReport(pointOfSaleId, dateFrom, dateTo);
            }}
            disabled={
              loading || consulting || !pointOfSaleId || !dateFrom || !dateTo
            }
          >
            {consulting ? "Consultando..." : "Consultar"}
          </button>
        </div>
      </section>

      {loading ? (
        <section className="settings-card">Cargando reporte...</section>
      ) : null}

      {!loading && report && !activeReport ? (
        <section className="pos-report-center" aria-label="Centro de reportes POS">
          <div className="pos-report-center__heading">
            <div>
              <p className="eyebrow">CENTRO DE REPORTES</p>
              <h2>Selecciona qué deseas analizar</h2>
              <p>
                Todos los reportes utilizan el punto de venta y período
                seleccionados arriba.
              </p>
            </div>
          </div>

          <div className="pos-report-center__grid">
            <button
              type="button"
              className="pos-report-center__card"
              data-tone="blue"
              onClick={() => setActiveReport("summary")}
            >
              <div className="pos-report-center__icon">
                <BarChart3 size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Resumen de ventas</strong>
                <span>KPIs, cobros y modalidades de venta.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pos-report-center__card"
              data-tone="green"
              onClick={() => setActiveReport("transactions")}
            >
              <div className="pos-report-center__icon">
                <ReceiptText size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Ventas y transacciones</strong>
                <span>Auditoría y detalle de operaciones.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pos-report-center__card"
              data-tone="purple"
              onClick={() => setActiveReport("products")}
            >
              <div className="pos-report-center__icon">
                <PackageSearch size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Productos y rentabilidad</strong>
                <span>Categorías, productos, costos y margen.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pos-report-center__card"
              data-tone="amber"
              onClick={() => setActiveReport("operations")}
            >
              <div className="pos-report-center__icon">
                <UsersRound size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Cajeros y turnos</strong>
                <span>Desempeño operativo y sesiones de caja.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pos-report-center__card"
              data-tone="red"
              onClick={() => setActiveReport("shift-items")}
            >
              <div className="pos-report-center__icon">
                <Store size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Artículos por turno</strong>
                <span>Qué productos se vendieron en cada sesión.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pos-report-center__card"
              data-tone="cyan"
              onClick={() => setActiveReport("comparisons")}
            >
              <div className="pos-report-center__icon">
                <CreditCard size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Comparativos</strong>
                <span>Períodos y puntos de venta.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pos-report-center__card"
              data-tone="indigo"
              onClick={() => setActiveReport("trends")}
            >
              <div className="pos-report-center__icon">
                <TrendingUp size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Tendencias</strong>
                <span>Evolución diaria de ventas y rentabilidad.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pos-report-center__card"
              data-tone="pink"
              onClick={() => setActiveReport("controls")}
            >
              <div className="pos-report-center__icon">
                <ShieldAlert size={19} />
              </div>
              <div className="pos-report-center__content">
                <strong>Control y alertas</strong>
                <span>Políticas, umbrales, insights y calidad de datos.</span>
                <small>
                  Abrir reporte
                  <span className="pos-report-center__arrow">→</span>
                </small>
              </div>
            </button>
          </div>
        </section>
      ) : null}

      {!loading && report && activeReport ? (
        <div
          className="pos-report-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveReport(null);
            }
          }}
        >
          <section
            className="pos-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-report-modal-title"
          >
            <header
              className="pos-report-modal__header"
              data-report-tone={activeReport}
            >
              <div className="pos-report-modal__heading">
                <div className="pos-report-modal__icon">
                  {activeReport === "summary" ? <BarChart3 size={19} /> : null}
                  {activeReport === "transactions" ? (
                    <ReceiptText size={19} />
                  ) : null}
                  {activeReport === "products" ? (
                    <PackageSearch size={19} />
                  ) : null}
                  {activeReport === "operations" ? (
                    <UsersRound size={19} />
                  ) : null}
                  {activeReport === "shift-items" ? <Store size={19} /> : null}
                  {activeReport === "comparisons" ? (
                    <CreditCard size={19} />
                  ) : null}
                  {activeReport === "trends" ? <TrendingUp size={19} /> : null}
                  {activeReport === "controls" ? (
                    <ShieldAlert size={19} />
                  ) : null}
                </div>

                <div>
                  <p className="eyebrow">REPORTE POS</p>
                  <h2 id="pos-report-modal-title">
                    {POS_REPORT_VIEW_TITLES[activeReport]}
                  </h2>
                  <span>
                    Datos del punto de venta y período seleccionados.
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="pos-report-modal__close"
                onClick={() => setActiveReport(null)}
                aria-label="Cerrar reporte"
              >
                <X size={18} />
              </button>
            </header>

            <div
              className="pos-report-modal__body"
              data-active-report={activeReport}
            >
          {comparison ? (
            <section className="settings-card pos-sales-comparison" data-report-view="comparisons">
              <div className="pos-sales-report-section-title">
                <BarChart3 size={20} />
                <div>
                  <p className="eyebrow">COMPARATIVO</p>
                  <h2>Período actual vs período anterior</h2>
                  <p className="settings-note">
                    Actual: {comparison.currentDateFrom} →{" "}
                    {comparison.currentDateTo} · Anterior:{" "}
                    {comparison.previousDateFrom} → {comparison.previousDateTo}
                  </p>
                </div>
              </div>

              <div className="pos-sales-comparison__grid">
                <article>
                  <span>Ventas</span>
                  <strong>{comparison.current.salesCount}</strong>
                  <small>Anterior: {comparison.previous.salesCount}</small>
                  <b className={deltaClass(comparison.delta.salesCountPercent)}>
                    {deltaLabel(comparison.delta.salesCountPercent)}
                  </b>
                </article>

                <article>
                  <span>Ticket promedio</span>
                  <strong>{money(comparison.current.averageTicket)}</strong>
                  <small>
                    Anterior: {money(comparison.previous.averageTicket)}
                  </small>
                  <b
                    className={deltaClass(
                      comparison.delta.averageTicketPercent,
                    )}
                  >
                    {deltaLabel(comparison.delta.averageTicketPercent)}
                  </b>
                </article>

                <article>
                  <span>Subtotal</span>
                  <strong>{money(comparison.current.subtotal)}</strong>
                  <small>Anterior: {money(comparison.previous.subtotal)}</small>
                  <b className={deltaClass(comparison.delta.subtotalPercent)}>
                    {deltaLabel(comparison.delta.subtotalPercent)}
                  </b>
                </article>

                <article>
                  <span>ITBIS</span>
                  <strong>{money(comparison.current.taxAmount)}</strong>
                  <small>
                    Anterior: {money(comparison.previous.taxAmount)}
                  </small>
                  <b className={deltaClass(comparison.delta.taxAmountPercent)}>
                    {deltaLabel(comparison.delta.taxAmountPercent)}
                  </b>
                </article>

                <article>
                  <span>Servicio</span>
                  <strong>
                    {money(comparison.current.serviceChargeAmount)}
                  </strong>
                  <small>
                    Anterior: {money(comparison.previous.serviceChargeAmount)}
                  </small>
                  <b
                    className={deltaClass(
                      comparison.delta.serviceChargeAmountPercent,
                    )}
                  >
                    {deltaLabel(comparison.delta.serviceChargeAmountPercent)}
                  </b>
                </article>

                <article className="pos-sales-comparison__total">
                  <span>Total</span>
                  <strong>{money(comparison.current.total)}</strong>
                  <small>Anterior: {money(comparison.previous.total)}</small>
                  <b className={deltaClass(comparison.delta.totalPercent)}>
                    {deltaLabel(comparison.delta.totalPercent)}
                  </b>
                </article>
              </div>
            </section>
          ) : null}

          <section className="pos-sales-report-kpis" data-report-view="summary">
            <article>
              <div>
                <ReceiptText size={20} />
                <span>Ventas</span>
              </div>
              <strong>{report.salesCount}</strong>
              <small>
                {report.directSalesCount} directas · {report.accountSalesCount}{" "}
                cuentas
              </small>
            </article>

            <article>
              <div>
                <DollarSign size={20} />
                <span>Subtotal</span>
              </div>
              <strong>{money(report.subtotal)}</strong>
              <small>Antes de impuestos y servicio</small>
            </article>

            <article>
              <div>
                <BarChart3 size={20} />
                <span>ITBIS</span>
              </div>
              <strong>{money(report.taxAmount)}</strong>
              <small>Impuestos cobrados</small>
            </article>

            <article>
              <div>
                <WalletCards size={20} />
                <span>Servicio</span>
              </div>
              <strong>{money(report.serviceChargeAmount)}</strong>
              <small>Cargos por servicio</small>
            </article>

            <article className="pos-sales-report-kpi-total">
              <div>
                <Store size={20} />
                <span>Total</span>
              </div>
              <strong>{money(report.total)}</strong>
              <small>
                {report.dateFrom} → {report.dateTo}
              </small>
            </article>
          </section>

          <section className="pos-sales-report-grid" data-report-view="summary">
            <article className="settings-card">
              <div className="pos-sales-report-section-title">
                <CreditCard size={20} />
                <div>
                  <p className="eyebrow">COBROS</p>
                  <h2>Por método de pago</h2>
                </div>
              </div>

              {report.byPaymentMethod.length === 0 ? (
                <div className="operations-empty">
                  No hay cobros para el período seleccionado.
                </div>
              ) : (
                <div className="pos-sales-report-table">
                  <div className="pos-sales-report-table__head">
                    <span>Método</span>
                    <span>Transacciones</span>
                    <span>Monto</span>
                  </div>

                  {report.byPaymentMethod.map((row) => (
                    <div
                      className="pos-sales-report-table__row"
                      key={row.paymentMethodId}
                    >
                      <strong>{row.paymentMethodName}</strong>
                      <span>{row.transactions}</span>
                      <strong>{money(row.amount)}</strong>
                    </div>
                  ))}

                  <div className="pos-sales-report-table__total">
                    <span>Total cobrado</span>
                    <strong>{money(paymentTotal)}</strong>
                  </div>
                </div>
              )}

              {Math.abs(paymentDifference) >= 0.01 ? (
                <div className="operations-error pos-sales-report-warning">
                  Diferencia entre ventas y pagos: {money(paymentDifference)}.
                </div>
              ) : null}
            </article>

            <article className="settings-card">
              <div className="pos-sales-report-section-title">
                <Store size={20} />
                <div>
                  <p className="eyebrow">OPERACIÓN</p>
                  <h2>Por modalidad de venta</h2>
                </div>
              </div>

              {report.bySaleMode.length === 0 ? (
                <div className="operations-empty">
                  No hay ventas para el período seleccionado.
                </div>
              ) : (
                <div className="pos-sales-report-modes">
                  {report.bySaleMode.map((row) => (
                    <div
                      className="pos-sales-report-mode-card"
                      key={row.saleMode}
                    >
                      <div>
                        <strong>{saleModeLabel(row.saleMode)}</strong>
                        <span>
                          {row.transactions}{" "}
                          {row.transactions === 1 ? "venta" : "ventas"}
                        </span>
                      </div>

                      <dl>
                        <div>
                          <dt>Subtotal</dt>
                          <dd>{money(row.subtotal)}</dd>
                        </div>
                        <div>
                          <dt>ITBIS</dt>
                          <dd>{money(row.taxAmount)}</dd>
                        </div>
                        <div>
                          <dt>Servicio</dt>
                          <dd>{money(row.serviceChargeAmount)}</dd>
                        </div>
                        <div className="pos-sales-report-mode-total">
                          <dt>Total</dt>
                          <dd>{money(row.total)}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          {profitability ? (
            <section className="settings-card pos-profitability" data-report-view="products">
              <div className="pos-sales-report-section-title">
                <DollarSign size={20} />
                <div>
                  <p className="eyebrow">RENTABILIDAD</p>
                  <h2>Margen y costo vendido</h2>
                  <p className="settings-note">
                    Margen calculado únicamente sobre líneas con costo histórico
                    conocido.
                  </p>
                </div>
              </div>

              <div className="pos-profitability__kpis">
                <article>
                  <span>Ingreso neto</span>
                  <strong>{money(profitability.summary.netRevenue)}</strong>
                  <small>Antes de ITBIS y servicio</small>
                </article>

                <article>
                  <span>Costo vendido</span>
                  <strong>
                    {money(profitability.summary.costOfGoodsSold)}
                  </strong>
                  <small>Solo líneas con costo conocido</small>
                </article>

                <article>
                  <span>Margen bruto</span>
                  <strong>{money(profitability.summary.grossMargin)}</strong>
                  <small>
                    Base: {money(profitability.summary.marginBasisRevenue)}
                  </small>
                </article>

                <article>
                  <span>Margen %</span>
                  <strong>
                    {profitability.summary.grossMarginPercent === null
                      ? "—"
                      : `${profitability.summary.grossMarginPercent.toFixed(
                          1,
                        )}%`}
                  </strong>
                  <small>Sobre ingreso con costo conocido</small>
                </article>

                <article>
                  <span>Cobertura de costo</span>
                  <strong>
                    {profitability.summary.costCoveragePercent.toFixed(1)}%
                  </strong>
                  <small>{profitabilityCoverageLabel()}</small>
                </article>
              </div>

              {profitability.summary.costCoverageStatus !== "COMPLETE" ? (
                <div className="pos-profitability__warning">
                  <strong>Cobertura de costo incompleta.</strong>
                  <span>
                    {profitability.summary.unknownCostLines}{" "}
                    {profitability.summary.unknownCostLines === 1
                      ? "línea"
                      : "líneas"}{" "}
                    sin costo representan{" "}
                    {money(profitability.summary.unknownCostRevenue)} de ingreso
                    neto. Ese importe no se usa para calcular margen.
                  </span>
                </div>
              ) : null}

              <div className="pos-profitability__grid">
                <article className="pos-profitability__panel">
                  <div className="pos-profitability__panel-heading">
                    <div>
                      <p className="eyebrow">CATEGORÍAS</p>
                      <h3>Margen por categoría</h3>
                    </div>
                  </div>

                  {profitability.byCategory.length === 0 ? (
                    <div className="operations-empty">
                      No hay datos de rentabilidad para este período.
                    </div>
                  ) : (
                    <div className="pos-profitability__table-wrap">
                      <table className="pos-profitability__table">
                        <thead>
                          <tr>
                            <th>Categoría</th>
                            <th>Productos</th>
                            <th>Ingreso</th>
                            <th>Costo</th>
                            <th>Margen</th>
                            <th>Margen %</th>
                            <th>Cobertura</th>
                          </tr>
                        </thead>

                        <tbody>
                          {categoryPagination.items.map((row) => (
                            <tr key={row.categoryId}>
                              <td>
                                <strong>{row.categoryName}</strong>
                              </td>
                              <td>{row.productsCount}</td>
                              <td>{money(row.netRevenue)}</td>
                              <td>{money(row.costOfGoodsSold)}</td>
                              <td>
                                <strong>{money(row.grossMargin)}</strong>
                              </td>
                              <td>
                                {row.grossMarginPercent === null
                                  ? "—"
                                  : `${row.grossMarginPercent.toFixed(1)}%`}
                              </td>
                              <td>{row.costCoveragePercent.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {profitability.byCategory.length > 0 ? (
                    <ListPagination
                      page={categoryPagination.page}
                      pageSize={categoryPagination.pageSize}
                      totalPages={categoryPagination.totalPages}
                      totalItems={categoryPagination.totalItems}
                      onPageChange={categoryPagination.setPage}
                      onPageSizeChange={categoryPagination.setPageSize}
                    />
                  ) : null}
                </article>

                <article className="pos-profitability__panel">
                  <div className="pos-profitability__panel-heading">
                    <div>
                      <p className="eyebrow">PRODUCTOS</p>
                      <h3>Ranking de rentabilidad</h3>
                    </div>

                    <small>Clasificación según catálogo actual</small>
                  </div>

                  {profitability.byProduct.length === 0 ? (
                    <div className="operations-empty">
                      No hay productos vendidos en el período.
                    </div>
                  ) : (
                    <div className="pos-profitability__table-wrap">
                      <table className="pos-profitability__table pos-profitability__table--products">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Cantidad</th>
                            <th>Ingreso</th>
                            <th>Costo</th>
                            <th>Margen</th>
                            <th>Margen %</th>
                            <th>Cobertura</th>
                          </tr>
                        </thead>

                        <tbody>
                          {productPagination.items.map((row) => (
                            <tr key={row.productId}>
                              <td>
                                <div className="pos-profitability__product">
                                  <strong>{row.productName}</strong>
                                  <small>{row.sku}</small>
                                </div>
                              </td>
                              <td>{row.categoryName}</td>
                              <td>{row.quantity}</td>
                              <td>{money(row.netRevenue)}</td>
                              <td>{money(row.costOfGoodsSold)}</td>
                              <td>
                                <strong>{money(row.grossMargin)}</strong>
                              </td>
                              <td>
                                {row.grossMarginPercent === null
                                  ? "—"
                                  : `${row.grossMarginPercent.toFixed(1)}%`}
                              </td>
                              <td>{row.costCoveragePercent.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {profitability.byProduct.length > 0 ? (
                    <ListPagination
                      page={productPagination.page}
                      pageSize={productPagination.pageSize}
                      totalPages={productPagination.totalPages}
                      totalItems={productPagination.totalItems}
                      onPageChange={productPagination.setPage}
                      onPageSizeChange={productPagination.setPageSize}
                    />
                  ) : null}
                </article>
              </div>
            </section>
          ) : null}

          <section className="settings-card pos-point-profitability" data-report-view="comparisons">
            <div className="pos-point-profitability__heading">
              <div className="pos-sales-report-section-title">
                <Store size={20} />
                <div>
                  <p className="eyebrow">COMPARATIVO</p>
                  <h2>Rentabilidad entre puntos de venta</h2>
                  <p className="settings-note">
                    Compara varios POS bajo el mismo rango de fechas y la misma
                    metodología financiera.
                  </p>
                </div>
              </div>

              <div className="pos-point-profitability__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={exportPointProfitabilityCsv}
                  disabled={
                    !profitabilityByPoint ||
                    profitabilityByPoint.byPoint.length === 0
                  }
                >
                  <Download size={16} />
                  Exportar CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void loadPointProfitabilityComparison();
                  }}
                  disabled={
                    comparisonLoading || comparisonPointIds.length === 0
                  }
                >
                  {comparisonLoading ? "Comparando..." : "Comparar POS"}
                </button>
              </div>
            </div>

            <div className="pos-point-profitability__selector">
              <div className="pos-point-profitability__selector-actions">
                <strong>Puntos incluidos</strong>

                <div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setComparisonPointIds(points.map((point) => point.id))
                    }
                    disabled={comparisonLoading}
                  >
                    Todos
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setComparisonPointIds([])}
                    disabled={comparisonLoading}
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="pos-point-profitability__point-list">
                {points.map((point) => (
                  <label key={point.id} className="pos-point-profitability__point-option">
                    <input
                      type="checkbox"
                      checked={comparisonPointIds.includes(point.id)}
                      onChange={() => toggleComparisonPoint(point.id)}
                      disabled={comparisonLoading}
                    />
                    <span>
                      {point.branchName
                        ? `${point.branchName} · ${point.name}`
                        : point.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {profitabilityByPoint ? (
              <>
                <div className="pos-point-profitability__summary">
                  <article>
                    <span>POS comparados</span>
                    <strong>{profitabilityByPoint.pointsCount}</strong>
                    <small>
                      {profitabilityByPoint.dateFrom} →{" "}
                      {profitabilityByPoint.dateTo}
                    </small>
                  </article>

                  <article>
                    <span>Ventas</span>
                    <strong>{profitabilityByPoint.summary.salesCount}</strong>
                    <small>Consolidado</small>
                  </article>

                  <article>
                    <span>Ticket promedio</span>
                    <strong>
                      {money(profitabilityByPoint.summary.averageTicket)}
                    </strong>
                    <small>Sobre ingreso neto</small>
                  </article>

                  <article>
                    <span>Margen consolidado</span>
                    <strong>
                      {money(profitabilityByPoint.summary.grossMargin)}
                    </strong>
                    <small>
                      {profitabilityByPoint.summary.grossMarginPercent === null
                        ? "Margen % N/D"
                        : `${profitabilityByPoint.summary.grossMarginPercent.toFixed(
                            1,
                          )}%`}
                    </small>
                  </article>

                  <article>
                    <span>Cobertura</span>
                    <strong>
                      {profitabilityByPoint.summary.costCoveragePercent.toFixed(
                        1,
                      )}
                      %
                    </strong>
                    <small>
                      {profitabilityByPoint.summary.costCoverageStatus ===
                      "COMPLETE"
                        ? "Completa"
                        : profitabilityByPoint.summary.costCoverageStatus ===
                            "PARTIAL"
                          ? "Parcial"
                          : "Sin costo"}
                    </small>
                  </article>
                </div>

                <div className="pos-point-profitability__highlights">
                  <article>
                    <span>Mayor margen bruto</span>
                    <strong>
                      {pointComparisonHighlights.bestGrossMargin
                        ?.pointOfSaleName ?? "—"}
                    </strong>
                    <small>
                      {pointComparisonHighlights.bestGrossMargin
                        ? money(
                            pointComparisonHighlights.bestGrossMargin
                              .grossMargin,
                          )
                        : "Sin datos"}
                    </small>
                  </article>

                  <article>
                    <span>Mejor margen %</span>
                    <strong>
                      {pointComparisonHighlights.bestMarginPercent
                        ?.pointOfSaleName ?? "—"}
                    </strong>
                    <small>
                      {pointComparisonHighlights.bestMarginPercent
                        ?.grossMarginPercent === null ||
                      !pointComparisonHighlights.bestMarginPercent
                        ? "Sin datos"
                        : `${pointComparisonHighlights.bestMarginPercent.grossMarginPercent.toFixed(
                            1,
                          )}%`}
                    </small>
                  </article>

                  <article>
                    <span>Cobertura incompleta</span>
                    <strong>
                      {pointComparisonHighlights.incompleteCoverageCount}
                    </strong>
                    <small>POS que requieren revisión de costo</small>
                  </article>
                </div>

                {profitabilityByPoint.byPoint.length === 0 ? (
                  <div className="operations-empty">
                    No hay datos comparables en el período.
                  </div>
                ) : (
                  <>
                    <div className="pos-point-profitability__table-wrap">
                      <table className="pos-point-profitability__table">
                        <thead>
                          <tr>
                            <th>POS</th>
                            <th>Ventas</th>
                            <th>Ticket promedio</th>
                            <th>Ingreso neto</th>
                            <th>Costo</th>
                            <th>Margen</th>
                            <th>Margen %</th>
                            <th>Cobertura</th>
                            <th>Estado</th>
                          </tr>
                        </thead>

                        <tbody>
                          {pointProfitabilityPagination.items.map((row) => (
                            <tr key={row.pointOfSaleId}>
                              <td>
                                <strong>{row.pointOfSaleName}</strong>
                              </td>
                              <td>{row.salesCount}</td>
                              <td>{money(row.averageTicket)}</td>
                              <td>{money(row.netRevenue)}</td>
                              <td>{money(row.costOfGoodsSold)}</td>
                              <td>
                                <strong>{money(row.grossMargin)}</strong>
                              </td>
                              <td>
                                {row.grossMarginPercent === null
                                  ? "—"
                                  : `${row.grossMarginPercent.toFixed(1)}%`}
                              </td>
                              <td>{row.costCoveragePercent.toFixed(1)}%</td>
                              <td>
                                <span
                                  className={
                                    row.costCoverageStatus === "COMPLETE"
                                      ? "pos-point-profitability__status pos-point-profitability__status--complete"
                                      : row.costCoverageStatus === "PARTIAL"
                                        ? "pos-point-profitability__status pos-point-profitability__status--partial"
                                        : "pos-point-profitability__status pos-point-profitability__status--missing"
                                  }
                                >
                                  {row.costCoverageStatus === "COMPLETE"
                                    ? "Completa"
                                    : row.costCoverageStatus === "PARTIAL"
                                      ? "Parcial"
                                      : "Sin costo"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <ListPagination
                      page={pointProfitabilityPagination.page}
                      pageSize={pointProfitabilityPagination.pageSize}
                      totalPages={pointProfitabilityPagination.totalPages}
                      totalItems={pointProfitabilityPagination.totalItems}
                      onPageChange={pointProfitabilityPagination.setPage}
                      onPageSizeChange={
                        pointProfitabilityPagination.setPageSize
                      }
                    />
                  </>
                )}
              </>
            ) : (
              <div className="operations-empty">
                Selecciona los puntos de venta y ejecuta la comparación.
              </div>
            )}
          </section>

          {operationalProfitability ? (
            <section className="settings-card pos-operational-profitability" data-report-view="operations">
              <div className="pos-operational-profitability__heading">
                <div className="pos-sales-report-section-title">
                  <WalletCards size={20} />
                  <div>
                    <p className="eyebrow">OPERACIÓN</p>
                    <h2>Rentabilidad por cajero y turno</h2>
                    <p className="settings-note">
                      Atribución según la sesión de caja que procesó el pago. No
                      representa necesariamente quién originó la venta.
                    </p>
                  </div>
                </div>

                <div className="pos-operational-profitability__exports">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={exportOperationalEmployeesCsv}
                    disabled={operationalProfitability.byEmployee.length === 0}
                  >
                    <Download size={16} />
                    CSV empleados
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={exportOperationalShiftsCsv}
                    disabled={operationalProfitability.byShift.length === 0}
                  >
                    <Download size={16} />
                    CSV turnos
                  </button>
                </div>
              </div>

              <div className="pos-operational-profitability__summary">
                <article>
                  <span>Empleados</span>
                  <strong>{operationalSummary.employeesCount}</strong>
                  <small>Con ventas atribuidas</small>
                </article>

                <article>
                  <span>Turnos</span>
                  <strong>{operationalSummary.shiftsCount}</strong>
                  <small>Sesiones de caja con ventas</small>
                </article>

                <article>
                  <span>Ventas atribuidas</span>
                  <strong>{operationalSummary.attributedSales}</strong>
                  <small>Por Payment → CashSession</small>
                </article>

                <article>
                  <span>Sin atribuir</span>
                  <strong>
                    {operationalProfitability.unattributedSalesCount}
                  </strong>
                  <small>Ventas sin sesión de caja asociada</small>
                </article>

                <article>
                  <span>Mayor margen</span>
                  <strong>
                    {operationalSummary.topEmployee?.employeeName ?? "—"}
                  </strong>
                  <small>
                    {operationalSummary.topEmployee
                      ? money(operationalSummary.topEmployee.grossMargin)
                      : "Sin datos"}
                  </small>
                </article>
              </div>

              {operationalProfitability.unattributedSalesCount > 0 ? (
                <div className="pos-operational-profitability__warning">
                  <strong>Existen ventas sin atribución operativa.</strong>
                  <span>
                    Revisa que todos los cobros POS queden vinculados a una
                    sesión de caja válida.
                  </span>
                </div>
              ) : null}

              <div className="pos-operational-profitability__panel">
                <div className="pos-operational-profitability__panel-heading">
                  <div>
                    <p className="eyebrow">EMPLEADOS</p>
                    <h3>Ranking por cajero</h3>
                  </div>

                  <small>Ordenado por margen bruto</small>
                </div>

                {operationalProfitability.byEmployee.length === 0 ? (
                  <div className="operations-empty">
                    No hay ventas atribuidas a empleados en este período.
                  </div>
                ) : (
                  <>
                    <div className="pos-operational-profitability__table-wrap">
                      <table className="pos-operational-profitability__table">
                        <thead>
                          <tr>
                            <th>Empleado</th>
                            <th>Sesiones</th>
                            <th>Ventas</th>
                            <th>Ingreso neto</th>
                            <th>Costo</th>
                            <th>Margen</th>
                            <th>Margen %</th>
                            <th>Cobertura</th>
                          </tr>
                        </thead>

                        <tbody>
                          {employeeProfitabilityPagination.items.map((row) => (
                            <tr key={row.employeeId}>
                              <td>
                                <div className="pos-operational-profitability__employee">
                                  <strong>{row.employeeName}</strong>
                                  <small>{row.employeeNo}</small>
                                </div>
                              </td>
                              <td>{row.sessionsCount}</td>
                              <td>{row.salesCount}</td>
                              <td>{money(row.netRevenue)}</td>
                              <td>{money(row.costOfGoodsSold)}</td>
                              <td>
                                <strong>{money(row.grossMargin)}</strong>
                              </td>
                              <td>
                                {row.grossMarginPercent === null
                                  ? "—"
                                  : `${row.grossMarginPercent.toFixed(1)}%`}
                              </td>
                              <td>{row.costCoveragePercent.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <ListPagination
                      page={employeeProfitabilityPagination.page}
                      pageSize={employeeProfitabilityPagination.pageSize}
                      totalPages={employeeProfitabilityPagination.totalPages}
                      totalItems={employeeProfitabilityPagination.totalItems}
                      onPageChange={employeeProfitabilityPagination.setPage}
                      onPageSizeChange={
                        employeeProfitabilityPagination.setPageSize
                      }
                    />
                  </>
                )}
              </div>

              <div className="pos-operational-profitability__panel">
                <div className="pos-operational-profitability__panel-heading">
                  <div>
                    <p className="eyebrow">TURNOS</p>
                    <h3>Sesiones de caja</h3>
                  </div>

                  <small>Apertura, cierre y resultado operativo</small>
                </div>

                {operationalProfitability.byShift.length === 0 ? (
                  <div className="operations-empty">
                    No hay turnos con ventas atribuidas en este período.
                  </div>
                ) : (
                  <>
                    <div className="pos-operational-profitability__table-wrap">
                      <table className="pos-operational-profitability__table pos-operational-profitability__table--shifts">
                        <thead>
                          <tr>
                            <th>Cajero</th>
                            <th>Caja</th>
                            <th>Apertura</th>
                            <th>Cierre</th>
                            <th>Estado</th>
                            <th>Ventas</th>
                            <th>Ingreso</th>
                            <th>Costo</th>
                            <th>Margen</th>
                            <th>Margen %</th>
                            <th>Cobertura</th>
                          </tr>
                        </thead>

                        <tbody>
                          {shiftProfitabilityPagination.items.map((row) => (
                            <tr key={row.cashSessionId}>
                              <td>
                                <div className="pos-operational-profitability__employee">
                                  <strong>{row.employeeName}</strong>
                                  <small>{row.employeeNo}</small>
                                </div>
                              </td>
                              <td>{row.cashRegisterName}</td>
                              <td>
                                {new Date(row.openedAt).toLocaleString("es-DO")}
                              </td>
                              <td>
                                {row.closedAt
                                  ? new Date(row.closedAt).toLocaleString(
                                      "es-DO",
                                    )
                                  : "—"}
                              </td>
                              <td>
                                <span
                                  className={
                                    row.status === "OPEN"
                                      ? "pos-operational-profitability__status pos-operational-profitability__status--open"
                                      : "pos-operational-profitability__status"
                                  }
                                >
                                  {row.status === "OPEN"
                                    ? "Abierto"
                                    : "Cerrado"}
                                </span>
                              </td>
                              <td>{row.salesCount}</td>
                              <td>{money(row.netRevenue)}</td>
                              <td>{money(row.costOfGoodsSold)}</td>
                              <td>
                                <strong>{money(row.grossMargin)}</strong>
                              </td>
                              <td>
                                {row.grossMarginPercent === null
                                  ? "—"
                                  : `${row.grossMarginPercent.toFixed(1)}%`}
                              </td>
                              <td>{row.costCoveragePercent.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <ListPagination
                      page={shiftProfitabilityPagination.page}
                      pageSize={shiftProfitabilityPagination.pageSize}
                      totalPages={shiftProfitabilityPagination.totalPages}
                      totalItems={shiftProfitabilityPagination.totalItems}
                      onPageChange={shiftProfitabilityPagination.setPage}
                      onPageSizeChange={
                        shiftProfitabilityPagination.setPageSize
                      }
                    />
                  </>
                )}
              </div>
            </section>
          ) : null}

          {profitabilityEvaluation ? (
            <section className="settings-card pos-profitability-policy" data-report-view="controls">
              <div className="pos-sales-report-section-title">
                <DollarSign size={20} />
                <div>
                  <p className="eyebrow">POLÍTICA</p>
                  <h2>Umbrales de rentabilidad</h2>
                  <p className="settings-note">
                    Estas reglas controlan las alertas del reporte para el punto
                    de venta seleccionado.
                  </p>
                </div>
              </div>

              <div className="pos-profitability-policy__grid">
                <label className="pos-profitability-policy__switch">
                  <input
                    type="checkbox"
                    checked={policyDraft.enabled}
                    onChange={(event) =>
                      setPolicyDraft((current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                    disabled={policySaving}
                  />
                  <span>
                    <strong>Evaluación activa</strong>
                    <small>
                      Desactiva todas las alertas sin eliminar la política.
                    </small>
                  </span>
                </label>

                <label>
                  Margen bruto mínimo %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={policyDraft.minimumGrossMarginPercent}
                    onChange={(event) =>
                      setPolicyDraft((current) => ({
                        ...current,
                        minimumGrossMarginPercent: Number(event.target.value),
                      }))
                    }
                    disabled={policySaving}
                  />
                </label>

                <label>
                  Cobertura mínima de costo %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={policyDraft.minimumCostCoveragePercent}
                    onChange={(event) =>
                      setPolicyDraft((current) => ({
                        ...current,
                        minimumCostCoveragePercent: Number(event.target.value),
                      }))
                    }
                    disabled={policySaving}
                  />
                </label>

                <label className="pos-profitability-policy__switch">
                  <input
                    type="checkbox"
                    checked={policyDraft.alertLowMarginEnabled}
                    onChange={(event) =>
                      setPolicyDraft((current) => ({
                        ...current,
                        alertLowMarginEnabled: event.target.checked,
                      }))
                    }
                    disabled={policySaving}
                  />
                  <span>
                    <strong>Alertar margen bajo</strong>
                    <small>Evalúa período, productos, categorías y días.</small>
                  </span>
                </label>

                <label className="pos-profitability-policy__switch">
                  <input
                    type="checkbox"
                    checked={policyDraft.alertIncompleteCostEnabled}
                    onChange={(event) =>
                      setPolicyDraft((current) => ({
                        ...current,
                        alertIncompleteCostEnabled: event.target.checked,
                      }))
                    }
                    disabled={policySaving}
                  />
                  <span>
                    <strong>Alertar costo incompleto</strong>
                    <small>
                      Señala cobertura inferior al mínimo configurado.
                    </small>
                  </span>
                </label>

                <div className="pos-profitability-policy__actions">
                  <button
                    type="button"
                    onClick={() => {
                      void saveProfitabilityPolicy();
                    }}
                    disabled={policySaving}
                  >
                    {policySaving ? "Guardando..." : "Guardar política"}
                  </button>

                  {policyNotice ? <span>{policyNotice}</span> : null}
                </div>
              </div>

              <div className="pos-profitability-policy__evaluation">
                <article>
                  <span>Alertas</span>
                  <strong>{profitabilityEvaluation.summary.totalAlerts}</strong>
                </article>
                <article>
                  <span>Margen bajo</span>
                  <strong>
                    {profitabilityEvaluation.summary.lowMarginAlerts}
                  </strong>
                </article>
                <article>
                  <span>Costo incompleto</span>
                  <strong>
                    {profitabilityEvaluation.summary.incompleteCostAlerts}
                  </strong>
                </article>
                <article>
                  <span>Productos afectados</span>
                  <strong>
                    {profitabilityEvaluation.summary.affectedProducts}
                  </strong>
                </article>
                <article>
                  <span>Categorías afectadas</span>
                  <strong>
                    {profitabilityEvaluation.summary.affectedCategories}
                  </strong>
                </article>
                <article>
                  <span>Días afectados</span>
                  <strong>
                    {profitabilityEvaluation.summary.affectedDays}
                  </strong>
                </article>
              </div>

              {profitabilityEvaluation.alerts.length > 0 ? (
                <div className="pos-profitability-policy__alerts">
                  {alertPagination.items.map((alert, index) => (
                    <article
                      key={`${alert.scope}:${alert.type}:${
                        alert.entityId ?? alert.date ?? index
                      }`}
                    >
                      <div>
                        <strong>{alert.entityName}</strong>
                        <span>
                          {alert.scope === "SUMMARY"
                            ? "Período"
                            : alert.scope === "PRODUCT"
                              ? "Producto"
                              : alert.scope === "CATEGORY"
                                ? "Categoría"
                                : "Día"}
                        </span>
                      </div>

                      <div>
                        <b>
                          {alert.type === "LOW_MARGIN"
                            ? "Margen bajo"
                            : "Costo incompleto"}
                        </b>
                        <span>{alert.message}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="operations-empty">
                  No hay alertas para la política y período actuales.
                </div>
              )}

              {profitabilityEvaluation.alerts.length > 0 ? (
                <ListPagination
                  page={alertPagination.page}
                  pageSize={alertPagination.pageSize}
                  totalPages={alertPagination.totalPages}
                  totalItems={alertPagination.totalItems}
                  onPageChange={alertPagination.setPage}
                  onPageSizeChange={alertPagination.setPageSize}
                />
              ) : null}
            </section>
          ) : null}

          {profitability ? (
            <section className="settings-card pos-profitability-insights" data-report-view="controls">
              <div className="pos-sales-report-section-title">
                <DollarSign size={20} />
                <div>
                  <p className="eyebrow">INSIGHTS</p>
                  <h2>Lectura ejecutiva de rentabilidad</h2>
                  <p className="settings-note">
                    Señales rápidas para priorizar productos, costos y margen.
                  </p>
                </div>
              </div>

              <div className="pos-profitability-insights__summary">
                <article>
                  <span>Mayor contribución</span>
                  <strong>{topMarginProducts[0]?.productName ?? "—"}</strong>
                  <small>
                    {topMarginProducts[0]
                      ? money(topMarginProducts[0].grossMargin)
                      : "Sin datos"}
                  </small>
                </article>

                <article>
                  <span>Categoría líder</span>
                  <strong>{topCategory?.categoryName ?? "—"}</strong>
                  <small>
                    {topCategory ? money(topCategory.grossMargin) : "Sin datos"}
                  </small>
                </article>

                <article>
                  <span>Bajo margen</span>
                  <strong>{lowMarginProducts.length}</strong>
                  <small>Productos bajo el margen mínimo configurado</small>
                </article>

                <article>
                  <span>Costo incompleto</span>
                  <strong>{productsWithoutCost.length}</strong>
                  <small>Productos con líneas sin costo</small>
                </article>
              </div>

              <div className="pos-profitability-insights__grid">
                <article className="pos-profitability-insights__panel">
                  <div>
                    <p className="eyebrow">TOP 5</p>
                    <h3>Mayor aporte de margen</h3>
                  </div>

                  {topMarginProducts.length === 0 ? (
                    <div className="operations-empty">
                      No hay margen calculable en este período.
                    </div>
                  ) : (
                    <div className="pos-profitability-insights__list">
                      {topMarginProducts.map((row, index) => (
                        <div key={row.productId}>
                          <span className="pos-profitability-insights__rank">
                            {index + 1}
                          </span>
                          <div>
                            <strong>{row.productName}</strong>
                            <small>{row.categoryName}</small>
                          </div>
                          <div className="pos-profitability-insights__amount">
                            <strong>{money(row.grossMargin)}</strong>
                            <small>
                              {row.grossMarginPercent === null
                                ? "—"
                                : `${row.grossMarginPercent.toFixed(1)}%`}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="pos-profitability-insights__panel">
                  <div>
                    <p className="eyebrow">ATENCIÓN</p>
                    <h3>Productos bajo el margen mínimo</h3>
                  </div>

                  {lowMarginProducts.length === 0 ? (
                    <div className="operations-empty">
                      No hay productos por debajo del margen mínimo configurado.
                    </div>
                  ) : (
                    <div className="pos-profitability-insights__list">
                      {lowMarginProducts.map((row) => (
                        <div key={row.productId}>
                          <div>
                            <strong>{row.productName}</strong>
                            <small>Ingreso {money(row.netRevenue)}</small>
                          </div>
                          <div className="pos-profitability-insights__amount">
                            <strong>
                              {row.grossMarginPercent?.toFixed(1)}%
                            </strong>
                            <small>{money(row.grossMargin)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="pos-profitability-insights__panel">
                  <div>
                    <p className="eyebrow">CALIDAD DE DATOS</p>
                    <h3>Productos con costo incompleto</h3>
                  </div>

                  {productsWithoutCost.length === 0 ? (
                    <div className="operations-empty">
                      Todos los productos vendidos tienen costo histórico.
                    </div>
                  ) : (
                    <div className="pos-profitability-insights__list">
                      {productsWithoutCost.map((row) => (
                        <div key={row.productId}>
                          <div>
                            <strong>{row.productName}</strong>
                            <small>
                              {row.unknownCostLines}{" "}
                              {row.unknownCostLines === 1
                                ? "línea sin costo"
                                : "líneas sin costo"}
                            </small>
                          </div>
                          <div className="pos-profitability-insights__amount">
                            <strong>{money(row.unknownCostRevenue)}</strong>
                            <small>
                              Cobertura {row.costCoveragePercent.toFixed(1)}%
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {profitabilityTrend ? (
            <section className="settings-card pos-profitability-trend" data-report-view="trends">
              <div className="pos-sales-report-section-title">
                <BarChart3 size={20} />
                <div>
                  <p className="eyebrow">RENTABILIDAD</p>
                  <h2>Evolución de margen y cobertura</h2>
                  <p className="settings-note">
                    Seguimiento diario de ingreso neto, costo vendido, margen
                    bruto y calidad de cobertura de costo.
                  </p>
                </div>
              </div>

              <ProfitabilityTrendChart points={profitabilityTrendPoints} />

              <div className="pos-profitability-trend__grid">
                <article className="pos-profitability-trend__panel">
                  <div className="pos-profitability-trend__panel-heading">
                    <div>
                      <p className="eyebrow">MARGEN %</p>
                      <h3>Evolución diaria</h3>
                    </div>
                  </div>

                  <div className="pos-profitability-trend__bars">
                    {profitabilityDayPagination.items.map((row) => (
                      <div
                        className="pos-profitability-trend__bar-row"
                        key={row.date}
                      >
                        <span>
                          {new Date(`${row.date}T00:00:00`).toLocaleDateString(
                            "es-DO",
                            {
                              day: "2-digit",
                              month: "2-digit",
                            },
                          )}
                        </span>

                        <div className="pos-profitability-trend__bar-track">
                          <div
                            className="pos-profitability-trend__bar-fill"
                            style={{
                              width: `${
                                row.grossMarginPercent === null
                                  ? 0
                                  : Math.max(
                                      0,
                                      Math.min(100, row.grossMarginPercent),
                                    )
                              }%`,
                            }}
                          />
                        </div>

                        <strong>
                          {row.grossMarginPercent === null
                            ? "—"
                            : `${row.grossMarginPercent.toFixed(1)}%`}
                        </strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="pos-profitability-trend__panel">
                  <div className="pos-profitability-trend__panel-heading">
                    <div>
                      <p className="eyebrow">COBERTURA</p>
                      <h3>Calidad del costo</h3>
                    </div>
                  </div>

                  <div className="pos-profitability-trend__coverage-list">
                    {profitabilityDayPagination.items.map((row) => (
                      <div
                        key={row.date}
                        className="pos-profitability-trend__coverage-row"
                      >
                        <span>
                          {new Date(`${row.date}T00:00:00`).toLocaleDateString(
                            "es-DO",
                          )}
                        </span>

                        <strong>{row.costCoveragePercent.toFixed(1)}%</strong>

                        <b
                          className={
                            row.costCoverageStatus === "COMPLETE"
                              ? "pos-profitability-trend__status pos-profitability-trend__status--complete"
                              : row.costCoverageStatus === "PARTIAL"
                                ? "pos-profitability-trend__status pos-profitability-trend__status--partial"
                                : "pos-profitability-trend__status pos-profitability-trend__status--missing"
                          }
                        >
                          {row.costCoverageStatus === "COMPLETE"
                            ? "Completa"
                            : row.costCoverageStatus === "PARTIAL"
                              ? "Parcial"
                              : "Sin costo"}
                        </b>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              {profitabilityTrendAlerts.length > 0 ? (
                <div className="pos-profitability-trend__alerts">
                  <div>
                    <strong>Atención gerencial</strong>
                    <span>
                      Alertas generadas según la política configurada para este
                      punto de venta.
                    </span>
                  </div>

                  <div className="pos-profitability-trend__alert-list">
                    {profitabilityTrendAlerts.map((alert, index) => (
                      <span key={`${alert.type}:${alert.date ?? index}`}>
                        {alert.date
                          ? new Date(
                              `${alert.date}T00:00:00`,
                            ).toLocaleDateString("es-DO")
                          : alert.entityName}
                        {" · "}
                        {alert.type === "LOW_MARGIN"
                          ? "Margen"
                          : "Cobertura"}{" "}
                        {alert.actualValue.toFixed(1)}%{" · mínimo "}
                        {alert.thresholdValue.toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="pos-profitability-trend__table-wrap">
                <table className="pos-profitability-trend__table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Ingreso neto</th>
                      <th>Costo</th>
                      <th>Margen</th>
                      <th>Margen %</th>
                      <th>Sin costo</th>
                      <th>Cobertura</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {profitabilityDayPagination.items.map((row) => (
                      <tr key={row.date}>
                        <td>
                          <strong>
                            {new Date(
                              `${row.date}T00:00:00`,
                            ).toLocaleDateString("es-DO")}
                          </strong>
                        </td>
                        <td>{money(row.netRevenue)}</td>
                        <td>{money(row.costOfGoodsSold)}</td>
                        <td>
                          <strong>{money(row.grossMargin)}</strong>
                        </td>
                        <td>
                          {row.grossMarginPercent === null
                            ? "—"
                            : `${row.grossMarginPercent.toFixed(1)}%`}
                        </td>
                        <td>{money(row.unknownCostRevenue)}</td>
                        <td>{row.costCoveragePercent.toFixed(1)}%</td>
                        <td>
                          {row.costCoverageStatus === "COMPLETE"
                            ? "Completa"
                            : row.costCoverageStatus === "PARTIAL"
                              ? "Parcial"
                              : "Sin costo"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {profitabilityTrend.byDay.length > 0 ? (
                <ListPagination
                  page={profitabilityDayPagination.page}
                  pageSize={profitabilityDayPagination.pageSize}
                  totalPages={profitabilityDayPagination.totalPages}
                  totalItems={profitabilityDayPagination.totalItems}
                  onPageChange={profitabilityDayPagination.setPage}
                  onPageSizeChange={profitabilityDayPagination.setPageSize}
                />
              ) : null}
            </section>
          ) : null}

          {trend ? (
            <section className="settings-card pos-sales-charts" data-report-view="trends">
              <div className="pos-sales-report-section-title">
                <BarChart3 size={20} />
                <div>
                  <p className="eyebrow">VISUALIZACIÓN</p>
                  <h2>Tendencias del período</h2>
                  <p className="settings-note">
                    Evolución diaria del total vendido y del ticket promedio.
                  </p>
                </div>
              </div>

              <div className="pos-sales-charts__grid">
                <TrendLineChart
                  title="Ventas totales"
                  subtitle="Total vendido por día"
                  points={totalTrendPoints}
                  valueFormatter={money}
                />

                <TrendLineChart
                  title="Ticket promedio"
                  subtitle="Importe promedio por transacción"
                  points={averageTicketTrendPoints}
                  valueFormatter={money}
                />
              </div>
            </section>
          ) : null}

          {trend ? (
            <section className="settings-card pos-sales-trend" data-report-view="trends">
              <div className="pos-sales-report-section-title">
                <BarChart3 size={20} />
                <div>
                  <p className="eyebrow">TENDENCIA</p>
                  <h2>Evolución diaria</h2>
                  <p className="settings-note">
                    {trend.dateFrom} → {trend.dateTo}
                  </p>
                </div>
              </div>

              <div className="pos-sales-trend__table-wrap">
                <table className="pos-sales-trend__table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Ventas</th>
                      <th>Subtotal</th>
                      <th>ITBIS</th>
                      <th>Servicio</th>
                      <th>Total</th>
                      <th>Ticket promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesDayPagination.items.map((row) => (
                      <tr key={row.date}>
                        <td>
                          <strong>
                            {new Date(
                              `${row.date}T00:00:00`,
                            ).toLocaleDateString("es-DO")}
                          </strong>
                        </td>
                        <td>{row.salesCount}</td>
                        <td>{money(row.subtotal)}</td>
                        <td>{money(row.taxAmount)}</td>
                        <td>{money(row.serviceChargeAmount)}</td>
                        <td>
                          <strong>{money(row.total)}</strong>
                        </td>
                        <td>{money(row.averageTicket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {trend.byDay.length > 0 ? (
                <ListPagination
                  page={salesDayPagination.page}
                  pageSize={salesDayPagination.pageSize}
                  totalPages={salesDayPagination.totalPages}
                  totalItems={salesDayPagination.totalItems}
                  onPageChange={salesDayPagination.setPage}
                  onPageSizeChange={salesDayPagination.setPageSize}
                />
              ) : null}
            </section>
          ) : null}

          <section className="settings-card pos-sales-transactions" data-report-view="transactions">
            <div className="pos-sales-report-section-title">
              <ReceiptText size={20} />
              <div>
                <p className="eyebrow">AUDITORÍA</p>
                <h2>Detalle de transacciones</h2>
              </div>
            </div>

            <div className="pos-sales-transactions__filters">
              <label>
                Buscar
                <input
                  type="search"
                  value={transactionQuery}
                  onChange={(event) => setTransactionQuery(event.target.value)}
                  placeholder="Referencia, cliente o método"
                />
              </label>

              <label>
                Tipo
                <select
                  value={transactionType}
                  onChange={(event) =>
                    setTransactionType(
                      event.target.value as "" | PosSalesTransactionType,
                    )
                  }
                >
                  <option value="">Todos</option>
                  <option value="DIRECT">Venta directa</option>
                  <option value="ACCOUNT">Cuenta HOLD</option>
                </select>
              </label>

              <label>
                Modalidad
                <select
                  value={saleModeFilter}
                  onChange={(event) =>
                    setSaleModeFilter(event.target.value as "" | PosSaleMode)
                  }
                >
                  <option value="">Todas</option>
                  <option value="DINE_IN">Consumo local</option>
                  <option value="TAKEAWAY">Para llevar</option>
                  <option value="DIRECT">Venta directa</option>
                </select>
              </label>

              <label>
                Método de pago
                <select
                  value={paymentMethodFilter}
                  onChange={(event) =>
                    setPaymentMethodFilter(event.target.value)
                  }
                >
                  <option value="">Todos</option>
                  {paymentMethodOptions.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pos-sales-transactions__meta">
              <span>
                {filteredTransactions.length}{" "}
                {filteredTransactions.length === 1
                  ? "transacción"
                  : "transacciones"}
              </span>

              {transactionQuery ||
              transactionType ||
              saleModeFilter ||
              paymentMethodFilter ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setTransactionQuery("");
                    setTransactionType("");
                    setSaleModeFilter("");
                    setPaymentMethodFilter("");
                  }}
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="operations-empty">
                No hay transacciones que coincidan con los filtros.
              </div>
            ) : (
              <div className="pos-sales-transactions__table-wrap">
                <table className="pos-sales-transactions__table">
                  <thead>
                    <tr>
                      <th>Fecha / hora</th>
                      <th>Referencia</th>
                      <th>Tipo</th>
                      <th>Modalidad</th>
                      <th>Cliente</th>
                      <th>Método</th>
                      <th>Subtotal</th>
                      <th>ITBIS</th>
                      <th>Servicio</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactionPagination.items.map((transaction) => (
                      <tr
                        key={`${transaction.transactionType}:${transaction.id}`}
                      >
                        <td>
                          {new Date(transaction.paidAt).toLocaleString("es-DO")}
                        </td>
                        <td>
                          <strong>{transaction.reference}</strong>
                        </td>
                        <td>
                          {transactionTypeLabel(transaction.transactionType)}
                        </td>
                        <td>{saleModeLabel(transaction.saleMode)}</td>
                        <td>{transaction.customerAlias || "—"}</td>
                        <td>{transaction.paymentMethodName || "—"}</td>
                        <td>{money(transaction.subtotal)}</td>
                        <td>{money(transaction.taxAmount)}</td>
                        <td>{money(transaction.serviceChargeAmount)}</td>
                        <td>
                          <strong>{money(transaction.total)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredTransactions.length > 0 ? (
              <ListPagination
                page={transactionPagination.page}
                pageSize={transactionPagination.pageSize}
                totalPages={transactionPagination.totalPages}
                totalItems={transactionPagination.totalItems}
                onPageChange={transactionPagination.setPage}
                onPageSizeChange={transactionPagination.setPageSize}
              />
            ) : null}
          </section>

          {activeReport === "shift-items" ? (
            <section
              className="settings-card pos-shift-items-report"
              data-report-view="shift-items"
            >
              <div className="pos-sales-report-section-title">
                <PackageSearch size={20} />
                <div>
                  <p className="eyebrow">ARTÍCULOS POR TURNO</p>
                  <h2>Productos vendidos por sesión de caja</h2>
                  <p className="settings-note">
                    La atribución utiliza la sesión de caja que procesó el pago.
                  </p>
                </div>
              </div>

              {!operationalProfitability ||
              operationalProfitability.byShift.length === 0 ? (
                <div className="operations-empty">
                  No hay turnos con ventas atribuidas en este período.
                </div>
              ) : (
                <div className="pos-shift-items-report__list">
                  {operationalProfitability.byShift.map((shift) => (
                    <article
                      className="pos-shift-items-report__shift"
                      key={shift.cashSessionId}
                    >
                      <header>
                        <div>
                          <strong>{shift.employeeName}</strong>
                          <span>
                            {shift.cashRegisterName} · {shift.employeeNo}
                          </span>
                        </div>

                        <div>
                          <strong>{money(shift.netRevenue)}</strong>
                          <span>
                            {new Date(shift.openedAt).toLocaleString("es-DO")}
                          </span>
                        </div>
                      </header>

                      {shift.items.length === 0 ? (
                        <div className="operations-empty">
                          No hay artículos asociados a este turno.
                        </div>
                      ) : (
                        <div className="pos-shift-items-report__table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Artículo</th>
                                <th>SKU</th>
                                <th>Cantidad</th>
                                <th>Ingreso</th>
                                <th>Costo</th>
                                <th>Margen</th>
                                <th>Margen %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {shift.items.map((item) => (
                                <tr key={item.productId}>
                                  <td>
                                    <strong>{item.productName}</strong>
                                  </td>
                                  <td>{item.sku}</td>
                                  <td>{item.quantity}</td>
                                  <td>{money(item.netRevenue)}</td>
                                  <td>
                                    {item.costOfGoodsSold === null
                                      ? "—"
                                      : money(item.costOfGoodsSold)}
                                  </td>
                                  <td>
                                    {item.grossMargin === null
                                      ? "—"
                                      : money(item.grossMargin)}
                                  </td>
                                  <td>
                                    {item.grossMarginPercent === null
                                      ? "—"
                                      : `${item.grossMarginPercent.toFixed(1)}%`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <p className="pos-sales-report-generated">
            Generado: {new Date(report.generatedAt).toLocaleString("es-DO")}
          </p>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
