import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Printer,
  RefreshCw,
  TimerReset,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  PointOfSaleResponse,
  PreparationStationResponse,
} from '@cactus/shared';
import {
  api,
  type KitchenHistoryResponse,
} from '../lib/api';
import './styles/KitchenAnalyticsPage.dashboard.css';

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const KITCHEN_ANALYTICS_FILTERS_KEY =
  'cactus.kitchen.analytics.filters';

type KitchenAnalyticsPreset =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'CUSTOM';

type StoredKitchenAnalyticsFilters = {
  pointId?: string;
  stationId?: string;
  dateFrom?: string;
  dateTo?: string;
  preset?: KitchenAnalyticsPreset;
};

function readStoredFilters(): StoredKitchenAnalyticsFilters {
  try {
    const raw = localStorage.getItem(
      KITCHEN_ANALYTICS_FILTERS_KEY,
    );

    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as StoredKitchenAnalyticsFilters;
  } catch {
    return {};
  }
}

function persistFilters(
  filters: StoredKitchenAnalyticsFilters,
): void {
  localStorage.setItem(
    KITCHEN_ANALYTICS_FILTERS_KEY,
    JSON.stringify(filters),
  );
}

function defaultDateFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return toInputDate(date);
}

function defaultDateTo(): string {
  return toInputDate(new Date());
}

function presetRange(
  preset: Exclude<KitchenAnalyticsPreset, 'CUSTOM'>,
): { dateFrom: string; dateTo: string } {
  const end = new Date();
  const start = new Date(end);

  if (preset === 'TODAY') {
    return {
      dateFrom: toInputDate(start),
      dateTo: toInputDate(end),
    };
  }

  if (preset === 'LAST_7_DAYS') {
    start.setDate(start.getDate() - 6);
  }

  if (preset === 'LAST_30_DAYS') {
    start.setDate(start.getDate() - 29);
  }

  return {
    dateFrom: toInputDate(start),
    dateTo: toInputDate(end),
  };
}

