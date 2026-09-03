import {
  Car,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  House,
  Plus,
  Play,
  RefreshCw,
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
import './styles/HoldOrdersPage.dashboard.css';

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
  const [creditingId, setCreditingId] = useState('');

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
  const [creditNotes, setCreditNotes] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');

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
       * una caja que no pertenezca al Punto de Venta.
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

  const selectedOrder = useMemo(
    () =>
      orders.find((order) => order.id === selectedOrderId) ??
      visibleOrders[0] ??
      null,
    [orders, selectedOrderId, visibleOrders],
  );

  useEffect(() => {
    if (!selectedOrderId && visibleOrders[0]) {
      setSelectedOrderId(visibleOrders[0].id);
      return;
    }

    if (
      selectedOrderId &&
      !visibleOrders.some((order) => order.id === selectedOrderId)
    ) {
      setSelectedOrderId(visibleOrders[0]?.id ?? '');
    }
  }, [visibleOrders, selectedOrderId]);

  const statusCounts = useMemo(
    () => ({
      ALL: orders.length,
      WAITING: orders.filter(
        (order) => order.operationalStatus === 'WAITING',
      ).length,
      IN_PROGRESS: orders.filter(
        (order) => order.operationalStatus === 'IN_PROGRESS',
      ).length,
      SERVICES_COMPLETED: orders.filter(
        (order) => order.operationalStatus === 'SERVICES_COMPLETED',
      ).length,
      READY_FOR_DELIVERY: orders.filter(
        (order) => order.operationalStatus === 'READY_FOR_DELIVERY',
      ).length,
    }),
    [orders],
  );

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

    if (order.financialStatus === 'CREDIT') {
      setError(
        'Esta orden ya fue autorizada a crédito y no puede cobrarse por este flujo.',
      );
      return;
    }

    if (order.financialStatus !== 'PENDING') {
      setError(
        'La orden no se encuentra disponible para cobro ordinario.',
      );
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

  async function authorizeCredit(
    order: OrderListItem,
  ): Promise<void> {
    if (order.financialStatus === 'CREDIT') {
      setError('Esta orden ya está autorizada a crédito.');
      return;
    }

    if (order.financialStatus !== 'PENDING') {
      setError(
        'Solo las órdenes financieramente pendientes pueden autorizarse a crédito.',
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Autorizar la orden ${order.orderNumber} a crédito por RD$ ${order.total.toFixed(2)}?`,
    );

    if (!confirmed) {
      return;
    }

    setCreditingId(order.id);
    setError('');
    setMessage('');

    try {
      const result =
        await api.authorizeOrderCredit(
          order.id,
          {
            notes:
              creditNotes.trim() ||
              undefined,
          },
        );

      setMessage(
        `${result.orderNumber} autorizada a crédito por RD$ ${result.amount.toFixed(2)}. ` +
          `Nuevo uso de crédito: RD$ ${result.newExposure.toFixed(2)} de RD$ ${result.creditLimit.toFixed(2)}.`,
      );

      setCreditNotes('');

      await loadOrders();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible autorizar el crédito.',
      );
    } finally {
      setCreditingId('');
    }
  }

  return (
    <main className="operations-page maintenance-page hold-orders-pro" style={{marginTop:"10px"}} >
      <header className="hold-orders-pro__header ">
        <div className="hold-orders-pro__header-main ">
          <div className="hold-orders-pro__header-icon">
            <Car size={24} strokeWidth={1.8} />
          </div>

          <div>
            <h1>Órdenes en HOLD</h1>
            <p>Gestiona y avanza las órdenes operativas del taller.</p>
          </div>
        </div>

        <div className="hold-orders-pro__header-actions">
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
            onClick={() => navigate('/pos')}
          >
            <Plus size={15} />
            Nueva orden
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void loadOrders();
              void loadPaymentConfiguration();
            }}
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
        </div>
      </header>

      <section className="hold-orders-pro__toolbar">
        <div className="hold-orders-pro__search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por orden, cliente, vehículo o placa..."
          />
        </div>

        <div className="hold-orders-pro__filters">
          {(
            [
              ['ALL', 'Todos'],
              ['WAITING', 'En espera'],
              ['IN_PROGRESS', 'En proceso'],
              ['SERVICES_COMPLETED', 'Servicios terminados'],
              ['READY_FOR_DELIVERY', 'Listas para entregar'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={
                filter === value
                  ? `hold-orders-pro__filter hold-orders-pro__filter--${value.toLowerCase()} active`
                  : `hold-orders-pro__filter hold-orders-pro__filter--${value.toLowerCase()}`
              }
              onClick={() => setFilter(value)}
            >
              <span>{label}</span>
              <strong>{statusCounts[value]}</strong>
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="maintenance-alert maintenance-alert--error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="maintenance-alert maintenance-alert--success">
          {message}
        </div>
      ) : null}

      <section className="hold-orders-pro__content">
        <div className="hold-orders-pro__main">
          <div className="hold-orders-pro__section-heading">
            <strong>{visibleOrders.length}</strong>
            <span>
              {visibleOrders.length === 1
                ? 'orden encontrada'
                : 'órdenes encontradas'}
            </span>
          </div>

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

          <div className="hold-orders-pro__grid">
            {visibleOrders.map((order) => (
              <article
                className={
                  selectedOrder?.id === order.id
                    ? 'hold-orders-pro__card selected'
                    : 'hold-orders-pro__card'
                }
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="hold-orders-pro__card-head">
                  <div className="hold-orders-pro__order-title">
                    <strong>{order.orderNumber}</strong>

                    <span
                      className={`hold-status hold-status--${order.operationalStatus.toLowerCase()}`}
                    >
                      {statusLabels[order.operationalStatus]}
                    </span>
                  </div>

                  <time>
                    {new Date(order.entryAt).toLocaleString(
                      'es-DO',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      },
                    )}
                  </time>
                </div>

                <div className="hold-orders-pro__identity">
                  <span>
                    <UserRound size={15} />
                    {order.customerAlias}
                  </span>

                  <span>
                    <Car size={15} />
                    {order.vehicle}
                  </span>

                  <span>
                    <FileText size={15} />
                    {order.plate ?? 'Sin placa'}
                  </span>
                </div>

                <div className="hold-orders-pro__service-line">
                  <span>
                    <Wrench size={15} />
                    {order.servicesCount}{' '}
                    {order.servicesCount === 1
                      ? 'servicio'
                      : 'servicios'}
                  </span>

                  <strong>
                    RD$ {order.total.toFixed(2)}
                  </strong>
                </div>

                <div className="hold-orders-pro__card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/orders/${order.id}`);
                    }}
                  >
                    Ver detalle
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/orders/${order.id}/tickets`);
                    }}
                  >
                    <Printer size={15} />
                    Imprimir ticket
                  </button>

                  {nextStatus[order.operationalStatus] ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void advance(order);
                      }}
                      disabled={
                        workingId === order.id ||
                        payingId === order.id ||
                        creditingId === order.id
                      }
                    >
                      {order.operationalStatus === 'WAITING' ? (
                        <Play size={15} />
                      ) : (
                        <Sparkles size={15} />
                      )}

                      {workingId === order.id
                        ? 'Actualizando...'
                        : nextActionLabel[order.operationalStatus]}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="hold-orders-pro__sidebar">
          <section className="hold-orders-pro__side-card hold-orders-pro__payment-card">
            <div className="hold-orders-pro__side-title">
              <CircleDollarSign size={18} />
              <h2>Cobrar orden</h2>
            </div>

            {selectedOrder ? (
              <>
                <div className="hold-orders-pro__selected-order">
                  <span>{selectedOrder.orderNumber}</span>
                  <strong>
                    RD$ {selectedOrder.total.toFixed(2)}
                  </strong>
                </div>

                <p className="muted">
                  Estado financiero: {selectedOrder.financialStatus}
                </p>

                <label>
                  Método de pago
                  <select
                    value={paymentMethodId}
                    onChange={(event) =>
                      setPaymentMethodId(event.target.value)
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
                      setCashRegisterId(event.target.value)
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
                      setPaymentReference(event.target.value)
                    }
                    placeholder="Opcional"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    void payOrder(selectedOrder);
                  }}
                  disabled={
                    selectedOrder.financialStatus !== 'PENDING' ||
                    payingId === selectedOrder.id ||
                    creditingId === selectedOrder.id
                  }
                >
                  <CircleDollarSign size={15} />

                  {selectedOrder.financialStatus === 'PAID'
                    ? 'Orden pagada'
                    : selectedOrder.financialStatus === 'CREDIT'
                      ? 'Orden a crédito'
                      : payingId === selectedOrder.id
                        ? 'Cobrando...'
                        : 'Cobrar orden seleccionada'}
                </button>

                <div className="hold-orders-pro__credit-divider">
                  <span>o autorizar a crédito</span>
                </div>

                <label>
                  Observación de crédito
                  <textarea
                    value={creditNotes}
                    onChange={(event) =>
                      setCreditNotes(event.target.value)
                    }
                    placeholder="Opcional"
                    rows={3}
                    maxLength={255}
                    disabled={
                      selectedOrder.financialStatus !== 'PENDING' ||
                      payingId === selectedOrder.id ||
                      creditingId === selectedOrder.id
                    }
                  />
                </label>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    void authorizeCredit(selectedOrder);
                  }}
                  disabled={
                    selectedOrder.financialStatus !== 'PENDING' ||
                    payingId === selectedOrder.id ||
                    creditingId === selectedOrder.id
                  }
                >
                  <FileText size={15} />

                  {selectedOrder.financialStatus === 'CREDIT'
                    ? 'Crédito autorizado'
                    : creditingId === selectedOrder.id
                      ? 'Autorizando crédito...'
                      : 'Autorizar crédito'}
                </button>
              </>
            ) : (
              <p className="muted">
                Selecciona una orden para habilitar el cobro.
              </p>
            )}
          </section>

          <section className="hold-orders-pro__side-card">
            <div className="hold-orders-pro__side-title">
              <ClipboardCheck size={18} />
              <h2>Resumen rápido</h2>
            </div>

            <div className="hold-orders-pro__stats">
              <div>
                <span>Total órdenes</span>
                <strong>{orders.length}</strong>
              </div>

              <div>
                <span>En espera</span>
                <strong>{statusCounts.WAITING}</strong>
              </div>

              <div>
                <span>En proceso</span>
                <strong>{statusCounts.IN_PROGRESS}</strong>
              </div>

              <div>
                <span>Servicios terminados</span>
                <strong>{statusCounts.SERVICES_COMPLETED}</strong>
              </div>

              <div>
                <span>Listas para entregar</span>
                <strong>{statusCounts.READY_FOR_DELIVERY}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}