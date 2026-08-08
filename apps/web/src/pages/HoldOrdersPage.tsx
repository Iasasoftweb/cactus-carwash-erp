import {
  CircleDollarSign,
  Clock3,
  Play,
  Search,
  Printer,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CashRegisterSummaryResponse,
  OrderOperationalStatus,
  PaymentMethodResponse,
} from '@cactus/shared';
import { api, OrderListItem } from '../lib/api';

type Filter =
  | 'ALL'
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'SERVICES_COMPLETED'
  | 'READY_FOR_DELIVERY';

const statusLabels: Record<string, string> = {
  RECEIVED: 'Recibida',
  WAITING: 'En espera',
  IN_PROGRESS: 'En proceso',
  SERVICES_COMPLETED: 'Servicios terminados',
  READY_FOR_DELIVERY: 'Lista para entregar',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const nextStatus: Partial<
  Record<OrderOperationalStatus, OrderOperationalStatus>
> = {
  WAITING: 'IN_PROGRESS',
  IN_PROGRESS: 'SERVICES_COMPLETED',
  SERVICES_COMPLETED: 'READY_FOR_DELIVERY',
  READY_FOR_DELIVERY: 'DELIVERED',
};

const nextActionLabel: Partial<Record<OrderOperationalStatus, string>> = {
  WAITING: 'Iniciar trabajo',
  IN_PROGRESS: 'Terminar servicios',
  SERVICES_COMPLETED: 'Preparar entrega',
  READY_FOR_DELIVERY: 'Entregar vehículo',
};

export function HoldOrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [payingId, setPayingId] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethodResponse[]
  >([]);

  const [cashRegisters, setCashRegisters] = useState<
    CashRegisterSummaryResponse[]
  >([]);

  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [cashRegisterId, setCashRegisterId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  function loadOrders(): Promise<void> {
    setLoading(true);
    setError('');

    return api
      .orders()
      .then(setOrders)
      .catch((reason: Error) => {
        setError(reason.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function loadPaymentConfiguration(): Promise<void> {
    try {
      const [methods, registers] = await Promise.all([
        api.paymentMethods(),
        api.cashRegisters(),
      ]);

      setPaymentMethods(methods);
      setCashRegisters(registers);

      setPaymentMethodId(methods[0]?.id ?? '');

      /*
       * Para CarWash/Taller tratamos de seleccionar automáticamente
       * una caja que no pertenezca al Coffee Bar.
       *
       * El operador todavía puede cambiarla manualmente.
       */
      const receptionRegister =
        registers.find((register) => {
          const code = register.code.toUpperCase();
          const name = register.name.toUpperCase();
          const posName = register.pointOfSaleName?.toUpperCase() ?? '';

          return (
            !code.includes('COFFEE') &&
            !name.includes('COFFEE') &&
            !posName.includes('COFFEE')
          );
        }) ?? registers[0];

      setCashRegisterId(receptionRegister?.id ?? '');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar la configuración de cobro.',
      );
    }
  }

  useEffect(() => {
    void loadOrders();
    void loadPaymentConfiguration();
  }, []);

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        filter === 'ALL' || order.operationalStatus === filter;

      const matchesQuery =
        !normalized ||
        order.orderNumber.toLowerCase().includes(normalized) ||
        order.customerAlias.toLowerCase().includes(normalized) ||
        order.vehicle.toLowerCase().includes(normalized) ||
        order.plate?.toLowerCase().includes(normalized);

      return matchesStatus && matchesQuery;
    });
  }, [orders, filter, query]);

  async function advance(order: OrderListItem): Promise<void> {
    const status = nextStatus[order.operationalStatus];

    if (!status) {
      return;
    }

    setWorkingId(order.id);
    setError('');
    setMessage('');

    try {
      const updated = await api.updateOrderStatus(order.id, status);

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                operationalStatus: updated.operationalStatus,
              }
            : item,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cambiar el estado.',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function payOrder(order: OrderListItem): Promise<void> {
    if (order.financialStatus === 'PAID') {
      setError('Esta orden ya está pagada.');
      return;
    }

    if (!paymentMethodId) {
      setError('Selecciona un método de pago.');
      return;
    }

    if (!cashRegisterId) {
      setError('Selecciona una caja.');
      return;
    }

    const register = cashRegisters.find(
      (item) => item.id === cashRegisterId,
    );

    if (!register) {
      setError('La caja seleccionada no está disponible.');
      return;
    }

    if (!register.openSession) {
      setError(
        `La caja "${register.name}" no tiene una sesión abierta.`,
      );
      return;
    }

    setPayingId(order.id);
    setError('');
    setMessage('');

    try {
      const result = await api.payOrder(order.id, {
        paymentMethodId,
        cashRegisterId,
        reference: paymentReference.trim() || undefined,
      });

      setMessage(
        `${result.orderNumber} cobrada correctamente. ` +
          `RD$ ${result.amount.toFixed(2)} registrados en caja.`,
      );

      setPaymentReference('');

      await loadOrders();
      await loadPaymentConfiguration();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cobrar la orden.',
      );
    } finally {
      setPayingId('');
    }
  }

  return (
    <main className="operations-page">
      <header className="operations-header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>Órdenes en HOLD</h1>
          <p>Control operativo, cobro y entrega de vehículos.</p>
        </div>

        <div className="hold-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(-1)}
          >
            ← Volver
          </button>

          <button
            type="button"
            onClick={() => navigate('/pos')}
          >
            Nueva orden
          </button>
        </div>
      </header>

      <section className="operations-toolbar">
        <div className="operations-search">
          <Search size={19} />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar orden, cliente, vehículo o placa"
          />
        </div>

        <div className="operations-filters">
          {(
            [
              ['ALL', 'Todas'],
              ['WAITING', 'En espera'],
              ['IN_PROGRESS', 'En proceso'],
              ['SERVICES_COMPLETED', 'Terminadas'],
              ['READY_FOR_DELIVERY', 'Por entregar'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={
                filter === value
                  ? 'operations-filter operations-filter--active'
                  : 'operations-filter'
              }
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="operations-error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="operations-success">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="operations-empty">
          Cargando órdenes...
        </div>
      ) : null}

      {!loading && visibleOrders.length === 0 ? (
        <div className="operations-empty">
          No hay órdenes que coincidan con el filtro.
        </div>
      ) : null}

      <section className="hold-grid">
        {visibleOrders.map((order) => (
          <article className="hold-card" key={order.id}>
            <div className="hold-card__header">
              <div>
                <span className="hold-card__number">
                  {order.orderNumber}
                </span>

                <strong>{order.vehicle}</strong>

                <small>
                  {order.vehicleType}
                  {order.plate ? ` · ${order.plate}` : ''}
                </small>
              </div>

              <span
                className={
                  `hold-status ` +
                  `hold-status--${order.operationalStatus.toLowerCase()}`
                }
              >
                {statusLabels[order.operationalStatus]}
              </span>
            </div>

            <div className="hold-card__meta">
              <div>
                <UserRound size={17} />
                <span>{order.customerAlias}</span>
              </div>

              <div>
                <Wrench size={17} />
                <span>
                  {order.servicesCount} servicios
                </span>
              </div>

              <div>
                <UserRound size={17} />

                <span>
                  {order.employees.length > 0
                    ? order.employees.join(', ')
                    : 'Sin personal asignado'}
                </span>
              </div>

              <div>
                <Clock3 size={17} />

                <span>
                  {new Date(order.entryAt).toLocaleString(
                    'es-DO',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    },
                  )}
                </span>
              </div>
            </div>

            <div className="hold-card__total">
              <CircleDollarSign size={20} />
              <span>Total</span>
              <strong>
                RD$ {order.total.toFixed(2)}
              </strong>
            </div>

            <div className="hold-financial-status">
              <strong>Estado financiero:</strong>

              <span>
                {order.financialStatus === 'PAID'
                  ? 'Pagada'
                  : order.financialStatus === 'CREDIT'
                    ? 'Crédito'
                    : 'Pendiente'}
              </span>
            </div>

            {order.financialStatus !== 'PAID' ? (
              <div className="hold-payment-box">
                <label>
                  Método de pago

                  <select
                    value={paymentMethodId}
                    onChange={(event) =>
                      setPaymentMethodId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Seleccionar método
                    </option>

                    {paymentMethods.map((method) => (
                      <option
                        key={method.id}
                        value={method.id}
                      >
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Caja

                  <select
                    value={cashRegisterId}
                    onChange={(event) =>
                      setCashRegisterId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Seleccionar caja
                    </option>

                    {cashRegisters.map((register) => (
                      <option
                        key={register.id}
                        value={register.id}
                      >
                        {register.name}
                        {register.openSession
                          ? ' · Abierta'
                          : ' · Cerrada'}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Referencia

                  <input
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(
                        event.target.value,
                      )
                    }
                    placeholder="Opcional"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => payOrder(order)}
                  disabled={payingId === order.id}
                >
                  <CircleDollarSign size={17} />

                  {payingId === order.id
                    ? 'Cobrando...'
                    : 'Cobrar orden'}
                </button>
              </div>
            ) : (
              <div className="operations-success">
                Orden pagada
              </div>
            )}

            <div className="hold-card__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(`/orders/${order.id}`)
                }
              >
                Ver orden
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(
                    `/orders/${order.id}/tickets`,
                  )
                }
              >
                <Printer size={17} />
                Reimprimir
              </button>

              {nextStatus[order.operationalStatus] ? (
                <button
                  type="button"
                  onClick={() => advance(order)}
                  disabled={
                    workingId === order.id ||
                    payingId === order.id
                  }
                >
                  {order.operationalStatus ===
                  'WAITING' ? (
                    <Play size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}

                  {workingId === order.id
                    ? 'Actualizando...'
                    : nextActionLabel[
                        order.operationalStatus
                      ]}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}