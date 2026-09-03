import {
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  Printer,
  RefreshCw,
  TriangleAlert,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  PointOfSaleResponse,
  PreparationStationResponse,
} from '@cactus/shared';
import {
  api,
  type KitchenMetricsResponse,
  type KitchenTicketResponse,
  type KitchenTicketStatusValue,
} from '../lib/api';
import './styles/KitchenDisplayPage.dashboard.css';

const ACTIVE_STATUSES: KitchenTicketStatusValue[] = [
  'PENDING',
  'PREPARING',
  'READY',
];

const AUTO_REFRESH_MS = 10_000;
const CLOCK_TICK_MS = 30_000;
const NEW_TICKET_HIGHLIGHT_MS = 8_000;
const SOUND_STORAGE_KEY = 'cactus.kds.sound-enabled';
const AUTO_PRINT_STORAGE_KEY = 'cactus.kds.auto-print-enabled';
const PRINTED_TICKETS_STORAGE_KEY = 'cactus.kds.printed-ticket-ids';
const MAX_PRINT_HISTORY = 250;

type TicketUrgency = 'NORMAL' | 'ATTENTION' | 'URGENT';

function elapsedMinutes(sentAt: string): number {
  return Math.floor(
    Math.max(0, Date.now() - new Date(sentAt).getTime()) / 60_000,
  );
}

