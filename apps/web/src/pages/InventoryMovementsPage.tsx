import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Boxes,
  Download,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  X,
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
  CreateInventoryMovementRequest,
  InventoryMovementResponse,
  InventoryMovementType,
  ProductResponse,
} from '@cactus/shared';

import { api } from '../lib/api';
import './styles/InventoryMovementsPage.dashboard.css';

type MovementType =
  CreateInventoryMovementRequest['type'];

type MovementFilter =
  | 'ALL'
  | InventoryMovementResponse['type'];

const movementLabels: Record<
  InventoryMovementType,
  string
> = {
  INITIAL: 'Existencia inicial',
  PURCHASE: 'Entrada / compra',
  SALE: 'Venta',
  ADJUSTMENT_IN: 'Ajuste positivo',
  ADJUSTMENT_OUT: 'Ajuste negativo',
  RETURN_IN: 'Devolución entrada',
  RETURN_OUT: 'Devolución salida',
  TRANSFER_OUT: 'Transferencia enviada',
  TRANSFER_IN: 'Transferencia recibida',
};

const entryTypes = new Set<
  InventoryMovementResponse['type']
>([
  'INITIAL',
  'PURCHASE',
  'ADJUSTMENT_IN',
  'RETURN_IN',
]);

export function InventoryMovementsPage() {
  const navigate = useNavigate();

  const { id = '' } = useParams();

  const [product, setProduct] =
    useState<ProductResponse | null>(null);

  const [movements, setMovements] =
    useState<InventoryMovementResponse[]>([]);

  const [query, setQuery] = useState('');

  const [
    movementTypeFilter,
    setMovementTypeFilter,
  ] = useState<MovementFilter>('ALL');

  const [dateFrom, setDateFrom] =
    useState('');

  const [dateTo, setDateTo] =
    useState('');

  const [type, setType] =
    useState<MovementType>('PURCHASE');

  const [quantity, setQuantity] =
    useState('1');

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState('');

  const [note, setNote] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [movementModalOpen, setMovementModalOpen] =
    useState(false);

  function clearFilters(): void {
    setQuery('');
    setMovementTypeFilter('ALL');
    setDateFrom('');
    setDateTo('');
  }

  async function load(): Promise<void> {
    if (!id) {
      return;
    }

    const [
      productRow,
      movementRows,
    ] = await Promise.all([
      api.adminProduct(id),
      api.inventoryMovements(id),
    ]);

    setProduct(productRow);
    setMovements(movementRows);
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

  const visibleMovements =
    useMemo(() => {
      const normalized =
        query.trim().toLowerCase();

      return movements.filter(
        (movement) => {
          if (
            movementTypeFilter !== 'ALL' &&
            movement.type !==
              movementTypeFilter
          ) {
            return false;
          }

          const movementDate =
            new Date(
              movement.createdAt,
            );

          if (dateFrom) {
            const from =
              new Date(
                `${dateFrom}T00:00:00`,
              );

            if (
              movementDate < from
            ) {
              return false;
            }
          }

          if (dateTo) {
            const to =
              new Date(
                `${dateTo}T23:59:59.999`,
              );

            if (
              movementDate > to
            ) {
              return false;
            }
          }

          if (!normalized) {
            return true;
          }

          const content = [
            movementLabels[
              movement.type
            ],
            movement.referenceNumber ??
              '',
            movement.referenceType ??
              '',
            movement.note ?? '',
            movement.createdBy ?? '',
          ]
            .join(' ')
            .toLowerCase();

          return content.includes(
            normalized,
          );
        },
      );
    }, [
      movements,
      query,
      movementTypeFilter,
      dateFrom,
      dateTo,
    ]);

  const totals = useMemo(() => {
    let entries = 0;
    let exits = 0;

    for (
      const movement
      of visibleMovements
    ) {
      if (
        entryTypes.has(
          movement.type,
        )
      ) {
        entries += movement.quantity;
      } else {
        exits += movement.quantity;
      }
    }

    return {
      entries,
      exits,
      movements:
        visibleMovements.length,
    };
  }, [visibleMovements]);


function exportKardexCsv(): void {
  if (!product || visibleMovements.length === 0) {
    return;
  }

  const headers = [
    'Fecha',
    'Movimiento',
    'Referencia',
    'Tipo referencia',
    'Entrada',
    'Salida',
    'Saldo',
    'Usuario',
    'Nota',
  ];

  const rows = visibleMovements.map((movement) => {
    const isEntry =
      entryTypes.has(movement.type);

    return [
      new Date(
        movement.createdAt,
      ).toLocaleString('es-DO'),

      movementLabels[movement.type],

      movement.referenceNumber ?? '',

      movement.referenceType ?? '',

      isEntry
        ? movement.quantity.toFixed(3)
        : '',

      !isEntry
        ? movement.quantity.toFixed(3)
        : '',

      movement.newStock.toFixed(3),

      movement.createdBy ?? 'Sistema',

      movement.note ?? '',
    ];
  });

  function escapeCsv(
    value: string,
  ): string {
    const escaped =
      value.replace(/"/g, '""');

    return `"${escaped}"`;
  }

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) =>
      row
        .map((value) =>
          escapeCsv(String(value)),
        )
        .join(','),
    ),
  ].join('\n');

  const bom = '\uFEFF';

  const blob = new Blob(
    [bom + csv],
    {
      type:
        'text/csv;charset=utf-8;',
    },
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  const safeName =
    product.name
      .replace(
        /[^a-zA-Z0-9-_]+/g,
        '-',
      )
      .replace(/^-+|-+$/g, '');

  link.href = url;

  link.download =
    `kardex-${safeName || product.sku}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}


  function printKardex(): void {
    if (!product) {
      return;
    }

    const rows =
      visibleMovements
        .map((movement) => {
          const isEntry =
            entryTypes.has(
              movement.type,
            );

          return `
            <tr>
              <td>
                ${new Date(
                  movement.createdAt,
                ).toLocaleString(
                  'es-DO',
                )}
              </td>

              <td>
                ${
                  movementLabels[
                    movement.type
                  ]
                }
              </td>

              <td>
                ${
                  movement.referenceNumber ??
                  '—'
                }
              </td>

              <td class="number">
                ${
                  isEntry
                    ? movement.quantity.toFixed(
                        3,
                      )
                    : '—'
                }
              </td>

              <td class="number">
                ${
                  !isEntry
                    ? movement.quantity.toFixed(
                        3,
                      )
                    : '—'
                }
              </td>

              <td class="number">
                ${movement.newStock.toFixed(
                  3,
                )}
              </td>

              <td>
                ${
                  movement.createdBy ??
                  'Sistema'
                }
              </td>
            </tr>
          `;
        })
        .join('');

    const printWindow =
      window.open('', '_blank');

    if (!printWindow) {
      setError(
        'El navegador bloqueó la ventana de impresión.',
      );

      return;
    }

    const period =
      dateFrom || dateTo
        ? `${dateFrom || 'Inicio'} — ${
            dateTo || 'Hoy'
          }`
        : 'Todo el historial';

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />

          <title>
            Kardex - ${product.name}
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 28px;
              color: #172019;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              font-size: 12px;
            }

            .header {
              display: flex;
              justify-content:
                space-between;
              gap: 30px;
              padding-bottom: 18px;
              border-bottom:
                2px solid #174d34;
            }

            h1 {
              margin: 4px 0;
              font-size: 24px;
            }

            h2 {
              margin: 0;
              color: #174d34;
              font-size: 14px;
            }

            p {
              margin: 4px 0;
            }

            .summary {
              display: grid;
              grid-template-columns:
                repeat(4, 1fr);
              gap: 10px;
              margin: 20px 0;
            }

            .summary div {
              padding: 10px;
              border:
                1px solid #d8dfda;
            }

            .summary span {
              display: block;
              color: #69736c;
              font-size: 10px;
            }

            .summary strong {
              display: block;
              margin-top: 4px;
              font-size: 16px;
            }

            table {
              width: 100%;
              border-collapse:
                collapse;
            }

            th,
            td {
              padding: 8px 6px;
              border-bottom:
                1px solid #dfe5e1;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f5f2;
              font-size: 10px;
            }

            .number {
              text-align: right;
            }

            .footer {
              margin-top: 20px;
              color: #69736c;
              font-size: 10px;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              <h2>
                CACTUS CARWASH ERP
              </h2>

              <h1>
                Kardex de inventario
              </h1>

              <p>
                <strong>
                  Producto:
                </strong>
                ${product.name}
              </p>

              <p>
                <strong>
                  SKU:
                </strong>
                ${product.sku}
              </p>
            </div>

            <div>
              <p>
                <strong>
                  Período:
                </strong>
                ${period}
              </p>

              <p>
                <strong>
                  Impreso:
                </strong>
                ${new Date().toLocaleString(
                  'es-DO',
                )}
              </p>
            </div>
          </div>

          <div class="summary">
            <div>
              <span>
                EXISTENCIA ACTUAL
              </span>

              <strong>
                ${product.stockQuantity.toFixed(
                  3,
                )}
              </strong>
            </div>

            <div>
              <span>
                ENTRADAS
              </span>

              <strong>
                ${totals.entries.toFixed(
                  3,
                )}
              </strong>
            </div>

            <div>
              <span>
                SALIDAS
              </span>

              <strong>
                ${totals.exits.toFixed(
                  3,
                )}
              </strong>
            </div>

            <div>
              <span>
                MOVIMIENTOS
              </span>

              <strong>
                ${totals.movements}
              </strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Movimiento</th>
                <th>Referencia</th>
                <th class="number">
                  Entrada
                </th>
                <th class="number">
                  Salida
                </th>
                <th class="number">
                  Saldo
                </th>
                <th>Usuario</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            Documento generado
            desde Cactus CarWash ERP.
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  async function submitMovement(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isFinite(
        parsedQuantity,
      ) ||
      parsedQuantity <= 0
    ) {
      setError(
        'La cantidad debe ser mayor que cero.',
      );

      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
  

    if (!product?.pointOfSaleId) {
      setError(
        'El producto no tiene un punto de venta asignado.',
      );
      return;
    }
    try {
      
     await api.createInventoryMovement(
        id,
        {
          pointOfSaleId:
            product.pointOfSaleId,

          type,

          quantity:
            parsedQuantity,

          referenceNumber:
            referenceNumber.trim() ||
            undefined,

          note:
            note.trim() ||
            undefined,
        },
      );

      await load();

      setQuantity('1');
      setReferenceNumber('');
      setNote('');

      setMessage(
        'Movimiento de inventario registrado correctamente.',
      );

      setMovementModalOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible registrar el movimiento.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="inventory-kardex-v2 maintenance-page">
      <header className="inventory-kardex-v2__header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Boxes size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>
              {product?.name ??
                'Movimientos por artículo'}
            </h1>

            <p>
              Kardex, entradas, salidas y ajustes del producto.
            </p>
          </div>
        </div>

        <div className="inventory-kardex-v2__header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate('/admin/products')
            }
          >
            <ArrowLeft size={15} />
            Productos
          </button>

        <button
          type="button"
          className="inventory-kardex-v2__refresh"
          onClick={() => {
            setLoading(true);

            load()
              .catch(
                (reason: Error) =>
                  setError(
                    reason.message,
                  ),
              )
              .finally(() =>
                setLoading(false),
              );
          }}
          disabled={
            loading || saving
          }
        >
          <RefreshCcw size={18} />
          Actualizar
        </button>
        </div>
      </header>

      {error ? (
        <div className="inventory-kardex-v2__error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="inventory-kardex-v2__success">
          {message}
        </div>
      ) : null}

      <section className="inventory-kardex-v2__summary">
        <article>
          <Boxes size={24} />

          <span>
            Existencia actual
          </span>

          <strong>
            {product?.stockQuantity.toFixed(
              3,
            ) ?? '0.000'}
          </strong>

          <small>
            {product?.sku}
          </small>
        </article>

        <article>
          <ArrowDownToLine size={22} />

          <span>
            Entradas
          </span>

          <strong>
            {totals.entries.toFixed(
              3,
            )}
          </strong>
        </article>

        <article>
          <ArrowUpFromLine size={22} />

          <span>
            Salidas
          </span>

          <strong>
            {totals.exits.toFixed(
              3,
            )}
          </strong>
        </article>

        <article>
          <span>
            Movimientos
          </span>

          <strong>
            {totals.movements}
          </strong>
        </article>
      </section>

      <section className="inventory-kardex-v2__layout">
        <section className="inventory-kardex-v2__history">
          <div className="inventory-kardex-v2__history-header">
            <div>
              <span>
                KARDEX
              </span>

              <h2>
                Historial de movimientos
              </h2>
            </div>

            <div className="inventory-kardex-v2__history-actions">
              <button className="erp-button-primary"
                type="button"
                onClick={() => setMovementModalOpen(true)}
                disabled={!product?.trackInventory}
              >
                <Save size={15} />
                Nuevo movimiento
              </button>

              <div className="inventory-kardex-v2__search">
                <Search size={18} />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Buscar referencia, nota o usuario"
              />
              </div>
            </div>
          </div>

          <div className="inventory-kardex-v2__filters">
            <label>
              Desde

              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              Hasta

              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              Tipo

              <select
                value={
                  movementTypeFilter
                }
                onChange={(event) =>
                  setMovementTypeFilter(
                    event.target
                      .value as MovementFilter,
                  )
                }
              >
                <option value="ALL">
                  Todos
                </option>

                <option value="SALE">
                  Ventas
                </option>

                <option value="PURCHASE">
                  Compras / entradas
                </option>

                <option value="ADJUSTMENT_IN">
                  Ajustes positivos
                </option>

                <option value="ADJUSTMENT_OUT">
                  Ajustes negativos
                </option>

                <option value="RETURN_IN">
                  Devoluciones entrada
                </option>

                <option value="RETURN_OUT">
                  Devoluciones salida
                </option>

                <option value="INITIAL">
                  Inventario inicial
                </option>
              </select>
            </label>

            <div className="inventory-kardex-v2__filter-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={clearFilters}
              >
                <RotateCcw size={17} />
                Limpiar filtros
              </button>

              <button className="secondary-button"
                type="button"
                onClick={printKardex}
                disabled={
                  !product ||
                  visibleMovements.length ===
                    0
                }
              >
                <Printer size={17} />
                Imprimir Kardex
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={exportKardexCsv}
                disabled={
                    !product ||
                    visibleMovements.length === 0
                }
                >
                <Download size={17} />
                Exportar CSV
                </button>
            </div>
          </div>

          {loading ? (
            <div className="inventory-kardex-v2__empty">
              Cargando movimientos...
            </div>
          ) : null}

          {!loading &&
          visibleMovements.length ===
            0 ? (
            <div className="inventory-kardex-v2__empty">
              No hay movimientos que
              coincidan con los filtros.
            </div>
          ) : null}

          <div className="inventory-kardex-v2__table-wrap">
            <table className="inventory-kardex-v2__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Referencia</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Saldo</th>
                  <th>Usuario</th>
                </tr>
              </thead>

              <tbody>
                {visibleMovements.map(
                  (movement) => {
                    const isEntry =
                      entryTypes.has(
                        movement.type,
                      );

                    return (
                      <tr
                        key={
                          movement.id
                        }
                      >
                        <td>
                          {new Date(
                            movement.createdAt,
                          ).toLocaleString(
                            'es-DO',
                          )}
                        </td>

                        <td>
                          <strong>
                            {
                              movementLabels[
                                movement.type
                              ]
                            }
                          </strong>

                          {movement.note ? (
                            <small>
                              {
                                movement.note
                              }
                            </small>
                          ) : null}
                        </td>

                        <td>
                          {movement.referenceNumber ??
                            '—'}
                        </td>

                        <td>
                          {isEntry
                            ? movement.quantity.toFixed(
                                3,
                              )
                            : '—'}
                        </td>

                        <td>
                          {!isEntry
                            ? movement.quantity.toFixed(
                                3,
                              )
                            : '—'}
                        </td>

                        <td>
                          <strong>
                            {movement.newStock.toFixed(
                              3,
                            )}
                          </strong>
                        </td>

                        <td>
                          {movement.createdBy ??
                            'Sistema'}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {movementModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setMovementModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal inventory-movement-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-movement-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">INVENTARIO</p>
                <h2 id="inventory-movement-modal-title">
                  Registrar movimiento
                </h2>
                <p>
                  Registra entradas, ajustes o devoluciones del artículo.
                </p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                onClick={() => setMovementModalOpen(false)}
                disabled={saving}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={(event) =>
                void submitMovement(event)
              }
            >
              <div className="maintenance-modal__body inventory-movement-modal__grid">
                <label>
                  Tipo
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(
                        event.target.value as MovementType,
                      )
                    }
                  >
                    <option value="PURCHASE">Entrada / compra</option>
                    <option value="ADJUSTMENT_IN">Ajuste positivo</option>
                    <option value="ADJUSTMENT_OUT">Ajuste negativo</option>
                    <option value="RETURN_IN">Devolución entrada</option>
                    <option value="RETURN_OUT">Devolución salida</option>
                  </select>
                </label>

                <label>
                  Cantidad
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                  />
                </label>

                <label className="inventory-movement-modal__wide">
                  Referencia
                  <input
                    value={referenceNumber}
                    onChange={(event) =>
                      setReferenceNumber(event.target.value)
                    }
                    placeholder="Factura, compra, ajuste..."
                  />
                </label>

                <label className="inventory-movement-modal__wide">
                  Nota
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(event) =>
                      setNote(event.target.value)
                    }
                    placeholder="Motivo u observación"
                  />
                </label>
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMovementModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button className="erp-button-primary"
                  type="submit"
                  disabled={
                    saving ||
                    !product?.trackInventory
                  }
                >
                  <Save size={15} />
                  {saving
                    ? 'Registrando...'
                    : 'Registrar movimiento'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
