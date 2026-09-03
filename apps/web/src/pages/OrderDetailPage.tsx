import {
  BadgeDollarSign,
  CalendarClock,
  Car,
  CheckCircle2,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  FileText,
  House,
  MessageSquareText,
  RefreshCw,
  Plus,
  Printer,
  UserRound,
  Wrench,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  CatalogServiceResponse,
  EmployeeResponse,
  OrderOperationalStatus,
  OrderNoteResponse,
} from '@cactus/shared';
import { api, OrderDetail } from '../lib/api';
import './styles/OrderDetailPage.dashboard.css';

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

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [availableServices, setAvailableServices] = useState<CatalogServiceResponse[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeResponse[]>([]);
  const [additionalServiceId, setAdditionalServiceId] = useState('');
  const [additionalEmployeeId, setAdditionalEmployeeId] = useState('');
  const [additionalQuantity, setAdditionalQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteVisibility, setNoteVisibility] =
    useState<'INTERNAL' | 'CUSTOMER'>('INTERNAL');

  function loadOrder() {
    if (!id) return;

    setLoading(true);
    setError('');

    api.orderDetail(id)
      .then(async (result) => {
        setOrder(result);
        const [services, employees] = await Promise.all([
          api.services(result.vehicle.vehicleTypeId),
          api.employees(),
        ]);
        setAvailableServices(services);
        setAvailableEmployees(employees);
        setAdditionalServiceId(services[0]?.id ?? '');
        setAdditionalEmployeeId(employees[0]?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  const employees = useMemo(() => {
    if (!order) return [];

    return [
      ...new Set(
        order.services
          .map((service) => service.employeeName)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
  }, [order]);

  async function advanceStatus() {
    if (!order) return;

    const status = nextStatus[order.operationalStatus];

    if (!status) return;

    setWorking(true);
    setError('');

    try {
      await api.updateOrderStatus(order.id, status);
      loadOrder();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar el estado.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function toggleChecklist(
    code: string,
    label: string,
    checked: boolean,
    notes?: string | null,
  ) {
    if (!order) return;

    try {
      const updated = await api.updateChecklist(order.id, {
        code,
        label,
        checked,
        notes: notes ?? undefined,
      });

      setOrder((current) =>
        current
          ? {
              ...current,
              checklist: current.checklist.map((item) =>
                item.code === code ? updated : item,
              ),
            }
          : current,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar el checklist.',
      );
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order || !noteContent.trim()) return;

    try {
      const note = await api.addNote(order.id, {
        visibility: noteVisibility,
        content: noteContent.trim(),
      });

      setOrder((current) =>
        current
          ? {
              ...current,
              observations: [note, ...current.observations],
            }
          : current,
      );

      setNoteContent('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible agregar la observación.',
      );
    }
  }

  async function addAdditionalService(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!order || !additionalServiceId || !additionalEmployeeId || additionalQuantity < 1) {
      setError('Selecciona el servicio, el empleado y una cantidad válida.');
      return;
    }

    setAddingService(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await api.addOrderService(order.id, {
        serviceId: additionalServiceId,
        employeeId: additionalEmployeeId,
        quantity: additionalQuantity,
      });

      setSuccessMessage(result.message);
      setAdditionalQuantity(1);
      await loadOrder();

      window.open(
        `/orders/${order.id}/tickets?autoprint=1`,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible agregar el servicio.',
      );
    } finally {
      setAddingService(false);
    }
  }

  if (loading) {
    return <main className="order-center-loading">Cargando orden...</main>;
  }

  if (!order) {
    return (
      <main className="order-center-loading">
        <p>{error || 'La orden no está disponible.'}</p>
        <button type="button" onClick={() => navigate('/orders/hold')}>
          Volver
        </button>
      </main>
    );
  }

  return (
    <main className="order-center maintenance-page order-detail-maintenance">
      <header className="order-center__header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Car size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <div className="order-detail-maintenance__title-line">
              <h1>{order.vehicle.description}</h1>
              <span
                className={`hold-status hold-status--${order.operationalStatus.toLowerCase()}`}
              >
                {statusLabels[order.operationalStatus]}
              </span>
            </div>

            <p>
              {order.orderNumber}
              {' · '}
              {order.vehicle.vehicleType}
              {order.vehicle.plate
                ? ` · ${order.vehicle.plate}`
                : ' · Sin placa'}
            </p>
          </div>
        </div>

        <div className="order-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/orders/hold')}
          >
            ← Órdenes HOLD
          </button>

         

          <button
            type="button"
            className="secondary-button"
            onClick={loadOrder}
            disabled={loading || working || addingService}
          >
            <RefreshCw size={15} />
            Actualizar
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(`/orders/${order.id}/tickets`)}
          >
            <Printer size={15} />
            Reimprimir tickets
          </button>

          {nextStatus[order.operationalStatus] &&
          order.operationalStatus !== 'READY_FOR_DELIVERY' ? (
            <button
              type="button"
              onClick={advanceStatus}
              disabled={working}
            >
              <CheckCircle2 size={15} />
              {working
                ? 'Actualizando...'
                : nextActionLabel[order.operationalStatus]}
            </button>
          ) : null}
        </div>
      </header>

      {error ? <div className="operations-error">{error}</div> : null}
      {successMessage ? <div className="operations-success">{successMessage}</div> : null}

      <section className="order-center__grid">
        <aside className="order-center__left">
          <section className="order-panel-card">
            <div className="order-panel-title">
              <Car size={20} />
              <h2>Vehículo y cliente</h2>
            </div>

            <div className="detail-list">
              <div>
                <span>Cliente</span>
                <strong>{order.customerAlias}</strong>
              </div>
              <div>
                <span>Vehículo</span>
                <strong>{order.vehicle.description}</strong>
              </div>
              <div>
                <span>Tipo</span>
                <strong>{order.vehicle.vehicleType}</strong>
              </div>
              <div>
                <span>Placa</span>
                <strong>{order.vehicle.plate ?? 'No registrada'}</strong>
              </div>
              <div>
                <span>Entrada</span>
                <strong>
                  {new Date(order.entryAt).toLocaleString('es-DO')}
                </strong>
              </div>
            </div>
          </section>

          <section className="order-panel-card">
            <div className="order-panel-title">
              <ClipboardCheck size={20} />
              <h2>Checklist de recepción</h2>
            </div>

            <div className="checklist-list">
              {order.checklist.map((item) => (
                <label key={item.id} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(event) =>
                      toggleChecklist(
                        item.code,
                        item.label,
                        event.target.checked,
                        item.notes,
                      )
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="order-panel-card">
            <div className="order-panel-title">
              <CircleUserRound size={20} />
              <h2>Personal asignado</h2>
            </div>

            <div className="employee-list">
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <span key={employee}>
                    <UserRound size={17} />
                    {employee}
                  </span>
                ))
              ) : (
                <p>Sin personal asignado.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="order-center__main">
          <section className="order-panel-card add-service-panel">
            <div className="order-panel-title">
              <Plus size={20} />
              <h2>Agregar servicio adicional</h2>
            </div>

            <p className="panel-description">
              Los servicios existentes no pueden eliminarse. Los nuevos servicios quedarán registrados en el historial.
            </p>

            <form className="add-service-form" onSubmit={addAdditionalService}>
              <label>
                Servicio
                <select value={additionalServiceId} onChange={(event) => setAdditionalServiceId(event.target.value)}>
                  {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — RD$ {service.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Empleado
                <select value={additionalEmployeeId} onChange={(event) => setAdditionalEmployeeId(event.target.value)}>
                  {availableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Cantidad
                <input
                  type="number"
                  min={1}
                  value={additionalQuantity}
                  onChange={(event) => setAdditionalQuantity(Math.max(1, Number(event.target.value)))}
                />
              </label>

              <button type="submit" disabled={addingService}>
                <Plus size={17} />
                {addingService ? 'Agregando...' : 'Agregar servicio'}
              </button>
            </form>
          </section>

          <section className="order-panel-card">
            <div className="order-panel-title">
              <Wrench size={20} />
              <h2>Servicios de la orden</h2>
            </div>

            <div className="service-detail-list">
              {order.services.map((service) => (
                <article key={service.id} className="service-detail-row">
                  <div>
                    <strong>{service.serviceName}</strong>
                    <span>
                      {service.category ?? 'Servicio'} ·{' '}
                      {service.employeeName ?? 'Sin empleado'}
                    </span>
                  </div>

                  <div className="service-detail-quantity">
                    <span>
                      {service.quantity} × RD${' '}
                      {service.unitPrice.toFixed(2)}
                    </span>
                    <strong>
                      RD$ {service.lineTotal.toFixed(2)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="order-panel-card">
            <div className="order-panel-title">
              <MessageSquareText size={20} />
              <h2>Observaciones</h2>
            </div>

            <form className="note-form" onSubmit={addNote}>
              <select
                value={noteVisibility}
                onChange={(event) =>
                  setNoteVisibility(
                    event.target.value as 'INTERNAL' | 'CUSTOMER',
                  )
                }
              >
                <option value="INTERNAL">Interna</option>
                <option value="CUSTOMER">Visible al cliente</option>
              </select>

              <textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Escribe una observación..."
                rows={3}
              />

              <button type="submit">Agregar observación</button>
            </form>

            <div className="notes-list">
              {order.observations.length === 0 ? (
                <p className="muted">No hay observaciones registradas.</p>
              ) : (
                order.observations.map((note: OrderNoteResponse) => (
                  <article key={note.id} className="note-card">
                    <span
                      className={
                        note.visibility === 'INTERNAL'
                          ? 'note-type note-type--internal'
                          : 'note-type note-type--customer'
                      }
                    >
                      {note.visibility === 'INTERNAL'
                        ? 'Interna'
                        : 'Cliente'}
                    </span>
                    <p>{note.content}</p>
                    <small>
                      {new Date(note.createdAt).toLocaleString(
                        'es-DO',
                      )}
                    </small>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <aside className="order-center__right">
          <section className="order-panel-card total-card">
            <div className="order-panel-title">
              <BadgeDollarSign size={20} />
              <h2>Resumen financiero</h2>
            </div>

            <div className="totals-box">
              <div>
                <span>Subtotal</span>
                <strong>RD$ {order.subtotal.toFixed(2)}</strong>
              </div>
              <div>
                <span>Impuesto</span>
                <strong>RD$ {order.taxAmount.toFixed(2)}</strong>
              </div>
              <div className="grand-total">
                <span>Total</span>
                <strong>RD$ {order.total.toFixed(2)}</strong>
              </div>
            </div>

            <div className="financial-status-row">
              <span>Estado financiero</span>
              <strong>{order.financialStatus}</strong>
            </div>
          </section>

          <section className="order-panel-card">
            <div className="order-panel-title">
              <Clock3 size={20} />
              <h2>Timeline</h2>
            </div>

            <div className="timeline-list">
              {order.events.length === 0 ? (
                <p className="muted">Sin eventos registrados.</p>
              ) : (
                order.events.map((event) => (
                  <article key={event.id} className="timeline-item">
                    <span className="timeline-dot" />
                    <div>
                      <strong>{event.title}</strong>
                      {event.description ? (
                        <p>{event.description}</p>
                      ) : null}
                      <small>
                        {new Date(event.createdAt).toLocaleString(
                          'es-DO',
                        )}
                      </small>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="order-panel-card">
            <div className="order-panel-title">
              <FileText size={20} />
              <h2>Datos de control</h2>
            </div>

            <div className="detail-list">
              <div>
                <span>QR</span>
                <strong>{order.qrToken.slice(0, 12)}...</strong>
              </div>
              <div>
                <span>Servicios terminados</span>
                <strong>
                  {order.servicesCompletedAt
                    ? new Date(
                        order.servicesCompletedAt,
                      ).toLocaleString('es-DO')
                    : 'Pendiente'}
                </strong>
              </div>
              <div>
                <span>Pagada</span>
                <strong>
                  {order.paidAt
                    ? new Date(order.paidAt).toLocaleString('es-DO')
                    : 'Pendiente'}
                </strong>
              </div>
              <div>
                <span>Entregada</span>
                <strong>
                  {order.deliveredAt
                    ? new Date(
                        order.deliveredAt,
                      ).toLocaleString('es-DO')
                    : 'Pendiente'}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