function elapsedLabel(sentAt: string): string {
  const minutes = elapsedMinutes(sentAt);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

function ticketUrgency(sentAt: string): TicketUrgency {
  const minutes = elapsedMinutes(sentAt);

  if (minutes >= 20) return 'URGENT';
  if (minutes >= 10) return 'ATTENTION';

  return 'NORMAL';
}

function nextStatus(
  status: KitchenTicketStatusValue,
): KitchenTicketStatusValue | null {
  if (status === 'PENDING') return 'PREPARING';
  if (status === 'PREPARING') return 'READY';
  if (status === 'READY') return 'COMPLETED';

  return null;
}

function title(status: KitchenTicketStatusValue): string {
  if (status === 'PENDING') return 'Pendientes';
  if (status === 'PREPARING') return 'En preparación';
  if (status === 'READY') return 'Listos';

  return status;
}

function action(status: KitchenTicketStatusValue): string {
  if (status === 'PENDING') return 'Comenzar preparación';
  if (status === 'PREPARING') return 'Marcar listo';
  if (status === 'READY') return 'Completar';

  return '';
}

function itemStatusLabel(status: KitchenTicketStatusValue): string {
  if (status === 'PENDING') return 'Pendiente';
  if (status === 'PREPARING') return 'Preparando';
  if (status === 'READY') return 'Listo';
  if (status === 'COMPLETED') return 'Completado';
  if (status === 'CANCELLED') return 'Cancelado';

  return status;
}

function itemAction(status: KitchenTicketStatusValue): string {
  if (status === 'PENDING') return 'Comenzar';
  if (status === 'PREPARING') return 'Marcar listo';
  if (status === 'READY') return 'Completar';

  return '';
}

function urgencyLabel(urgency: TicketUrgency): string | null {
  if (urgency === 'URGENT') return 'Urgente';
  if (urgency === 'ATTENTION') return 'Atención';

  return null;
}

function playKitchenChime(
  audioContextRef: React.MutableRefObject<AudioContext | null>,
): void {
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context =
    audioContextRef.current ?? new AudioContextClass();

  audioContextRef.current = context;

  if (context.state === 'suspended') {
    void context.resume();
  }

  const now = context.currentTime;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  gain.connect(context.destination);

  const first = context.createOscillator();
  first.type = 'sine';
  first.frequency.setValueAtTime(880, now);
  first.connect(gain);
  first.start(now);
  first.stop(now + 0.22);

  const second = context.createOscillator();
  second.type = 'sine';
  second.frequency.setValueAtTime(1174.66, now + 0.28);
  second.connect(gain);
  second.start(now + 0.28);
  second.stop(now + 0.58);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function printKitchenTicket(ticket: KitchenTicketResponse): void {
  const printWindow = window.open('', '_blank', 'width=420,height=720');

  if (!printWindow) {
    throw new Error(
      'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir comandas.',
    );
  }

  const reference = ticket.tableReference ?? ticket.accountReference;
  const stationName =
    ticket.preparationStationName ?? 'Sin estación';
  const sentAt = new Date(ticket.sentAt).toLocaleString();

  const items = ticket.items
    .map(
      (item) => `
        <div class="item">
          <strong>${escapeHtml(String(item.quantity))}×</strong>
          <span>${escapeHtml(item.productName)}</span>
        </div>
      `,
    )
    .join('');

  const notes = ticket.notes
    ? `
      <section class="notes">
        <strong>NOTAS</strong>
        <div>${escapeHtml(ticket.notes)}</div>
      </section>
    `
    : '';

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Comanda ${escapeHtml(ticket.ticketNumber)}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
          }

          body {
            width: 72mm;
            margin: 0 auto;
            font-size: 13px;
            line-height: 1.35;
          }

          .center {
            text-align: center;
          }

          h1 {
            margin: 0;
            font-size: 22px;
            letter-spacing: 0.04em;
          }

          .ticket-number {
            margin-top: 3px;
            font-size: 18px;
            font-weight: 900;
          }

          .divider {
            margin: 10px 0;
            border-top: 1px dashed #000;
          }

          .meta {
            display: grid;
            gap: 3px;
          }

          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }

          .meta-row strong {
            flex: 0 0 auto;
          }

          .meta-row span {
            text-align: right;
          }

          .items {
            display: grid;
            gap: 8px;
          }

          .item {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px;
            align-items: start;
            font-size: 15px;
          }

          .item strong {
            font-size: 17px;
          }

          .notes {
            margin-top: 10px;
            padding: 8px;
            border: 2px solid #000;
            font-size: 14px;
          }

          .notes > strong {
            display: block;
            margin-bottom: 4px;
          }

          .footer {
            margin-top: 12px;
            text-align: center;
            font-size: 11px;
          }

          @media print {
            body {
              width: 72mm;
            }
          }
        </style>
      </head>

      <body>
        <header class="center">
          <h1>COCINA</h1>
          <div class="ticket-number">
            ${escapeHtml(ticket.ticketNumber)}
          </div>
        </header>

        <div class="divider"></div>

        <section class="meta">
          <div class="meta-row">
            <strong>Mesa / Ref.</strong>
            <span>${escapeHtml(reference)}</span>
          </div>

          <div class="meta-row">
            <strong>Cliente</strong>
            <span>${escapeHtml(ticket.customerAlias)}</span>
          </div>

          <div class="meta-row">
            <strong>Estación</strong>
            <span>${escapeHtml(stationName)}</span>
          </div>

          <div class="meta-row">
            <strong>Enviado</strong>
            <span>${escapeHtml(sentAt)}</span>
          </div>
        </section>

        <div class="divider"></div>

        <section class="items">
          ${items}
        </section>

        ${notes}

        <div class="divider"></div>

        <footer class="footer">
          Comanda de preparación · Sin precios
        </footer>
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 150);
}

function readPrintedTicketIds(): Set<string> {
  try {
    const stored = localStorage.getItem(
      PRINTED_TICKETS_STORAGE_KEY,
    );

    if (!stored) {
      return new Set();
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed.filter(
        (value): value is string => typeof value === 'string',
      ),
    );
  } catch {
    return new Set();
  }
}

function persistPrintedTicketIds(ids: Set<string>): void {
  const values = Array.from(ids).slice(-MAX_PRINT_HISTORY);

  localStorage.setItem(
    PRINTED_TICKETS_STORAGE_KEY,
    JSON.stringify(values),
  );
}

