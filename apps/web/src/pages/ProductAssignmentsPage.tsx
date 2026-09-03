import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  Link2,
  Save,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AssignProductToPointRequest,
  LocationPointOfSaleResponse,
  PointOfSaleResponse,
  PreparationStationResponse,
  ProductResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

export function ProductAssignmentsPage() {
  const navigate = useNavigate();
  const [points, setPoints] = useState<LocationPointOfSaleResponse[]>([]);
  const [pointId, setPointId] = useState('');
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stations, setStations] = useState<PreparationStationResponse[]>([]);
  const [productId, setProductId] = useState('');
  const [preparationStationId, setPreparationStationId] = useState('');
  const [price, setPrice] = useState('0');
  const [minimumPrice, setMinimumPrice] = useState('0');
  const [unitCost, setUnitCost] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minimumStock, setMinimumStock] = useState('0');
  const [trackInventory, setTrackInventory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === productId) ?? null,
    [products, productId],
  );

  async function loadPoint(currentPointId: string): Promise<void> {
    const [productRows, stationRows] = await Promise.all([
      api.catalogProducts(currentPointId),
      api.preparationStations(currentPointId),
    ]);

    setProducts(productRows);
    setStations(stationRows);
    setProductId(productRows[0]?.id ?? '');
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
          assignedPoints.map((point: PointOfSaleResponse) => point.id),
        );

        const first =
          activePoints.find((point) => assignedPointIds.has(point.id)) ??
          activePoints[0];

        if (!first) throw new Error('No existe un punto de venta disponible.');
        setPointId(first.id);
        await loadPoint(first.id);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    setPrice(selectedProduct.price.toString());
    setMinimumPrice(
      (selectedProduct.minimumPrice ?? selectedProduct.price).toString(),
    );
    setUnitCost(
      selectedProduct.unitCost === null
        ? ''
        : selectedProduct.unitCost.toString(),
    );
    setStockQuantity('0');
    setMinimumStock(selectedProduct.minimumStock.toString());
    setTrackInventory(selectedProduct.trackInventory);
  }, [selectedProduct]);

  async function changePoint(nextPointId: string): Promise<void> {
    setPointId(nextPointId);
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

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!pointId || !productId) {
      setError('Punto de venta y producto son obligatorios.');
      return;
    }

    const payload: AssignProductToPointRequest = {
      pointOfSaleId: pointId,
      preparationStationId: preparationStationId || null,
      price: Number(price),
      minimumPrice: Number(minimumPrice),
      unitCost: unitCost.trim() ? Number(unitCost) : null,
      stockQuantity: 0,
      minimumStock: trackInventory ? Number(minimumStock) : 0,
      trackInventory,
    };

    const numericValues = [
      payload.price,
      payload.minimumPrice,
      payload.unitCost ?? 0,
      payload.stockQuantity,
      payload.minimumStock,
    ];

    if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
      setError('Los valores comerciales no pueden ser negativos.');
      return;
    }

    if (payload.price < payload.minimumPrice) {
      setError('El precio de venta no puede ser menor que el precio mínimo.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.assignProductToPoint(productId, payload);
      setMessage(
        'Producto asignado con existencia cero. Utiliza Transferir existencia para enviar unidades desde Principal.',
      );
      await loadPoint(pointId);
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

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Link2 size={22} />
          </div>
          <div className="maintenance-header__text">
            <h1>Asignar productos</h1>
            <p>Habilita productos empresariales por sucursal y punto de venta.</p>
          </div>
        </div>
        <div className="maintenance-toolbar__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/inventory/overview')}
          >
            <Boxes size={16} />
            Ver existencias
          </button>
          <button
            type="button"
            className="erp-button-primary"
            onClick={() => navigate('/admin/inventory/transfers')}
          >
            <ArrowRightLeft size={16} />
            Transferir existencia
          </button>
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
        <div
          className="settings-card"
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
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

      {message ? (
        <div
          className="settings-card"
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderColor: '#a9d9bb',
            background: '#f1fbf4',
            color: '#176b3a',
          }}
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div>
            <p className="eyebrow">CATÁLOGO EMPRESARIAL</p>
            <h2>Nueva asignación</h2>
          </div>
        </div>

        <form className="maintenance-modal__form" onSubmit={submit}>
          <div className="maintenance-modal__body">
            <section className="maintenance-section maintenance-section--first">
              <div>
                <h3>Destino y producto</h3>
                <p>Selecciona dónde estará disponible el artículo.</p>
              </div>
              <div className="maintenance-form-grid">
                <label>
                  Punto de venta
                  <select
                    value={pointId}
                    disabled={loading || saving}
                    onChange={(event) => void changePoint(event.target.value)}
                  >
                    {points.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.name} · {point.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Producto empresarial
                  <select
                    value={productId}
                    disabled={loading || saving || products.length === 0}
                    onChange={(event) => setProductId(event.target.value)}
                  >
                    {products.length === 0 ? (
                      <option value="">No hay productos pendientes</option>
                    ) : null}
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {product.sku}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estación de preparación
                  <select
                    value={preparationStationId}
                    disabled={loading || saving}
                    onChange={(event) =>
                      setPreparationStationId(event.target.value)
                    }
                  >
                    <option value="">Sin estación</option>
                    {stations.filter((item) => item.active).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="maintenance-section">
              <div>
                <h3>Precio e inventario de la sucursal</h3>
                <p>
                  La asignación no mueve inventario. Las unidades deben enviarse
                  mediante una transferencia desde Principal.
                </p>
              </div>
              <div className="maintenance-form-grid maintenance-form-grid--5">
                <label>Precio<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
                <label>Precio mínimo<input type="number" min="0" step="0.01" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} /></label>
                <label>Costo<input type="number" min="0" step="0.0001" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></label>
                <label>
                  Existencia inicial
                  <input
                    type="number"
                    value={stockQuantity}
                    disabled
                    readOnly
                  />
                  <small>Se asigna en cero para evitar duplicar inventario.</small>
                </label>
                <label>Stock mínimo<input type="number" min="0" step="0.001" value={minimumStock} disabled={!trackInventory} onChange={(event) => setMinimumStock(event.target.value)} /></label>
              </div>
              <label className="maintenance-switch">
                <span><strong>Controlar inventario</strong><small>Descuenta existencia al vender.</small></span>
                <input type="checkbox" checked={trackInventory} onChange={(event) => setTrackInventory(event.target.checked)} />
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
              {saving ? <Boxes size={16} /> : <Save size={16} />}
              {saving ? 'Asignando...' : 'Asignar producto'}
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}
