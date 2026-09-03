import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  PackageCheck,
  Save,
  TriangleAlert,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  LocationPointOfSaleResponse,
  ProductResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

export function InventoryTransfersPage() {
  const navigate = useNavigate();
  const [points, setPoints] = useState<LocationPointOfSaleResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [sourcePointId, setSourcePointId] = useState('');
  const [destinationPointId, setDestinationPointId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sourcePoint = useMemo(
    () => points.find((point) => point.id === sourcePointId) ?? null,
    [points, sourcePointId],
  );

  const destinationPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          point.id !== sourcePointId &&
          point.branchId !== sourcePoint?.branchId,
      ),
    [points, sourcePointId, sourcePoint?.branchId],
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [products, productId],
  );

  async function loadProducts(pointOfSaleId: string): Promise<void> {
    const rows = await api.adminProducts(pointOfSaleId);
    const inventoryRows = rows.filter(
      (product) => product.active && product.trackInventory,
    );
    setProducts(inventoryRows);
    setProductId(inventoryRows[0]?.id ?? '');
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([api.locationPoints(), api.posPoints()])
      .then(async ([allPoints, assignedPoints]) => {
        const activePoints = allPoints.filter((point) => point.active);
        const assignedIds = new Set(assignedPoints.map((point) => point.id));
        const initialSource =
          activePoints.find((point) => assignedIds.has(point.id)) ??
          activePoints[0];

        setPoints(activePoints);
        setSourcePointId(initialSource?.id ?? '');

        const initialDestination = activePoints.find(
          (point) =>
            point.id !== initialSource?.id &&
            point.branchId !== initialSource?.branchId,
        );
        setDestinationPointId(initialDestination?.id ?? '');

        if (initialSource) {
          await loadProducts(initialSource.id);
        }
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  async function changeSource(pointOfSaleId: string): Promise<void> {
    const nextSource = points.find((point) => point.id === pointOfSaleId);
    const nextDestination = points.find(
      (point) =>
        point.id !== pointOfSaleId &&
        point.branchId !== nextSource?.branchId,
    );

    setSourcePointId(pointOfSaleId);
    setDestinationPointId(nextDestination?.id ?? '');
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await loadProducts(pointOfSaleId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar el inventario de origen.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const numericQuantity = Number(quantity);

    if (!sourcePointId || !destinationPointId || !productId) {
      setError('Selecciona origen, destino y producto.');
      return;
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setError('La cantidad debe ser mayor que cero.');
      return;
    }

    if (selectedProduct && numericQuantity > selectedProduct.stockQuantity) {
      setError(
        `La cantidad supera la existencia disponible (${selectedProduct.stockQuantity}).`,
      );
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await api.transferInventory({
        sourcePointOfSaleId: sourcePointId,
        destinationPointOfSaleId: destinationPointId,
        productId,
        quantity: numericQuantity,
        note: note.trim() || undefined,
      });

      setMessage(
        `${result.reference}: ${result.quantity} unidades de ${result.productName} transferidas a ${result.destinationBranchName}.`,
      );
      setQuantity('');
      setNote('');
      await loadProducts(sourcePointId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible completar la transferencia.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <ArrowRightLeft size={22} />
          </div>
          <div className="maintenance-header__text">
            <h1>Transferencias de inventario</h1>
            <p>Traslada existencia entre sucursales con trazabilidad completa.</p>
          </div>
        </div>
        <div className="maintenance-toolbar__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/products')}
          >
            <ArrowLeft size={16} />
            Productos
          </button>
        </div>
      </header>

      {error ? (
        <div className="maintenance-alert maintenance-alert--error" role="alert">
          <TriangleAlert size={18} />
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="maintenance-alert maintenance-alert--success" role="status">
          <CheckCircle2 size={18} />
          {message}
        </div>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div>
            <p className="eyebrow">MOVIMIENTO ENTRE SUCURSALES</p>
            <h2>Nueva transferencia</h2>
          </div>
        </div>

        <form className="maintenance-modal__form" onSubmit={submit}>
          <div className="maintenance-modal__body inventory-movement-modal__grid">
            <label>
              Sucursal de origen
              <select
                value={sourcePointId}
                disabled={loading || saving}
                onChange={(event) => void changeSource(event.target.value)}
              >
                {points.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.branchName} · {point.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sucursal de destino
              <select
                value={destinationPointId}
                disabled={loading || saving}
                onChange={(event) => setDestinationPointId(event.target.value)}
              >
                {destinationPoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.branchName} · {point.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="inventory-movement-modal__wide">
              Producto
              <select
                value={productId}
                disabled={loading || saving}
                onChange={(event) => setProductId(event.target.value)}
              >
                {products.length === 0 ? (
                  <option value="">No hay productos con inventario</option>
                ) : null}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.sku} · Disponible: {product.stockQuantity}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cantidad a transferir
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                disabled={loading || saving}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>

            <div className="settings-note">
              <PackageCheck size={18} />
              Existencia disponible: <strong>{selectedProduct?.stockQuantity ?? 0}</strong>
            </div>

            <label className="inventory-movement-modal__wide">
              Nota o referencia
              <textarea
                rows={3}
                maxLength={255}
                value={note}
                disabled={loading || saving}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Motivo, transporte, documento de envío..."
              />
            </label>
          </div>

          <footer className="maintenance-modal__footer">
            <button
              type="submit"
              className="erp-button-primary"
              disabled={
                loading || saving || !productId || !destinationPointId
              }
            >
              <Save size={16} />
              {saving ? 'Transfiriendo...' : 'Completar transferencia'}
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}
