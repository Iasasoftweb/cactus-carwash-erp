import {
  AlertTriangle,
  Boxes,
  Link2,
  Save,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  AssignProductToPointRequest,
  LocationPointOfSaleResponse,
  PointOfSaleResponse,
  PreparationStationResponse,
  ProductResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

const MAX_BULK_PRODUCTS = 1000;

export type ProductAssignmentMode = 'bulk' | 'detail' | null;

type ProductAssignmentModalsProps = {
  mode: ProductAssignmentMode;
  onClose: () => void;
  onCompleted?: () => void | Promise<void>;
};

export function ProductAssignmentModals({
  mode,
  onClose,
  onCompleted,
}: ProductAssignmentModalsProps) {

  const [points, setPoints] = useState<LocationPointOfSaleResponse[]>([]);
  const [pointId, setPointId] = useState('');
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stations, setStations] = useState<PreparationStationResponse[]>([]);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialStocks, setInitialStocks] = useState<Record<string, string>>({});

  const [productId, setProductId] = useState('');
  const [preparationStationId, setPreparationStationId] = useState('');
  const [price, setPrice] = useState('0');
  const [minimumPrice, setMinimumPrice] = useState('0');
  const [unitCost, setUnitCost] = useState('');
  const [minimumStock, setMinimumStock] = useState('0');
  const [trackInventory, setTrackInventory] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === productId) ?? null,
    [products, productId],
  );

  const categories = useMemo(() => {
    const values = new Map<string, string>();

    products.forEach((product) => {
      if (product.categoryId) {
        values.set(
          product.categoryId,
          product.categoryName || 'Sin categoría',
        );
      }
    });

    return [...values.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();

    return products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const searchable = [
        product.sku,
        product.barcode ?? '',
        product.name,
        product.categoryName,
      ]
        .join(' ')
        .toLocaleLowerCase();

      return searchable.includes(normalized);
    });
  }, [products, search, categoryId]);

  const selectedCount = selectedIds.size;

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selectedIds.has(product.id));

  async function loadPoint(currentPointId: string): Promise<void> {
    const [productRows, stationRows] = await Promise.all([
      api.catalogProducts(currentPointId),
      api.preparationStations(currentPointId),
    ]);

    setProducts(productRows);
    setStations(stationRows);

    setProductId((current) => {
      if (productRows.some((product) => product.id === current)) {
        return current;
      }

      return productRows[0]?.id ?? '';
    });

    setPreparationStationId('');
  }

  useEffect(() => {
    setLoading(true);

    Promise.all([
      api.locationPoints(),
      api.posPoints(),
    ])
      .then(async ([allPoints, assignedPoints]) => {
        const activePoints = allPoints.filter((point) => point.active);

        setPoints(activePoints);

        const assignedPointIds = new Set(
          assignedPoints.map(
            (point: PointOfSaleResponse) => point.id,
          ),
        );

        const first =
          activePoints.find((point) =>
            assignedPointIds.has(point.id),
          ) ??
          activePoints[0];

        if (!first) {
          throw new Error(
            'No existe un punto de venta disponible.',
          );
        }

        setPointId(first.id);
        await loadPoint(first.id);
      })
      .catch((reason: Error) => {
        setError(reason.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setPrice(selectedProduct.price.toString());

    setMinimumPrice(
      (
        selectedProduct.minimumPrice ??
        selectedProduct.price
      ).toString(),
    );

    setUnitCost(
      selectedProduct.unitCost === null
        ? ''
        : selectedProduct.unitCost.toString(),
    );

    setMinimumStock(
      selectedProduct.minimumStock.toString(),
    );

    setTrackInventory(
      selectedProduct.trackInventory,
    );
  }, [selectedProduct]);

  async function changePoint(
    nextPointId: string,
  ): Promise<void> {
    setPointId(nextPointId);
    setSelectedIds(new Set());
    setInitialStocks({});
    setSearch('');
    setCategoryId('');
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await loadPoint(nextPointId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar el punto de venta.',
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleProduct(productIdToToggle: string): void {
    setError('');

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(productIdToToggle)) {
        next.delete(productIdToToggle);
        return next;
      }

      if (next.size >= MAX_BULK_PRODUCTS) {
        setError(
          `Puedes asignar hasta ${MAX_BULK_PRODUCTS} artículos por operación.`,
        );
        return current;
      }

      next.add(productIdToToggle);
      return next;
    });
  }

  function setInitialStock(
    productIdToUpdate: string,
    value: string,
  ): void {
    setInitialStocks((current) => ({
      ...current,
      [productIdToUpdate]: value,
    }));
  }

  function closeBulkModal(): void {
    if (bulkSaving) {
      return;
    }

    onClose();
    setSelectedIds(new Set());
    setInitialStocks({});
    setSearch('');
    setCategoryId('');
    setError('');
  }

  function closeDetailModal(): void {
    if (saving) {
      return;
    }

    onClose();
    setError('');
  }

  function toggleAllVisible(): void {
    setError('');

    setSelectedIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        filteredProducts.forEach((product) => {
          next.delete(product.id);
        });

        return next;
      }

      const candidates = filteredProducts.filter(
        (product) => !next.has(product.id),
      );

      const available =
        MAX_BULK_PRODUCTS - next.size;

      candidates
        .slice(0, available)
        .forEach((product) => {
          next.add(product.id);
        });

      if (candidates.length > available) {
        setError(
          `La operación está limitada a ${MAX_BULK_PRODUCTS} artículos. Se seleccionaron los primeros ${MAX_BULK_PRODUCTS}.`,
        );
      }

      return next;
    });
  }

  async function submitBulk(): Promise<void> {
    if (!pointId) {
      setError(
        'Selecciona un punto de venta.',
      );
      return;
    }

    if (selectedIds.size === 0) {
      setError(
        'Selecciona al menos un artículo.',
      );
      return;
    }

    if (selectedIds.size > MAX_BULK_PRODUCTS) {
      setError(
        `Puedes asignar hasta ${MAX_BULK_PRODUCTS} artículos por operación.`,
      );
      return;
    }

    const bulkItems = [...selectedIds].map(
      (selectedProductId) => {
        const product = products.find(
          (item) => item.id === selectedProductId,
        );

        const rawValue =
          initialStocks[selectedProductId] ?? '0';

        const initialStock = product?.trackInventory
          ? Number(rawValue || '0')
          : 0;

        return {
          productId: selectedProductId,
          initialStock,
        };
      },
    );

    const invalidItem = bulkItems.find(
      (item) =>
        !Number.isFinite(item.initialStock) ||
        item.initialStock < 0 ||
        Math.round(item.initialStock * 1000) !==
          item.initialStock * 1000,
    );

    if (invalidItem) {
      setError(
        'La existencia inicial debe ser un número válido, no negativo y con máximo 3 decimales.',
      );
      return;
    }

    setBulkSaving(true);
    setError('');
    setMessage('');

    try {
      const result =
        await api.bulkAssignProductsToPoint({
          pointOfSaleId: pointId,
          products: bulkItems,
        });

      const summary =
        result.failed > 0
          ? `Asignación procesada: ${result.assigned} asignados y ${result.failed} con error.`
          : `${result.assigned} artículo${result.assigned === 1 ? '' : 's'} asignado${result.assigned === 1 ? '' : 's'} correctamente.`;

      setMessage(
        result.inventoryInitialized > 0
          ? `${summary} Se inicializó inventario para ${result.inventoryInitialized} artículo${result.inventoryInitialized === 1 ? '' : 's'}.`
          : summary,
      );

      if (result.failed > 0) {
        const firstErrors = result.errors
          .slice(0, 3)
          .map((item) => item.message)
          .join(' · ');

        setError(
          result.failed > 3
            ? `${firstErrors} · y ${result.failed - 3} error(es) adicional(es).`
            : firstErrors,
        );
      }

      setSelectedIds(new Set());
      setInitialStocks({});

      await loadPoint(pointId);
      await onCompleted?.();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible realizar la asignación masiva.',
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function submitIndividual(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!pointId || !productId) {
      setError(
        'Punto de venta y producto son obligatorios.',
      );
      return;
    }

    const payload: AssignProductToPointRequest = {
      pointOfSaleId: pointId,
      preparationStationId:
        preparationStationId || null,
      price: Number(price),
      minimumPrice: Number(minimumPrice),
      unitCost:
        unitCost.trim()
          ? Number(unitCost)
          : null,
      stockQuantity: 0,
      minimumStock:
        trackInventory
          ? Number(minimumStock)
          : 0,
      trackInventory,
    };

    const numericValues = [
      payload.price,
      payload.minimumPrice,
      payload.unitCost ?? 0,
      payload.stockQuantity,
      payload.minimumStock,
    ];

    if (
      numericValues.some(
        (value) =>
          !Number.isFinite(value) ||
          value < 0,
      )
    ) {
      setError(
        'Los valores comerciales no pueden ser negativos.',
      );
      return;
    }

    if (
      payload.price <
      payload.minimumPrice
    ) {
      setError(
        'El precio de venta no puede ser menor que el precio mínimo.',
      );
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.assignProductToPoint(
        productId,
        payload,
      );

      setMessage(
        'Producto asignado con existencia cero. Utiliza Transferir existencia para enviar unidades desde otra sucursal.',
      );

      await loadPoint(pointId);
      await onCompleted?.();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible asignar el producto.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (mode === null) {
    return null;
  }

  return (
    <>
      {error ? (
        <div
          className="settings-card"
          role="alert"
          style={{
            position: 'fixed',
            zIndex: 10001,
            left: '50%',
            top: 18,
            transform: 'translateX(-50%)',
            maxWidth: 760,
            width: 'calc(100% - 32px)',
            padding: '12px 16px',
            borderColor: '#f1b7b7',
            background: '#fff5f5',
            color: '#9f2626',
          }}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {mode === 'bulk' ? (

        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !bulkSaving
            ) {
              closeBulkModal();
            }
          }}
        >
          <section
            className="maintenance-modal maintenance-modal--xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-assignment-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">ASIGNACIÓN MASIVA</p>
                <h2 id="bulk-assignment-title">
                  Asignar varios artículos
                </h2>
                <p>
                  Selecciona artículos y define existencia
                  inicial cuando corresponda.
                </p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={bulkSaving}
                onClick={closeBulkModal}
              >
                ×
              </button>
            </header>

            <div className="maintenance-modal__body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(220px, 1fr) minmax(220px, 1fr)',
                  gap: 12,
                }}
              >
                <label>
                  Punto de venta
                  <select
                    value={pointId}
                    disabled={loading || bulkSaving}
                    onChange={(event) =>
                      void changePoint(event.target.value)
                    }
                  >
                    {points.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.name} · {point.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Buscar artículo
                  <input
                    type="search"
                    value={search}
                    disabled={loading || bulkSaving}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Nombre, SKU o código de barras"
                  />
                </label>

                <label>
                  Categoría
                  <select
                    value={categoryId}
                    disabled={loading || bulkSaving}
                    onChange={(event) =>
                      setCategoryId(event.target.value)
                    }
                  >
                    <option value="">
                      Todas las categorías
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  margin: '18px 0 12px',
                  flexWrap: 'wrap',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={
                      loading ||
                      bulkSaving ||
                      filteredProducts.length === 0
                    }
                    onChange={toggleAllVisible}
                  />
                  <strong>
                    Seleccionar todos los visibles
                  </strong>
                </label>

                <strong>
                  {selectedCount} seleccionado
                  {selectedCount === 1 ? '' : 's'}
                </strong>
              </div>

              <div
                className="maintenance-table-wrap"
                style={{
                  maxHeight: 480,
                  overflow: 'auto',
                }}
              >
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }} />
                      <th>SKU</th>
                      <th>Artículo</th>
                      <th>Categoría</th>
                      <th style={{ textAlign: 'right' }}>
                        Precio
                      </th>
                      <th>Inventario</th>
                      <th style={{ width: 170 }}>
                        Existencia inicial
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => {
                      const selected =
                        selectedIds.has(product.id);

                      return (
                        <tr key={product.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar ${product.name}`}
                              checked={selected}
                              disabled={bulkSaving}
                              onChange={() =>
                                toggleProduct(product.id)
                              }
                            />
                          </td>

                          <td>
                            <strong>{product.sku}</strong>
                          </td>

                          <td>{product.name}</td>

                          <td>
                            {product.categoryName ||
                              'Sin categoría'}
                          </td>

                          <td
                            style={{
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            RD$ {product.price.toFixed(2)}
                          </td>

                          <td>
                            {product.trackInventory
                              ? 'Controlado'
                              : 'No controla'}
                          </td>

                          <td>
                            {product.trackInventory ? (
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                inputMode="decimal"
                                value={
                                  initialStocks[product.id] ??
                                  '0'
                                }
                                disabled={
                                  bulkSaving || !selected
                                }
                                onChange={(event) =>
                                  setInitialStock(
                                    product.id,
                                    event.target.value,
                                  )
                                }
                                aria-label={`Existencia inicial de ${product.name}`}
                                style={{
                                  width: 130,
                                  textAlign: 'right',
                                }}
                              />
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {!loading &&
                    filteredProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            textAlign: 'center',
                            padding: 28,
                          }}
                        >
                          No hay artículos pendientes que
                          coincidan con los filtros.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <p style={{ marginTop: 14 }}>
                La existencia inicial solo se aplicará
                cuando el artículo controle inventario y
                no tenga historial previo en la sucursal.
              </p>
            </div>

            <footer className="maintenance-modal__footer">
              <button
                type="button"
                className="secondary-button"
                disabled={bulkSaving}
                onClick={closeBulkModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="erp-button-primary"
                disabled={
                  loading ||
                  bulkSaving ||
                  selectedCount === 0
                }
                onClick={() => void submitBulk()}
              >
                <Save size={16} />
                {bulkSaving
                  ? 'Asignando...'
                  : `Asignar ${selectedCount} artículo${selectedCount === 1 ? '' : 's'}`}
              </button>
            </footer>
          </section>
        </div>

      ) : null}

      {mode === 'detail' ? (

        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeDetailModal();
            }
          }}
        >
          <section
            className="maintenance-modal maintenance-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-assignment-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">
                  CONFIGURACIÓN INDIVIDUAL
                </p>
                <h2 id="detail-assignment-title">
                  Asignación detallada
                </h2>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeDetailModal}
              >
                ×
              </button>
            </header>

            <form
          className="maintenance-modal__form"
          onSubmit={submitIndividual}
        >
          <div className="maintenance-modal__body">
            <section className="maintenance-section maintenance-section--first">
              <div>
                <h3>Destino y producto</h3>
                <p>
                  Configura individualmente el
                  artículo seleccionado.
                </p>
              </div>

              <div className="maintenance-form-grid">
                <label>
                  Punto de venta
                  <select
                    value={pointId}
                    disabled={
                      loading ||
                      saving ||
                      bulkSaving
                    }
                    onChange={(event) =>
                      void changePoint(
                        event.target.value,
                      )
                    }
                  >
                    {points.map((point) => (
                      <option
                        key={point.id}
                        value={point.id}
                      >
                        {point.name} · {point.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Producto empresarial
                  <select
                    value={productId}
                    disabled={
                      loading ||
                      saving ||
                      products.length === 0
                    }
                    onChange={(event) =>
                      setProductId(
                        event.target.value,
                      )
                    }
                  >
                    {products.length === 0 ? (
                      <option value="">
                        No hay productos pendientes
                      </option>
                    ) : null}

                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} · {product.sku}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Estación de preparación
                  <select
                    value={preparationStationId}
                    disabled={
                      loading || saving
                    }
                    onChange={(event) =>
                      setPreparationStationId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Sin estación
                    </option>

                    {stations
                      .filter((item) => item.active)
                      .map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="maintenance-section">
              <div>
                <h3>Valores comerciales</h3>
                <p>
                  La asignación no crea existencia.
                </p>
              </div>

              <div className="maintenance-form-grid">
                <label>
                  Precio
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    disabled={saving}
                    onChange={(event) =>
                      setPrice(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Precio mínimo
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimumPrice}
                    disabled={saving}
                    onChange={(event) =>
                      setMinimumPrice(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Costo unitario
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={unitCost}
                    disabled={saving}
                    onChange={(event) =>
                      setUnitCost(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Existencia mínima
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={minimumStock}
                    disabled={
                      saving ||
                      !trackInventory
                    }
                    onChange={(event) =>
                      setMinimumStock(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <label
                className="maintenance-switch"
                style={{ marginTop: 16 }}
              >
                <span>
                  <strong>
                    Controlar inventario
                  </strong>
                  <small>
                    Controla existencia y mínimo en
                    esta sucursal.
                  </small>
                </span>

                <input
                  type="checkbox"
                  checked={trackInventory}
                  disabled={saving}
                  onChange={(event) =>
                    setTrackInventory(
                      event.target.checked,
                    )
                  }
                />

                <i aria-hidden="true" />
              </label>
            </section>
          </div>

          <footer className="maintenance-modal__footer">
            <button
              type="submit"
              className="erp-button-primary"
              disabled={
                loading ||
                saving ||
                !productId
              }
            >
              <Save size={16} />
              {saving
                ? 'Asignando...'
                : 'Asignar artículo'}
            </button>
          </footer>
        </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
