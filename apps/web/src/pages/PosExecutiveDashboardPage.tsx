import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Gauge,
  House,
  DollarSign,
  RefreshCcw,
  Store,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  PointOfSaleResponse,
  PosDailySalesReportResponse,
  PosOperationalProfitabilityReportResponse,
  PosProfitabilityByPointReportResponse,
  PosProfitabilityEvaluationResponse,
  PosProfitabilityReportResponse,
} from '@cactus/shared';
import { api } from '../lib/api';
import { POS_ROUTES } from '../routes/posRoutes';

function todayValue(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

function money(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type DashboardSection =
  | 'sales'
  | 'profitability'
  | 'evaluation'
  | 'operational'
  | 'multiPoint';

type DashboardSectionStatus = {
  loading: boolean;
  error: string;
};

const EMPTY_SECTION_STATUS: Record<
  DashboardSection,
  DashboardSectionStatus
> = {
  sales: { loading: false, error: '' },
  profitability: { loading: false, error: '' },
  evaluation: { loading: false, error: '' },
  operational: { loading: false, error: '' },
  multiPoint: { loading: false, error: '' },
};

export function PosExecutiveDashboardPage() {
  const navigate = useNavigate();

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [pointOfSaleId, setPointOfSaleId] = useState('');
  const [dateFrom, setDateFrom] = useState(todayValue());
  const [dateTo, setDateTo] = useState(todayValue());

  const [sales, setSales] =
    useState<PosDailySalesReportResponse | null>(null);
  const [profitability, setProfitability] =
    useState<PosProfitabilityReportResponse | null>(null);
  const [evaluation, setEvaluation] =
    useState<PosProfitabilityEvaluationResponse | null>(null);
  const [operational, setOperational] =
    useState<PosOperationalProfitabilityReportResponse | null>(
      null,
    );
  const [multiPoint, setMultiPoint] =
    useState<PosProfitabilityByPointReportResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [consulting, setConsulting] = useState(false);
  const [error, setError] = useState('');
  const [sectionStatus, setSectionStatus] =
    useState<Record<DashboardSection, DashboardSectionStatus>>(
      EMPTY_SECTION_STATUS,
    );

  const pointName = useMemo(
    () =>
      points.find((point) => point.id === pointOfSaleId)?.name ??
      '',
    [points, pointOfSaleId],
  );

  const topEmployee = useMemo(
    () => operational?.byEmployee[0] ?? null,
    [operational],
  );

  const topProduct = useMemo(
    () => profitability?.byProduct[0] ?? null,
    [profitability],
  );

  const topPoint = useMemo(
    () => multiPoint?.byPoint[0] ?? null,
    [multiPoint],
  );

  function sectionState(
    section: DashboardSection,
  ): DashboardSectionStatus {
    return sectionStatus[section];
  }

  function SectionFallback({
    section,
    emptyMessage,
  }: {
    section: DashboardSection;
    emptyMessage: string;
  }) {
    const status = sectionState(section);

    if (status.loading) {
      return (
        <div className="pos-executive-dashboard__section-state">
          Cargando...
        </div>
      );
    }

    if (status.error) {
      return (
        <div className="pos-executive-dashboard__section-state pos-executive-dashboard__section-state--error">
          <strong>No disponible</strong>
          <span>{status.error}</span>
        </div>
      );
    }

    return (
      <div className="pos-executive-dashboard__section-state">
        {emptyMessage}
      </div>
    );
  }

  async function loadDashboard(
    nextPointOfSaleId: string,
    nextDateFrom: string,
    nextDateTo: string,
    allPointIds: string[],
  ): Promise<void> {
    const sections: DashboardSection[] = [
      'sales',
      'profitability',
      'evaluation',
      'operational',
      'multiPoint',
    ];

    setSectionStatus((current) => {
      const next = { ...current };

      for (const section of sections) {
        next[section] = {
          loading: true,
          error: '',
        };
      }

      return next;
    });

    const results = await Promise.allSettled([
      api.posDailySalesReport(
        nextPointOfSaleId,
        nextDateFrom,
        nextDateTo,
      ),
      api.posProfitabilityReport(
        nextPointOfSaleId,
        nextDateFrom,
        nextDateTo,
      ),
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
      api.posProfitabilityByPoint(
        allPointIds,
        nextDateFrom,
        nextDateTo,
      ),
    ]);

    const [
      salesResult,
      profitabilityResult,
      evaluationResult,
      operationalResult,
      multiPointResult,
    ] = results;

    if (salesResult.status === 'fulfilled') {
      setSales(salesResult.value);
    } else {
      setSales(null);
    }

    if (profitabilityResult.status === 'fulfilled') {
      setProfitability(profitabilityResult.value);
    } else {
      setProfitability(null);
    }

    if (evaluationResult.status === 'fulfilled') {
      setEvaluation(evaluationResult.value);
    } else {
      setEvaluation(null);
    }

    if (operationalResult.status === 'fulfilled') {
      setOperational(operationalResult.value);
    } else {
      setOperational(null);
    }

    if (multiPointResult.status === 'fulfilled') {
      setMultiPoint(multiPointResult.value);
    } else {
      setMultiPoint(null);
    }

    const errorMessage = (reason: unknown): string =>
      reason instanceof Error
        ? reason.message
        : 'No fue posible cargar esta sección.';

    setSectionStatus({
      sales: {
        loading: false,
        error:
          salesResult.status === 'rejected'
            ? errorMessage(salesResult.reason)
            : '',
      },
      profitability: {
        loading: false,
        error:
          profitabilityResult.status === 'rejected'
            ? errorMessage(profitabilityResult.reason)
            : '',
      },
      evaluation: {
        loading: false,
        error:
          evaluationResult.status === 'rejected'
            ? errorMessage(evaluationResult.reason)
            : '',
      },
      operational: {
        loading: false,
        error:
          operationalResult.status === 'rejected'
            ? errorMessage(operationalResult.reason)
            : '',
      },
      multiPoint: {
        loading: false,
        error:
          multiPointResult.status === 'rejected'
            ? errorMessage(multiPointResult.reason)
            : '',
      },
    });

    const failures = results.filter(
      (result) => result.status === 'rejected',
    ).length;

    if (failures === results.length) {
      throw new Error(
        'No fue posible cargar ninguna sección del panel ejecutivo.',
      );
    }

    if (failures > 0) {
      setError(
        `${failures} ${
          failures === 1 ? 'sección no pudo' : 'secciones no pudieron'
        } cargarse. El resto del panel continúa disponible.`,
      );
    }
  }


  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    api
      .posPoints()
      .then(async (rows) => {
        if (cancelled) return;

        setPoints(rows);

        const firstPoint = rows[0];

        if (!firstPoint) {
          throw new Error(
            'No existen puntos de venta configurados.',
          );
        }

        setPointOfSaleId(firstPoint.id);

        await loadDashboard(
          firstPoint.id,
          dateFrom,
          dateTo,
          rows.map((point) => point.id),
        );
      })
      .catch((reason: Error) => {
        if (!cancelled) {
          setError(reason.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

      return () => {
      cancelled = true;
    };
  }, []);

  async function consult(): Promise<void> {
    if (!pointOfSaleId) {
      setError('Selecciona un punto de venta.');
      return;
    }

    if (dateFrom > dateTo) {
      setError(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      return;
    }

    setConsulting(true);
    setError('');

    try {
      await loadDashboard(
        pointOfSaleId,
        dateFrom,
        dateTo,
        points.map((point) => point.id),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar el panel ejecutivo.',
      );
    } finally {
      setConsulting(false);
    }
  }

  return (
    <main className="pos-executive-dashboard">
      <header className="pos-executive-dashboard__header">
        <div className="pos-executive-dashboard__header-main">
          <div className="pos-executive-dashboard__header-icon">
            <Gauge size={23} strokeWidth={1.8} />
          </div>

          <div>
            <span className="pos-executive-dashboard__eyebrow">
              DIRECCIÓN
            </span>

            <h1>Panel ejecutivo POS</h1>

            <p>
              Ventas, rentabilidad, alertas y desempeño operativo en
              una sola vista.
            </p>
          </div>
        </div>

        <div className="pos-executive-dashboard__header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(POS_ROUTES.workspace)}
          >
            <ArrowLeft size={15} />
            Punto de Venta
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/dashboard')}
          >
            <House size={15} />
            Menú principal
          </button>

          <button
            type="button"
            onClick={() => navigate(POS_ROUTES.report)}
          >
            <BarChart3 size={15} />
            Reporte detallado
          </button>
        </div>
      </header>

      <section className="pos-executive-dashboard__filters">
        <label>
          Punto de venta
          <select
            value={pointOfSaleId}
            onChange={(event) =>
              setPointOfSaleId(event.target.value)
            }
            disabled={loading || consulting}
          >
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name}
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
            disabled={loading || consulting}
          />
        </label>

        <label>
          Hasta
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            disabled={loading || consulting}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            void consult();
          }}
          disabled={loading || consulting}
        >
          <RefreshCcw size={17} />
          {consulting ? 'Consultando...' : 'Actualizar'}
        </button>
      </section>

      {error ? (
        <div className="pos-executive-dashboard__error">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="operations-empty">
          Cargando panel ejecutivo...
        </div>
      ) : null}

      {!loading ? (
        <>
          <section className="pos-executive-dashboard__hero">
            <article>
              <span>Ventas</span>
              <strong>
                {sales ? sales.salesCount : '—'}
              </strong>
              <small>{pointName || 'POS seleccionado'}</small>
            </article>

            <article>
              <span>Ingreso neto</span>
              <strong>
                {profitability
                  ? money(profitability.summary.netRevenue)
                  : '—'}
              </strong>
              <small>Antes de ITBIS y servicio</small>
            </article>

            <article>
              <span>Costo vendido</span>
              <strong>
                {profitability
                  ? money(
                      profitability.summary.costOfGoodsSold,
                    )
                  : '—'}
              </strong>
              <small>
                {profitability
                  ? `Cobertura ${profitability.summary.costCoveragePercent.toFixed(
                      1,
                    )}%`
                  : 'Cobertura no disponible'}
              </small>
            </article>

            <article className="pos-executive-dashboard__hero-margin">
              <span>Margen bruto</span>
              <strong>
                {profitability
                  ? money(profitability.summary.grossMargin)
                  : '—'}
              </strong>
              <small>
                {profitability?.summary.grossMarginPercent === null ||
                !profitability
                  ? 'Margen % N/D'
                  : `${profitability.summary.grossMarginPercent.toFixed(
                      1,
                    )}%`}
              </small>
            </article>

            <article>
              <span>Total cobrado</span>
              <strong>
                {sales ? money(sales.total) : '—'}
              </strong>
              <small>
                {sales
                  ? `ITBIS ${money(sales.taxAmount)}`
                  : 'ITBIS no disponible'}
              </small>
            </article>
          </section>

          <section className="pos-executive-dashboard__grid">
            <article className="pos-executive-dashboard__card">
              <div className="pos-executive-dashboard__card-title">
                <AlertTriangle size={19} />
                <div>
                  <span>ALERTAS</span>
                  <h2>Política de rentabilidad</h2>
                </div>
              </div>

              {evaluation ? (
                <div className="pos-executive-dashboard__metric">
                  <strong>
                    {evaluation.summary.totalAlerts}
                  </strong>
                  <span>alertas activas</span>
                </div>
              ) : (
                <SectionFallback
                  section="evaluation"
                  emptyMessage="Sin datos de alertas."
                />
              )}

              <div className="pos-executive-dashboard__split">
                <div>
                  <strong>
                    {evaluation?.summary.lowMarginAlerts ?? 0}
                  </strong>
                  <span>Margen bajo</span>
                </div>

                <div>
                  <strong>
                    {evaluation?.summary.incompleteCostAlerts ?? 0}
                  </strong>
                  <span>Costo incompleto</span>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(POS_ROUTES.report)
                }
              >
                Revisar alertas
              </button>
            </article>

            <article className="pos-executive-dashboard__card">
              <div className="pos-executive-dashboard__card-title">
                <DollarSign size={19} />
                <div>
                  <span>PRODUCTO</span>
                  <h2>Mayor contribución</h2>
                </div>
              </div>

              {topProduct ? (
                <>
                  <div className="pos-executive-dashboard__feature">
                    <strong>{topProduct.productName}</strong>
                    <span>{topProduct.categoryName}</span>
                  </div>

                  <div className="pos-executive-dashboard__split">
                    <div>
                      <strong>
                        {money(topProduct.grossMargin)}
                      </strong>
                      <span>Margen</span>
                    </div>

                    <div>
                      <strong>
                        {topProduct.grossMarginPercent === null
                          ? '—'
                          : `${topProduct.grossMarginPercent.toFixed(
                              1,
                            )}%`}
                      </strong>
                      <span>Margen %</span>
                    </div>
                  </div>
                </>
              ) : (
                <SectionFallback
                  section="profitability"
                  emptyMessage="Sin productos vendidos."
                />
              )}
            </article>

            <article className="pos-executive-dashboard__card">
              <div className="pos-executive-dashboard__card-title">
                <Users size={19} />
                <div>
                  <span>OPERACIÓN</span>
                  <h2>Mayor margen por cajero</h2>
                </div>
              </div>

              {topEmployee ? (
                <>
                  <div className="pos-executive-dashboard__feature">
                    <strong>{topEmployee.employeeName}</strong>
                    <span>{topEmployee.employeeNo}</span>
                  </div>

                  <div className="pos-executive-dashboard__split">
                    <div>
                      <strong>
                        {money(topEmployee.grossMargin)}
                      </strong>
                      <span>Margen</span>
                    </div>

                    <div>
                      <strong>{topEmployee.salesCount}</strong>
                      <span>Ventas atribuidas</span>
                    </div>
                  </div>
                </>
              ) : (
                <SectionFallback
                  section="operational"
                  emptyMessage="Sin ventas atribuidas."
                />
              )}

              {(operational?.unattributedSalesCount ?? 0) > 0 ? (
                <div className="pos-executive-dashboard__notice">
                  {operational?.unattributedSalesCount} ventas sin
                  atribución de caja.
                </div>
              ) : null}
            </article>

            <article className="pos-executive-dashboard__card">
              <div className="pos-executive-dashboard__card-title">
                <Store size={19} />
                <div>
                  <span>MULTI-POS</span>
                  <h2>Mayor margen entre POS</h2>
                </div>
              </div>

              {topPoint ? (
                <>
                  <div className="pos-executive-dashboard__feature">
                    <strong>{topPoint.pointOfSaleName}</strong>
                    <span>
                      {topPoint.salesCount} ventas
                    </span>
                  </div>

                  <div className="pos-executive-dashboard__split">
                    <div>
                      <strong>
                        {money(topPoint.grossMargin)}
                      </strong>
                      <span>Margen</span>
                    </div>

                    <div>
                      <strong>
                        {topPoint.grossMarginPercent === null
                          ? '—'
                          : `${topPoint.grossMarginPercent.toFixed(
                              1,
                            )}%`}
                      </strong>
                      <span>Margen %</span>
                    </div>
                  </div>
                </>
              ) : (
                <SectionFallback
                  section="multiPoint"
                  emptyMessage="Sin comparativo disponible."
                />
              )}
            </article>
          </section>

          <section className="pos-executive-dashboard__footer-card">
            <WalletCards size={20} />

            <div>
              <strong>
                Período: {dateFrom} → {dateTo}
              </strong>
              <span>
                Este panel resume indicadores gerenciales. El reporte
                detallado conserva transacciones, tendencias,
                políticas, productos, categorías, empleados y turnos.
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(POS_ROUTES.report)
              }
            >
              Abrir reporte detallado
            </button>
          </section>
        </>
      ) : null}
    </main>
  );
}