export function KitchenDisplayPage() {
  const navigate = useNavigate();

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [pointId, setPointId] = useState('');
  const [stations, setStations] =
    useState<PreparationStationResponse[]>([]);
  const [stationId, setStationId] = useState('');
  const [tickets, setTickets] = useState<KitchenTicketResponse[]>([]);
  const [metrics, setMetrics] = useState<KitchenMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [error, setError] = useState('');
  const [newTicketIds, setNewTicketIds] = useState<string[]>([]);
  const [newTicketCount, setNewTicketCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem(SOUND_STORAGE_KEY) !== 'false',
  );
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(
    () => localStorage.getItem(AUTO_PRINT_STORAGE_KEY) === 'true',
  );
  const [, setClockTick] = useState(0);

  const knownTicketIdsRef = useRef<Set<string>>(new Set());
  const printedTicketIdsRef = useRef<Set<string>>(
    readPrintedTicketIds(),
  );
  const initializedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const loadTickets = useCallback(async () => {
    if (!pointId) return;

    setLoading(true);

    try {
      const [rows, metricsResponse] = await Promise.all([
        api.kitchenTickets(
          pointId,
          undefined,
          stationId || undefined,
        ),
        api.kitchenMetrics(
          pointId,
          stationId || undefined,
        ),
      ]);

      setMetrics(metricsResponse);

      const activeRows = rows.filter((row) =>
        ACTIVE_STATUSES.includes(row.status),
      );

      const currentIds = new Set(activeRows.map((row) => row.id));

      if (initializedRef.current) {
        const discoveredTickets = activeRows.filter(
          (row) => !knownTicketIdsRef.current.has(row.id),
        );
        const discovered = discoveredTickets.map((row) => row.id);

        if (discovered.length > 0) {
          setNewTicketIds(discovered);
          setNewTicketCount(discovered.length);

          if (soundEnabled) {
            playKitchenChime(audioContextRef);
          }

          if (autoPrintEnabled) {
            let autoPrintError = '';

            for (const ticket of discoveredTickets) {
              if (printedTicketIdsRef.current.has(ticket.id)) {
                continue;
              }

              try {
                printKitchenTicket(ticket);
                printedTicketIdsRef.current.add(ticket.id);
              } catch (reason) {
                autoPrintError =
                  reason instanceof Error
                    ? reason.message
                    : 'No fue posible autoimprimir una comanda.';
                break;
              }
            }

            persistPrintedTicketIds(
              printedTicketIdsRef.current,
            );

            if (autoPrintError) {
              setError(
                `${autoPrintError} La impresión manual sigue disponible.`,
              );
            }
          }

          window.setTimeout(() => {
            setNewTicketIds((current) =>
              current.filter((id) => !discovered.includes(id)),
            );
          }, NEW_TICKET_HIGHLIGHT_MS);

          window.setTimeout(() => {
            setNewTicketCount(0);
          }, NEW_TICKET_HIGHLIGHT_MS);
        }
      } else {
        initializedRef.current = true;
      }

      knownTicketIdsRef.current = currentIds;
      setTickets(activeRows);

      if (!autoPrintEnabled) {
        setError('');
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar los tickets.',
      );
    } finally {
      setLoading(false);
    }
  }, [autoPrintEnabled, pointId, soundEnabled, stationId]);

  useEffect(() => {
    api
      .posPoints()
      .then((rows) => {
        setPoints(rows);
        setPointId(rows[0]?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!pointId) {
      setStations([]);
      setStationId('');
      setMetrics(null);
      return;
    }

    api
      .preparationStations(pointId)
      .then((rows) => {
        setStations(rows.filter((row) => row.active));
        setStationId('');
      })
      .catch((reason: Error) => setError(reason.message));
  }, [pointId]);

  useEffect(() => {
    initializedRef.current = false;
    knownTicketIdsRef.current = new Set();
    setNewTicketIds([]);
    setNewTicketCount(0);
  }, [pointId, stationId]);

  useEffect(() => {
    void loadTickets();

    if (!pointId) return;

    const timer = window.setInterval(() => {
      void loadTickets();
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [loadTickets, pointId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((current) => current + 1);
    }, CLOCK_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        ACTIVE_STATUSES.map((status) => [
          status,
          tickets.filter((ticket) => ticket.status === status),
        ]),
      ) as Record<string, KitchenTicketResponse[]>,
    [tickets],
  );

  const urgentCount = useMemo(
    () =>
      tickets.filter(
        (ticket) => ticketUrgency(ticket.sentAt) === 'URGENT',
      ).length,
    [tickets],
  );

  function toggleSound(): void {
    const next = !soundEnabled;

    setSoundEnabled(next);
    localStorage.setItem(
      SOUND_STORAGE_KEY,
      next ? 'true' : 'false',
    );

    if (next) {
      playKitchenChime(audioContextRef);
    }
  }

  function testSound(): void {
    playKitchenChime(audioContextRef);
  }

  function toggleAutoPrint(): void {
    const next = !autoPrintEnabled;

    setAutoPrintEnabled(next);
    localStorage.setItem(
      AUTO_PRINT_STORAGE_KEY,
      next ? 'true' : 'false',
    );

    setError('');
  }

  function printTicket(ticket: KitchenTicketResponse): void {
    setError('');

    try {
      printKitchenTicket(ticket);
      printedTicketIdsRef.current.add(ticket.id);
      persistPrintedTicketIds(
        printedTicketIdsRef.current,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible imprimir la comanda.',
      );
    }
  }

  async function advance(
    ticket: KitchenTicketResponse,
  ): Promise<void> {
    const status = nextStatus(ticket.status);

    if (!status) return;

    setUpdatingId(ticket.id);

    try {
      const updated = await api.updateKitchenTicketStatus(
        ticket.id,
        status,
      );

      setTickets((current) =>
        status === 'COMPLETED'
          ? current.filter((row) => row.id !== ticket.id)
          : current.map((row) =>
              row.id === ticket.id ? updated : row,
            ),
      );

      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar el ticket.',
      );
    } finally {
      setUpdatingId('');
    }
  }

  async function advanceItem(
    ticket: KitchenTicketResponse,
    itemId: string,
    currentStatus: KitchenTicketStatusValue,
  ): Promise<void> {
    const status = nextStatus(currentStatus);

    if (!status) return;

    setUpdatingItemId(itemId);

    try {
      const updated = await api.updateKitchenTicketItemStatus(
        itemId,
        status,
      );

      setTickets((current) =>
        ACTIVE_STATUSES.includes(updated.status)
          ? current.map((row) =>
              row.id === ticket.id ? updated : row,
            )
          : current.filter((row) => row.id !== ticket.id),
      );

      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar el artículo.',
      );
    } finally {
      setUpdatingItemId('');
    }
  }

  async function cancelItem(
    ticket: KitchenTicketResponse,
    itemId: string,
    productName: string,
  ): Promise<void> {
    const reason = window.prompt(
      `Motivo de cancelación para ${productName}:`,
    )?.trim();

    if (!reason) return;

    if (reason.length < 3) {
      setError(
        'El motivo de cancelación debe tener al menos 3 caracteres.',
      );
      return;
    }

    setCancellingId(itemId);

    try {
      const updated = await api.cancelKitchenTicketItem(
        itemId,
        reason,
      );

      setTickets((current) =>
        ACTIVE_STATUSES.includes(updated.status)
          ? current.map((row) =>
              row.id === ticket.id ? updated : row,
            )
          : current.filter((row) => row.id !== ticket.id),
      );

      setError('');
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : 'No fue posible cancelar el artículo.',
      );
    } finally {
      setCancellingId('');
    }
  }

  async function cancelTicket(
    ticket: KitchenTicketResponse,
  ): Promise<void> {
    const reason = window.prompt(
      `Motivo de cancelación del ticket ${ticket.ticketNumber}:`,
    )?.trim();

    if (!reason) return;

    if (reason.length < 3) {
      setError(
        'El motivo de cancelación debe tener al menos 3 caracteres.',
      );
      return;
    }

    setCancellingId(ticket.id);

    try {
      const updated = await api.cancelKitchenTicket(
        ticket.id,
        reason,
      );

      setTickets((current) =>
        ACTIVE_STATUSES.includes(updated.status)
          ? current.map((row) =>
              row.id === ticket.id ? updated : row,
            )
          : current.filter((row) => row.id !== ticket.id),
      );

      setError('');
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : 'No fue posible cancelar el ticket.',
      );
    } finally {
      setCancellingId('');
    }
  }

  return (
    <main className="kds-page">
      <header className="kds-header">
        <div>
          <span className="brand">CACTUS</span>

          <h1>
            <ChefHat size={28} />
            Cocina
          </h1>

          <p>Tickets activos de preparación.</p>
        </div>

        <div className="kds-header__actions">
          <select
            value={pointId}
            onChange={(event) =>
              setPointId(event.target.value)
            }
          >
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name}
              </option>
            ))}
          </select>

          <select
            value={stationId}
            onChange={(event) =>
              setStationId(event.target.value)
            }
            aria-label="Estación de preparación"
          >
            <option value="">Todas las estaciones</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
            <option value="UNASSIGNED">Sin estación</option>
          </select>

          <button
            type="button"
            className={
              soundEnabled
                ? 'secondary-button kds-sound-toggle kds-sound-toggle--active'
                : 'secondary-button kds-sound-toggle'
            }
            onClick={toggleSound}
            aria-pressed={soundEnabled}
            title={
              soundEnabled
                ? 'Desactivar sonido de nuevas comandas'
                : 'Activar sonido de nuevas comandas'
            }
          >
            {soundEnabled ? (
              <Volume2 size={16} />
            ) : (
              <VolumeX size={16} />
            )}
            Sonido {soundEnabled ? 'ON' : 'OFF'}
          </button>

          {soundEnabled ? (
            <button
              type="button"
              className="secondary-button kds-sound-test"
              onClick={testSound}
            >
              Probar sonido
            </button>
          ) : null}

          <button
            type="button"
            className={
              autoPrintEnabled
                ? 'secondary-button kds-auto-print-toggle kds-auto-print-toggle--active'
                : 'secondary-button kds-auto-print-toggle'
            }
            onClick={toggleAutoPrint}
            aria-pressed={autoPrintEnabled}
            title={
              autoPrintEnabled
                ? 'Desactivar autoimpresión de nuevas comandas'
                : 'Activar autoimpresión de nuevas comandas'
            }
          >
            <Printer size={16} />
            Autoimpresión {autoPrintEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/kitchen/analytics')}
          >
            Analítica
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadTickets()}
            disabled={loading || !pointId}
          >
            <RefreshCw size={16} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/sales-pos')}
          >
            Volver al POS
          </button>
        </div>
      </header>

      <section
        className="kds-metrics"
        aria-label="Métricas operativas de cocina"
        aria-live="polite"
      >
        <div className="kds-metrics__header">
          <div>
            <h2>Operación en tiempo real</h2>
            <p>
              SLA crítico: 20+ min · Promedios de las últimas{' '}
              {metrics?.historyWindowHours ?? 24} h
            </p>
          </div>

          <span className="kds-metrics__scope">
            {stationId === 'UNASSIGNED'
              ? 'Sin estación'
              : stations.find(
                    (station) => station.id === stationId,
                  )?.name ?? 'Todas las estaciones'}
          </span>
        </div>

        <div className="kds-metrics__cards">
          <article className="kds-metric-card">
            <span>Activos</span>
            <strong>{metrics?.activeTickets ?? tickets.length}</strong>
          </article>

          <article className="kds-metric-card">
            <span>Pendientes</span>
            <strong>{metrics?.pendingTickets ?? 0}</strong>
          </article>

          <article className="kds-metric-card">
            <span>Preparando</span>
            <strong>{metrics?.preparingTickets ?? 0}</strong>
          </article>

          <article className="kds-metric-card">
            <span>Listos</span>
            <strong>{metrics?.readyTickets ?? 0}</strong>
          </article>

          <article
            className={[
              'kds-metric-card',
              (metrics?.overdueTickets ?? urgentCount) > 0
                ? 'kds-metric-card--alert'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span>Fuera de SLA</span>
            <strong>
              {metrics?.overdueTickets ?? urgentCount}
            </strong>
          </article>

          <article className="kds-metric-card">
            <span>Espera promedio</span>
            <strong>
              {metrics?.averageWaitMinutes.toFixed(1) ?? '0.0'} min
            </strong>
          </article>

          <article className="kds-metric-card">
            <span>Preparación promedio</span>
            <strong>
              {metrics?.averagePreparationMinutes.toFixed(1) ?? '0.0'} min
            </strong>
          </article>

          <article className="kds-metric-card">
            <span>Tiempo total promedio</span>
            <strong>
              {metrics?.averageTotalMinutes.toFixed(1) ?? '0.0'} min
            </strong>
          </article>
        </div>

        {!stationId && (metrics?.byStation.length ?? 0) > 0 ? (
          <div className="kds-station-metrics">
            <div className="kds-station-metrics__heading">
              <strong>Rendimiento por estación</strong>
              <span>Activos · SLA · tiempos promedio</span>
            </div>

            <div className="kds-station-metrics__grid">
              {metrics?.byStation.map((station) => (
                <article
                  className="kds-station-metric"
                  key={
                    station.preparationStationId ??
                    'UNASSIGNED'
                  }
                >
                  <div className="kds-station-metric__top">
                    <strong>
                      {station.preparationStationName}
                    </strong>
                    <span>
                      {station.activeTickets} activos
                    </span>
                  </div>

                  <div className="kds-station-metric__values">
                    <span>
                      SLA:{' '}
                      <strong
                        className={
                          station.overdueTickets > 0
                            ? 'kds-metric-danger'
                            : undefined
                        }
                      >
                        {station.overdueTickets}
                      </strong>
                    </span>
                    <span>
                      Espera:{' '}
                      <strong>
                        {station.averageWaitMinutes.toFixed(1)}m
                      </strong>
                    </span>
                    <span>
                      Prep:{' '}
                      <strong>
                        {station.averagePreparationMinutes.toFixed(1)}m
                      </strong>
                    </span>
                    <span>
                      Total:{' '}
                      <strong>
                        {station.averageTotalMinutes.toFixed(1)}m
                      </strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="kds-summary" aria-live="polite">
        <span>
          Activos: <strong>{tickets.length}</strong>
        </span>

        <span>
          Urgentes: <strong>{urgentCount}</strong>
        </span>

        <span>
          Estación:{' '}
          <strong>
            {stationId === 'UNASSIGNED'
              ? 'Sin estación'
              : stations.find((station) => station.id === stationId)?.name ??
                'Todas'}
          </strong>
        </span>

        <span>
          Auto-actualización: <strong>10 s</strong>
        </span>

        <span>
          Autoimpresión:{' '}
          <strong>{autoPrintEnabled ? 'ON' : 'OFF'}</strong>
        </span>
      </section>

      {newTicketCount > 0 ? (
        <div
          className="kds-new-ticket-alert"
          role="status"
          aria-live="assertive"
        >
          <ChefHat size={18} />
          <strong>
            {newTicketCount === 1
              ? 'Nueva comanda recibida'
              : `${newTicketCount} nuevas comandas recibidas`}
          </strong>
        </div>
      ) : null}

      {error ? (
        <div className="operations-error">{error}</div>
      ) : null}

      <section className="kds-board">
        {ACTIVE_STATUSES.map((status) => (
          <section
            key={status}
            className={`kds-column kds-column--${status.toLowerCase()}`}
          >
            <header className="kds-column__header">
              <div>
                {status === 'PENDING' ? (
                  <Clock3 size={18} />
                ) : null}

                {status === 'PREPARING' ? (
                  <Flame size={18} />
                ) : null}

                {status === 'READY' ? (
                  <CheckCircle2 size={18} />
                ) : null}

                <h2>{title(status)}</h2>
              </div>

              <strong>{grouped[status]?.length ?? 0}</strong>
            </header>

            <div className="kds-column__tickets">
              {(grouped[status] ?? []).length === 0 ? (
                <div className="kds-empty">
                  No hay tickets en esta etapa.
                </div>
              ) : (
                grouped[status].map((ticket) => {
                  const urgency = ticketUrgency(ticket.sentAt);
                  const urgencyText = urgencyLabel(urgency);
                  const isNew = newTicketIds.includes(ticket.id);

                  return (
                    <article
                      className={[
                        'kds-ticket',
                        `kds-ticket--${urgency.toLowerCase()}`,
                        isNew ? 'kds-ticket--new' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={ticket.id}
                    >
                      <div className="kds-ticket__top">
                        <div>
                          <strong>{ticket.ticketNumber}</strong>
                          <span>
                            {ticket.tableReference ??
                              ticket.accountReference}
                          </span>
                        </div>

                        <div className="kds-ticket__timing">
                          {urgencyText ? (
                            <span
                              className={`kds-ticket__urgency kds-ticket__urgency--${urgency.toLowerCase()}`}
                            >
                              {urgency === 'URGENT' ? (
                                <TriangleAlert size={13} />
                              ) : null}
                              {urgencyText}
                            </span>
                          ) : null}

                          <span className="kds-ticket__elapsed">
                            {elapsedLabel(ticket.sentAt)}
                          </span>
                        </div>
                      </div>

                      <div className="kds-ticket__customer">
                        {ticket.customerAlias}
                      </div>

                      <div className="kds-ticket__station">
                        {ticket.preparationStationName ?? 'Sin estación'}
                      </div>

                      <div className="kds-ticket__items">
                        {ticket.items.map((item) => {
                          const nextItemStatus = nextStatus(item.status);
                          const itemBusy = updatingItemId === item.id;

                          return (
                            <div
                              className={`kds-ticket-item kds-ticket-item--${item.status.toLowerCase()}`}
                              key={item.id}
                            >
                              <div className="kds-ticket-item__product">
                                <strong>{item.quantity}×</strong>
                                <span>{item.productName}</span>
                              </div>

                              <div className="kds-ticket-item__controls">
                                <span
                                  className={`kds-ticket-item__status kds-ticket-item__status--${item.status.toLowerCase()}`}
                                >
                                  {itemStatusLabel(item.status)}
                                </span>

                                {nextItemStatus ? (
                                  <button
                                    type="button"
                                    className="secondary-button kds-ticket-item__action"
                                    onClick={() =>
                                      void advanceItem(
                                        ticket,
                                        item.id,
                                        item.status,
                                      )
                                    }
                                    disabled={
                                      itemBusy ||
                                      cancellingId === item.id ||
                                      updatingId === ticket.id ||
                                      cancellingId === ticket.id
                                    }
                                  >
                                    {itemBusy
                                      ? 'Actualizando...'
                                      : itemAction(item.status)}
                                  </button>
                                ) : null}

                                {item.status !== 'COMPLETED' &&
                                item.status !== 'CANCELLED' ? (
                                  <button
                                    type="button"
                                    className="secondary-button kds-ticket-item__cancel"
                                    onClick={() =>
                                      void cancelItem(
                                        ticket,
                                        item.id,
                                        item.productName,
                                      )
                                    }
                                    disabled={
                                      cancellingId === item.id ||
                                      updatingItemId === item.id ||
                                      updatingId === ticket.id ||
                                      cancellingId === ticket.id
                                    }
                                  >
                                    <XCircle size={14} />
                                    {cancellingId === item.id
                                      ? 'Cancelando...'
                                      : 'Cancelar'}
                                  </button>
                                ) : null}
                              </div>

                              {item.status === 'CANCELLED' &&
                              item.cancellationReason ? (
                                <div className="kds-ticket-item__cancellation">
                                  <strong>Cancelado:</strong>{' '}
                                  {item.cancellationReason}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {ticket.notes ? (
                        <div className="kds-ticket__notes">
                          {ticket.notes}
                        </div>
                      ) : null}

                      <div className="kds-ticket__actions">
                        <button
                          type="button"
                          className="secondary-button kds-ticket__print"
                          onClick={() => printTicket(ticket)}
                          disabled={updatingId === ticket.id || Boolean(updatingItemId) || Boolean(cancellingId)}
                        >
                          <Printer size={15} />
                          Imprimir comanda
                        </button>

                        <button
                          type="button"
                          className="secondary-button kds-ticket__cancel"
                          onClick={() => void cancelTicket(ticket)}
                          disabled={
                            updatingId === ticket.id ||
                            Boolean(updatingItemId) ||
                            Boolean(cancellingId)
                          }
                        >
                          <XCircle size={15} />
                          {cancellingId === ticket.id
                            ? 'Cancelando...'
                            : 'Cancelar ticket'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void advance(ticket)}
                          disabled={
                            updatingId === ticket.id ||
                            Boolean(updatingItemId) ||
                            Boolean(cancellingId)
                          }
                        >
                          {updatingId === ticket.id
                            ? 'Actualizando...'
                            : action(ticket.status)}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
