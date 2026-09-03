import { ArrowLeft, BadgeDollarSign, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ProductPricingResponse } from '@cactus/shared';
import { api } from '../lib/api';

export function ProductPricingPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const pointOfSaleId = searchParams.get('pointOfSaleId') ?? '';
  const [pricing, setPricing] = useState<ProductPricingResponse | null>(null);
  const [minimumPrice, setMinimumPrice] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(): Promise<void> {
    if (!id || !pointOfSaleId) {
      setError('No se indicó el producto o punto de venta.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const row = await api.productPricing(id, pointOfSaleId);
      setPricing(row);
      setMinimumPrice(row.minimumPrice.toString());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar los precios.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id, pointOfSaleId]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!pricing) return;

    const minimum = Number(minimumPrice);
    if (!Number.isFinite(minimum) || minimum < 0) {
      setError('El precio mínimo no es válido.');
      return;
    }

    const invalid = pricing.prices.find(
      (row) => row.active && row.price < minimum,
    );
    if (invalid) {
      setError(`El precio ${invalid.priceLevelName} es menor que el mínimo.`);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.updateProductPricing(id, {
        pointOfSaleId,
        minimumPrice: minimum,
        prices: pricing.prices.map((row) => ({
          priceLevelId: row.priceLevelId,
          price: row.price,
          active: row.active,
        })),
      });
      setPricing(updated);
      setMinimumPrice(updated.minimumPrice.toString());
      setMessage('Precios actualizados correctamente.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar los precios.',
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
            <BadgeDollarSign size={22} />
          </div>
          <div className="maintenance-header__text">
            <h1>Precios del producto</h1>
            <p>
              {pricing
                ? `${pricing.productName} · ${pricing.sku}`
                : 'Configuración por nivel comercial y sucursal.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/admin/products')}
        >
          <ArrowLeft size={16} />
          Productos
        </button>
      </header>

      {error ? (
        <p className="maintenance-alert maintenance-alert--error">{error}</p>
      ) : null}
      {message ? (
        <p className="maintenance-alert maintenance-alert--success">{message}</p>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div>
            <p className="eyebrow">PRECIOS POR NIVEL</p>
            <h2>{pricing?.productName ?? 'Producto'}</h2>
          </div>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando precios...</div>
        ) : pricing ? (
          <form className="maintenance-modal__form" onSubmit={submit}>
            <div className="maintenance-modal__body">
              <div className="maintenance-form-grid">
                <label>
                  Precio mínimo permitido
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimumPrice}
                    onChange={(event) => setMinimumPrice(event.target.value)}
                  />
                </label>
              </div>

              <div className="maintenance-table-wrap">
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Nivel</th>
                      <th>Código</th>
                      <th>Precio</th>
                      <th>Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.prices.map((row, index) => (
                      <tr key={row.priceLevelId}>
                        <td>
                          <strong>{row.priceLevelName}</strong>
                          {row.isDefault ? <small>Predeterminado</small> : null}
                        </td>
                        <td>{row.priceLevelCode}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price}
                            disabled={saving || !row.active}
                            onChange={(event) => {
                              const price = Number(event.target.value);
                              setPricing((current) =>
                                current
                                  ? {
                                      ...current,
                                      prices: current.prices.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, price }
                                          : item,
                                      ),
                                    }
                                  : current,
                              );
                            }}
                          />
                        </td>
                        <td>
                          <label className="maintenance-switch">
                            <span>
                              <strong>{row.active ? 'Sí' : 'No'}</strong>
                            </span>
                            <input
                              type="checkbox"
                              checked={row.active}
                              disabled={saving || row.isDefault}
                              onChange={(event) =>
                                setPricing((current) =>
                                  current
                                    ? {
                                        ...current,
                                        prices: current.prices.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  active: event.target.checked,
                                                }
                                              : item,
                                        ),
                                      }
                                    : current,
                                )
                              }
                            />
                            <i aria-hidden="true" />
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <footer className="maintenance-modal__footer">
              <button
                type="submit"
                className="erp-button-primary"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar precios'}
              </button>
            </footer>
          </form>
        ) : null}
      </section>
    </main>
  );
}