function formatMinutes(value: number): string {
  return `${value.toFixed(1)} min`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function csvEscape(value: string | number | null): string {
  const raw = value === null ? '' : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>): void {
  const csv = rows
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');

  const blob = new Blob(
    [`\uFEFF${csv}`],
    { type: 'text/csv;charset=utf-8;' },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function KitchenAnalyticsPage() {
  const navigate = useNavigate();
  const storedFilters = useMemo(
    () => readStoredFilters(),
    [],
  );

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [stations, setStations] =
    useState<PreparationStationResponse[]>([]);
  const [pointId, setPointId] = useState(
    storedFilters.pointId ?? '',
  );
  const [stationId, setStationId] = useState(
    storedFilters.stationId ?? '',
  );
  const [dateFrom, setDateFrom] = useState(
    storedFilters.dateFrom ?? defaultDateFrom(),
  );
  const [dateTo, setDateTo] = useState(
    storedFilters.dateTo ?? defaultDateTo(),
  );
  const [preset, setPreset] = useState<KitchenAnalyticsPreset>(
    storedFilters.preset ?? 'LAST_7_DAYS',
  );
  const [history, setHistory] =
    useState<KitchenHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    if (!pointId) return;

    setLoading(true);

    try {
      const result = await api.kitchenHistory(
        pointId,
        dateFrom,
        dateTo,
        stationId || undefined,
      );

      setHistory(result);
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar el histórico de cocina.',
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, pointId, stationId]);

  useEffect(() => {
    api
      .posPoints()
      .then((rows) => {
        setPoints(rows);
        setPointId((current) => {
          if (
            current &&
            rows.some((row) => row.id === current)
          ) {
            return current;
          }

          return rows[0]?.id ?? '';
        });
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!pointId) {
      setStations([]);
      setStationId('');
      return;
    }

    api
      .preparationStations(pointId)
      .then((rows) => {
        setStations(rows);

        setStationId((current) => {
          if (current === 'UNASSIGNED') {
            return current;
          }

          if (
            current &&
            rows.some((row) => row.id === current)
          ) {
            return current;
          }

          return '';
        });
      })
      .catch((reason: Error) => setError(reason.message));
  }, [pointId]);

  useEffect(() => {
    persistFilters({
      pointId,
      stationId,
      dateFrom,
      dateTo,
      preset,
    });
  }, [dateFrom, dateTo, pointId, preset, stationId]);

  function applyPreset(
    nextPreset: Exclude<KitchenAnalyticsPreset, 'CUSTOM'>,
  ): void {
    const range = presetRange(nextPreset);

    setPreset(nextPreset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  }

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const maxDailyTickets = useMemo(
    () =>
      Math.max(
        1,
        ...(history?.byDay.map((row) => row.totalTickets) ?? [1]),
      ),
    [history],
  );

  function exportHistoryCsv(): void {
    if (!history) {
      setError('No hay datos disponibles para exportar.');
      return;
    }

    const rows: Array<Array<string | number | null>> = [
      ['CACTUS - Histórico de Cocina'],
      ['Punto de venta', pointId],
      ['Estación', history.preparationStationName ?? 'Todas'],
      ['Desde', dateFrom],
      ['Hasta', dateTo],
      ['SLA objetivo (min)', history.slaMinutes],
      [],
      ['RESUMEN'],
      ['Métrica', 'Valor'],
      ['Tickets finalizados', history.totalTickets],
      ['Completados', history.completedTickets],
      ['Cancelados', history.cancelledTickets],
      ['Cumplimiento SLA (%)', history.slaCompliancePercent],
      ['Dentro de SLA', history.slaCompliantTickets],
      ['Fuera de SLA', history.slaBreachedTickets],
      ['Espera promedio (min)', history.averageWaitMinutes],
      ['Preparación promedio (min)', history.averagePreparationMinutes],
      ['Tiempo total promedio (min)', history.averageTotalMinutes],
      ['P50 total (min)', history.p50TotalMinutes],
      ['P90 total (min)', history.p90TotalMinutes],
      [],
      ['EVOLUCIÓN DIARIA'],
      [
        'Fecha',
        'Tickets finalizados',
        'Completados',
        'Cancelados',
        'Dentro SLA',
        'Fuera SLA',
        'Cumplimiento SLA (%)',
        'Espera promedio (min)',
        'Preparación promedio (min)',
        'Tiempo total promedio (min)',
      ],
      ...history.byDay.map((day) => [
        day.date,
        day.totalTickets,
        day.completedTickets,
        day.cancelledTickets,
        day.slaCompliantTickets,
        day.slaBreachedTickets,
        day.slaCompliancePercent,
        day.averageWaitMinutes,
        day.averagePreparationMinutes,
        day.averageTotalMinutes,
      ]),
      [],
      ['RENDIMIENTO POR ESTACIÓN'],
      [
        'Estación',
        'Tickets finalizados',
        'Completados',
        'Cancelados',
        'Dentro SLA',
        'Fuera SLA',
        'Cumplimiento SLA (%)',
        'Espera promedio (min)',
        'Preparación promedio (min)',
        'Tiempo total promedio (min)',
        'P50 total (min)',
        'P90 total (min)',
      ],
      ...history.byStation.map((station) => [
        station.preparationStationName,
        station.totalTickets,
        station.completedTickets,
        station.cancelledTickets,
        station.slaCompliantTickets,
        station.slaBreachedTickets,
        station.slaCompliancePercent,
        station.averageWaitMinutes,
        station.averagePreparationMinutes,
        station.averageTotalMinutes,
        station.p50TotalMinutes,
        station.p90TotalMinutes,
      ]),
    ];

    const stationPart =
      stationId === 'UNASSIGNED'
        ? 'sin-estacion'
        : stationId
          ? 'estacion'
          : 'todas';

    downloadCsv(
      `kitchen-history-${dateFrom}-${dateTo}-${stationPart}.csv`,
      rows,
    );

    setError('');
  }

  function printExecutiveReport(): void {
    if (!history) {
      setError('No hay datos disponibles para imprimir.');
      return;
    }

    setError('');

    window.setTimeout(() => {
      window.print();
    }, 50);
  }

  return (
    <main className="kitchen-analytics-page">
      <header className="kitchen-analytics-header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>
            <BarChart3 size={28} />
            Analítica de Cocina
          </h1>
          <p>
            Histórico operativo, cumplimiento SLA y rendimiento por estación.
          </p>
        </div>

        <div className="kitchen-analytics-header__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/kitchen')}
          >
            <ArrowLeft size={16} />
            Volver al KDS
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={exportHistoryCsv}
            disabled={!history || loading}
          >
            <Download size={16} />
            Exportar CSV
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={printExecutiveReport}
            disabled={!history || loading}
          >
            <Printer size={16} />
            Imprimir / PDF
          </button>

          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading || !pointId}
          >
            <RefreshCw size={16} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      <section className="kitchen-print-report-header">
        <div>
          <span className="brand">CACTUS</span>
          <h2>Reporte Ejecutivo de Cocina</h2>
        </div>

        <dl>
          <div>
            <dt>Punto de venta</dt>
            <dd>
              {points.find((point) => point.id === pointId)?.name ?? pointId}
            </dd>
          </div>
          <div>
            <dt>Estación</dt>
            <dd>
              {stationId === 'UNASSIGNED'
                ? 'Sin estación'
                : stations.find((station) => station.id === stationId)?.name ??
                  'Todas las estaciones'}
            </dd>
          </div>
          <div>
            <dt>Período</dt>
            <dd>
              {dateFrom} — {dateTo}
            </dd>
          </div>
          <div>
            <dt>Generado</dt>
            <dd>
              {history
                ? new Date(history.generatedAt).toLocaleString()
                : '-'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="kitchen-analytics-presets">
        <span>Período rápido</span>

        <div>
          <button
            type="button"
            className={
              preset === 'TODAY'
                ? 'secondary-button kitchen-analytics-preset--active'
                : 'secondary-button'
            }
            onClick={() => applyPreset('TODAY')}
          >
            Hoy
          </button>

          <button
            type="button"
            className={
              preset === 'LAST_7_DAYS'
                ? 'secondary-button kitchen-analytics-preset--active'
                : 'secondary-button'
            }
            onClick={() => applyPreset('LAST_7_DAYS')}
          >
            Últimos 7 días
          </button>

          <button
            type="button"
            className={
              preset === 'LAST_30_DAYS'
                ? 'secondary-button kitchen-analytics-preset--active'
                : 'secondary-button'
            }
            onClick={() => applyPreset('LAST_30_DAYS')}
          >
            Últimos 30 días
          </button>

          {preset === 'CUSTOM' ? (
            <span className="kitchen-analytics-preset-custom">
              Rango personalizado
            </span>
          ) : null}
        </div>
      </section>

      <section className="kitchen-analytics-filters">
        <label>
          Punto de venta
          <select
            value={pointId}
            onChange={(event) => setPointId(event.target.value)}
          >
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Estación
          <select
            value={stationId}
            onChange={(event) => setStationId(event.target.value)}
          >
            <option value="">Todas las estaciones</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
            <option value="UNASSIGNED">Sin estación</option>
          </select>
        </label>

        <label>
          Desde
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPreset('CUSTOM');
            }}
          />
        </label>

        <label>
          Hasta
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPreset('CUSTOM');
            }}
          />
        </label>
      </section>

      {error ? (
        <div className="operations-error">{error}</div>
      ) : null}

      <section className="kitchen-analytics-kpis">
        <article>
          <span>Total finalizados</span>
          <strong>{history?.totalTickets ?? 0}</strong>
        </article>

        <article>
          <span>Completados</span>
          <strong>{history?.completedTickets ?? 0}</strong>
          <CheckCircle2 size={17} />
        </article>

        <article>
          <span>Cancelados</span>
          <strong>{history?.cancelledTickets ?? 0}</strong>
          <XCircle size={17} />
        </article>

        <article
          className={
            (history?.slaCompliancePercent ?? 0) < 80
              ? 'kitchen-analytics-kpi--alert'
              : ''
          }
        >
          <span>Cumplimiento SLA</span>
          <strong>
            {formatPercent(history?.slaCompliancePercent ?? 0)}
          </strong>
          <Clock3 size={17} />
        </article>

        <article>
          <span>Espera promedio</span>
          <strong>
            {formatMinutes(history?.averageWaitMinutes ?? 0)}
          </strong>
        </article>

        <article>
          <span>Preparación promedio</span>
          <strong>
            {formatMinutes(
              history?.averagePreparationMinutes ?? 0,
            )}
          </strong>
        </article>

        <article>
          <span>Tiempo total</span>
          <strong>
            {formatMinutes(history?.averageTotalMinutes ?? 0)}
          </strong>
        </article>

        <article>
          <span>P50 / P90 total</span>
          <strong>
            {(history?.p50TotalMinutes ?? 0).toFixed(1)} /{' '}
            {(history?.p90TotalMinutes ?? 0).toFixed(1)} min
          </strong>
          <TimerReset size={17} />
        </article>
      </section>

      <section className="kitchen-analytics-section">
        <div className="kitchen-analytics-section__heading">
          <div>
            <h2>
              <CalendarDays size={19} />
              Evolución diaria
            </h2>
            <p>
              Tickets finalizados y porcentaje de cumplimiento SLA.
            </p>
          </div>

          <span>
            SLA objetivo: menos de {history?.slaMinutes ?? 20} min
          </span>
        </div>

        <div className="kitchen-history-chart">
          {(history?.byDay.length ?? 0) === 0 ? (
            <div className="kitchen-analytics-empty">
              No hay tickets finalizados en el período seleccionado.
            </div>
          ) : (
            history?.byDay.map((day) => (
              <article className="kitchen-history-day" key={day.date}>
                <div className="kitchen-history-day__label">
                  <strong>{day.date}</strong>
                  <span>{day.totalTickets} tickets</span>
                </div>

                <div className="kitchen-history-day__bar-track">
                  <div
                    className="kitchen-history-day__bar"
                    style={{
                      width: `${Math.max(
                        4,
                        (day.totalTickets / maxDailyTickets) * 100,
                      )}%`,
                    }}
                  />
                </div>

                <div className="kitchen-history-day__metrics">
                  <span>
                    SLA <strong>{formatPercent(day.slaCompliancePercent)}</strong>
                  </span>
                  <span>
                    Total <strong>{formatMinutes(day.averageTotalMinutes)}</strong>
                  </span>
                  <span>
                    Cancelados <strong>{day.cancelledTickets}</strong>
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="kitchen-analytics-section">
        <div className="kitchen-analytics-section__heading">
          <div>
            <h2>Rendimiento por estación</h2>
            <p>
              Comparativo de volumen, SLA y distribución de tiempos.
            </p>
          </div>
        </div>

        <div className="kitchen-history-stations">
          {(history?.byStation.length ?? 0) === 0 ? (
            <div className="kitchen-analytics-empty">
              No hay datos por estación en este período.
            </div>
          ) : (
            history?.byStation.map((station) => (
              <article
                className="kitchen-history-station"
                key={
                  station.preparationStationId ??
                  'UNASSIGNED'
                }
              >
                <header>
                  <strong>
                    {station.preparationStationName}
                  </strong>
                  <span>
                    {station.totalTickets} finalizados
                  </span>
                </header>

                <dl>
                  <div>
                    <dt>Completados</dt>
                    <dd>{station.completedTickets}</dd>
                  </div>
                  <div>
                    <dt>Cancelados</dt>
                    <dd>{station.cancelledTickets}</dd>
                  </div>
                  <div>
                    <dt>SLA</dt>
                    <dd>
                      {formatPercent(
                        station.slaCompliancePercent,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Espera</dt>
                    <dd>
                      {formatMinutes(
                        station.averageWaitMinutes,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Preparación</dt>
                    <dd>
                      {formatMinutes(
                        station.averagePreparationMinutes,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>
                      {formatMinutes(
                        station.averageTotalMinutes,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>P50</dt>
                    <dd>
                      {formatMinutes(station.p50TotalMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt>P90</dt>
                    <dd>
                      {formatMinutes(station.p90TotalMinutes)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
