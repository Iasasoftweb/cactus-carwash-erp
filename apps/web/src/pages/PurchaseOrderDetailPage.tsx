import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  House,
  PackageCheck,
  RefreshCcw,
  Save,
  Truck,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import type {
  PurchaseOrderReceiptResponse,
  PurchaseOrderResponse,
  ReceivePurchaseOrderRequest,
} from '@cactus/shared';
import { api } from '../lib/api';
import './styles/PurchaseOrderDetailPage.dashboard.css';

type ReceiveDraft = Record<
  string,
  string
>;

const STATUS_LABELS: Record<
  PurchaseOrderResponse['status'],
  string
> = {
  DRAFT: 'Borrador',
  OPEN: 'Abierta',
  PARTIALLY_RECEIVED: 'Recepción parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

function normalizeNumber(
  value: string,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();

  const [order, setOrder] =
    useState<PurchaseOrderResponse | null>(
      null,
    );

  const [receipts, setReceipts] =
    useState<PurchaseOrderReceiptResponse[]>([]);

  const [receiveDraft, setReceiveDraft] =
    useState<ReceiveDraft>({});

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [cancelling, setCancelling] =
    useState(false);

  const totalOrdered = useMemo(() => {
    if (!order) {
      return 0;
    }

    return order.items.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          item.unitCost,
      0,
    );
  }, [order]);

  const totalReceivedUnits =
    useMemo(() => {
      if (!order) {
        return 0;
      }

      return order.items.reduce(
        (sum, item) =>
          sum +
          item.receivedQuantity,
        0,
      );
    }, [order]);

  const totalPendingUnits =
    useMemo(() => {
      if (!order) {
        return 0;
      }

      return order.items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            item.quantity -
              item.receivedQuantity,
            0,
          ),
        0,
      );
    }, [order]);

  const canReceive =
    order !== null &&
    order.status !== 'RECEIVED' &&
    order.status !== 'CANCELLED';

    async function cancelOrder(): Promise<void> {
  if (!order) return;

  const confirmed = window.confirm(
    `¿Cancelar la orden ${order.orderNumber}?`,
  );

  if (!confirmed) {
    return;
  }

  setCancelling(true);
  setError('');
  setMessage('');

  try {
    const updated =
      await api.cancelPurchaseOrder(
        order.id,
      );

    setOrder(updated);
    initializeDraft(updated);

    setMessage(
      'Orden de compra cancelada correctamente.',
    );
  } catch (reason) {
    setError(
      reason instanceof Error
        ? reason.message
        : 'No fue posible cancelar la orden.',
    );
  } finally {
    setCancelling(false);
  }
}

  function initializeDraft(
    currentOrder:
      PurchaseOrderResponse,
  ): void {
    const nextDraft: ReceiveDraft =
      {};

    for (
      const item
      of currentOrder.items
    ) {
      const pending =
        Math.max(
          item.quantity -
            item.receivedQuantity,
          0,
        );

      nextDraft[item.id] =
        pending > 0
          ? pending.toString()
          : '0';
    }

    setReceiveDraft(nextDraft);
  }

  async function load(): Promise<void> {
    if (!id) {
      throw new Error(
        'Orden de compra no especificada.',
      );
    }

    const [
      orderRow,
      receiptRows,
    ] = await Promise.all([
      api.purchaseOrder(id),
      api.purchaseOrderReceipts(id),
    ]);

    setOrder(orderRow);
    setReceipts(receiptRows);
    initializeDraft(orderRow);
  }

  useEffect(() => {
    setLoading(true);
    setError('');

    load()
      .catch((reason: Error) =>
        setError(reason.message),
      )
      .finally(() =>
        setLoading(false),
      );
  }, [id]);

  function setReceivedQuantity(
    itemId: string,
    value: string,
  ): void {
    setReceiveDraft((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  function receiveAllPending(): void {
    if (!order) {
      return;
    }

    const nextDraft: ReceiveDraft =
      {};

    for (
      const item
      of order.items
    ) {
      const pending =
        Math.max(
          item.quantity -
            item.receivedQuantity,
          0,
        );

      nextDraft[item.id] =
        pending.toString();
    }

    setReceiveDraft(nextDraft);
    setError('');
  }

  function clearReception(): void {
    if (!order) {
      return;
    }

    const nextDraft: ReceiveDraft =
      {};

    for (
      const item
      of order.items
    ) {
      nextDraft[item.id] = '0';
    }

    setReceiveDraft(nextDraft);
    setError('');
  }

  async function receiveOrder(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!order) {
      return;
    }

    if (!canReceive) {
      setError(
        'Esta orden no admite nuevas recepciones.',
      );
      return;
    }

    const items =
      order.items
        .map((item) => {
          const quantity =
            normalizeNumber(
              receiveDraft[
                item.id
              ] ?? '0',
            );

          return {
            item,
            quantity,
          };
        })
        .filter(
          (row) =>
            row.quantity > 0,
        );

    if (items.length === 0) {
      setError(
        'Indica al menos una cantidad recibida.',
      );
      return;
    }

    for (
      const row
      of items
    ) {
      const pending =
        row.item.quantity -
        row.item.receivedQuantity;

      if (
        row.quantity >
        pending
      ) {
        setError(
          `La cantidad de ${row.item.productName} supera lo pendiente por recibir.`,
        );
        return;
      }
    }

    const payload:
      ReceivePurchaseOrderRequest =
      {
        items:
          items.map((row) => ({
            purchaseOrderItemId:
              row.item.id,
            quantity:
              row.quantity,
          })),
      };

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const updated =
        await api.receivePurchaseOrder(
          order.id,
          payload,
        );

      setOrder(updated);
      initializeDraft(updated);

      const receiptRows =
        await api.purchaseOrderReceipts(
          order.id,
        );

      setReceipts(receiptRows);

      setMessage(
        updated.status ===
          'RECEIVED'
          ? 'Orden recibida completamente. Inventario actualizado.'
          : 'Recepción registrada correctamente. La orden continúa pendiente.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible registrar la recepción.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading &&
    !order
  ) {
    return (
      <main className="purchase-order-detail-v2 maintenance-page">
        <div className="purchase-order-detail-v2__empty">
          Cargando orden de compra...
        </div>
      </main>
    );
  }

  return (
    <main className="purchase-order-detail-v2 maintenance-page">
      <header className="purchase-order-detail-v2__header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <ClipboardCheck size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>
              {order?.orderNumber ?? 'Orden de compra'}
            </h1>

            <p>
              {order
                ? `${order.supplierName} · ${STATUS_LABELS[order.status]}`
                : 'Detalle de compra'}
            </p>
          </div>
        </div>

        <div className="purchase-order-detail-v2__header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/purchases/orders')}
          >
            <ArrowLeft size={15} />
            Órdenes
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
            className="secondary-button"
            onClick={() => {
              setLoading(true);
              setError('');

              load()
                .catch((reason: Error) =>
                  setError(reason.message),
                )
                .finally(() =>
                  setLoading(false),
                );
            }}
            disabled={loading || saving}
          >
            <RefreshCcw size={15} />
            Actualizar
          </button>

          {order?.status === 'OPEN' ? (
            <button
              type="button"
              className="secondary-button purchase-order-detail-v2__cancel"
              onClick={() => {
                void cancelOrder();
              }}
              disabled={loading || saving || cancelling}
            >
              {cancelling ? 'Cancelando...' : 'Cancelar orden'}
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="purchase-order-detail-v2__error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="purchase-order-detail-v2__success">
          {message}
        </div>
      ) : null}

      {order ? (
        <>
          <section className="purchase-order-detail-v2__summary">
            <article>
              <Truck size={22} />

              <span>
                Proveedor
              </span>

              <strong>
                {order.supplierName}
              </strong>
            </article>

            <article>
              <ClipboardCheck
                size={22}
              />

              <span>
                Estado
              </span>

              <strong>
                {
                  STATUS_LABELS[
                    order.status
                  ]
                }
              </strong>
            </article>

            <article>
              <PackageCheck
                size={22}
              />

              <span>
                Recibido
              </span>

              <strong>
                {totalReceivedUnits.toFixed(
                  3,
                )}
              </strong>
            </article>

            <article>
              <CheckCircle2
                size={22}
              />

              <span>
                Pendiente
              </span>

              <strong>
                {totalPendingUnits.toFixed(
                  3,
                )}
              </strong>
            </article>
          </section>

          <section className="purchase-order-detail-v2__layout">
            <section className="purchase-order-detail-v2__detail">
              <div className="purchase-order-detail-v2__panel-title">
                <div>
                  <span>
                    DETALLE
                  </span>

                  <h2>
                    Productos ordenados
                  </h2>
                </div>

                <strong>
                  RD$ {totalOrdered.toFixed(
                    2,
                  )}
                </strong>
              </div>

              <div className="purchase-order-detail-v2__meta">
                <span>
                  Orden:
                  {' '}
                  {order.orderNumber}
                </span>

                <span>
                  Creada:
                  {' '}
                  {new Date(
                    order.createdAt,
                  ).toLocaleString(
                    'es-DO',
                  )}
                </span>

                {order.createdBy ? (
                  <span>
                    Usuario:
                    {' '}
                    {order.createdBy}
                  </span>
                ) : null}

                {order.notes ? (
                  <span>
                    Nota:
                    {' '}
                    {order.notes}
                  </span>
                ) : null}
              </div>

              <div className="purchase-order-detail-v2__table-wrap">
                <table className="purchase-order-detail-v2__table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>
                        Ordenado
                      </th>
                      <th>
                        Recibido
                      </th>
                      <th>
                        Pendiente
                      </th>
                      <th>
                        Costo
                      </th>
                      <th>
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.items.map(
                      (item) => {
                        const pending =
                          Math.max(
                            item.quantity -
                              item.receivedQuantity,
                            0,
                          );

                        return (
                          <tr
                            key={item.id}
                          >
                            <td>
                              <span>
                                {item.sku}
                              </span>

                              <strong>
                                {
                                  item.productName
                                }
                              </strong>
                            </td>

                            <td>
                              {item.quantity.toFixed(
                                3,
                              )}
                            </td>

                            <td>
                              {item.receivedQuantity.toFixed(
                                3,
                              )}
                            </td>

                            <td>
                              {pending.toFixed(
                                3,
                              )}
                            </td>

                            <td>
                              RD$ {item.unitCost.toFixed(
                                2,
                              )}
                            </td>

                            <td>
                              RD$ {(
                                item.quantity *
                                item.unitCost
                              ).toFixed(
                                2,
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="purchase-order-detail-v2__receive">
              <div className="purchase-order-detail-v2__panel-title">
                <div>
                  <span>
                    RECEPCIÓN
                  </span>

                  <h2>
                    Registrar mercancía
                  </h2>
                </div>
              </div>

              {!canReceive ? (
                <div className="purchase-order-detail-v2__closed">
                  {order.status ===
                  'RECEIVED'
                    ? 'La orden fue recibida completamente.'
                    : 'La orden está cancelada.'}
                </div>
              ) : (
                <form
                  className="purchase-order-detail-v2__receive-form"
                  onSubmit={(event) => {
                    void receiveOrder(
                      event,
                    );
                  }}
                >
                  <div className="purchase-order-detail-v2__receive-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        receiveAllPending
                      }
                      disabled={saving}
                    >
                      Recibir todo
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        clearReception
                      }
                      disabled={saving}
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="purchase-order-detail-v2__receive-list">
                    {order.items.map(
                      (item) => {
                        const pending =
                          Math.max(
                            item.quantity -
                              item.receivedQuantity,
                            0,
                          );

                        return (
                          <label
                            key={item.id}
                            className="purchase-order-detail-v2__receive-item"
                          >
                            <span>
                              <strong>
                                {
                                  item.productName
                                }
                              </strong>

                              <small>
                                Pendiente:
                                {' '}
                                {pending.toFixed(
                                  3,
                                )}
                              </small>
                            </span>

                            <input
                              type="number"
                              min="0"
                              max={
                                pending
                              }
                              step="0.001"
                              value={
                                receiveDraft[
                                  item.id
                                ] ??
                                '0'
                              }
                              onChange={(
                                event,
                              ) =>
                                setReceivedQuantity(
                                  item.id,
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                saving ||
                                pending <=
                                  0
                              }
                            />
                          </label>
                        );
                      },
                    )}
                  </div>

                  <button className="erp-button-primary"
                    type="submit"
                    disabled={saving}
                  >
                    <Save size={18} />

                    {saving
                      ? 'Registrando...'
                      : 'Registrar recepción'}
                  </button>
                </form>
              )}
            </aside>
          </section>

          <section className="purchase-order-detail-v2__receipts">
            <div className="purchase-order-detail-v2__panel-title">
              <div>
                <span>TRAZABILIDAD</span>
                <h2>Historial de recepciones</h2>
              </div>

              <strong>
                {receipts.length} movimientos
              </strong>
            </div>

            {receipts.length === 0 ? (
              <div className="purchase-order-detail-v2__empty purchase-order-detail-v2__empty--inline">
                Esta orden todavía no tiene recepciones registradas.
              </div>
            ) : (
              <div className="purchase-order-detail-v2__table-wrap">
                <table className="purchase-order-detail-v2__table purchase-order-detail-v2__receipts-table">
                  <thead>
                    <tr>
                      <th>Fecha / hora</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Stock anterior</th>
                      <th>Stock nuevo</th>
                      <th>Recibido por</th>
                    </tr>
                  </thead>

                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td>
                          {new Date(
                            receipt.receivedAt,
                          ).toLocaleString(
                            'es-DO',
                          )}
                        </td>

                        <td>
                          <span>{receipt.sku}</span>
                          <strong>
                            {receipt.productName}
                          </strong>
                        </td>

                        <td>
                          <strong>
                            {receipt.quantity.toFixed(3)}
                          </strong>
                        </td>

                        <td>
                          {receipt.previousStock.toFixed(3)}
                        </td>

                        <td>
                          <strong>
                            {receipt.newStock.toFixed(3)}
                          </strong>
                        </td>

                        <td>
                          {receipt.receivedBy ?? 'Sistema'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="purchase-order-detail-v2__empty">
          Orden de compra no encontrada.
        </div>
      )}
    </main>
  );
}

