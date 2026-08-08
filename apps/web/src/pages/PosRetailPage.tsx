import {
  Coffee,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  OrderListItemResponse,
  PointOfSaleResponse,
  ProductCategoryResponse,
  ProductResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

type CartItem = ProductResponse & { quantity: number };

export function PosRetailPage() {
  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [categories, setCategories] = useState<ProductCategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [orders, setOrders] = useState<OrderListItemResponse[]>([]);
  const [pointId, setPointId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.posPoints(), api.orders()])
      .then(([posRows, orderRows]) => {
        setPoints(posRows);
        setOrders(
          orderRows.filter(
            (order) =>
              !['DELIVERED', 'CANCELLED'].includes(order.operationalStatus),
          ),
        );
        setPointId(posRows[0]?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!pointId) return;

    Promise.all([api.posCategories(pointId), api.posProducts(pointId)])
      .then(([categoryRows, productRows]) => {
        setCategories(categoryRows);
        setProducts(productRows);
        setCategoryId('');
      })
      .catch((reason: Error) => setError(reason.message));
  }, [pointId]);

  useEffect(() => {
    if (!pointId) return;

    api.posProducts(pointId, categoryId || undefined)
      .then(setProducts)
      .catch((reason: Error) => setError(reason.message));
  }, [pointId, categoryId]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return products.filter(
      (product) =>
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized),
    );
  }, [products, query]);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  function addProduct(product: ProductResponse) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return [item];

        const next = item.quantity + delta;
        return next <= 0 ? [] : [{ ...item, quantity: next }];
      }),
    );
  }

  async function submit() {
    if (!pointId || cart.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await api.createPosMovement({
        pointOfSaleId: pointId,
        orderId: orderId || undefined,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      setMessage(result.message);
      setCart([]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible registrar la venta.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="retail-pos">
      <header className="retail-pos__header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>POS Comercial</h1>
          <p>Coffee Bar, lubricantes, accesorios y artículos.</p>
        </div>

        <select value={pointId} onChange={(event) => setPointId(event.target.value)}>
          {points.map((point) => (
            <option key={point.id} value={point.id}>
              {point.name}
            </option>
          ))}
        </select>
      </header>

      <section className="retail-pos__grid">
        <section className="retail-catalog">
          <div className="retail-toolbar">
            <div className="operations-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar producto o código"
              />
            </div>

            <div className="operations-filters">
              <button
                type="button"
                className={!categoryId ? 'operations-filter operations-filter--active' : 'operations-filter'}
                onClick={() => setCategoryId('')}
              >
                Todos
              </button>

              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={
                    categoryId === category.id
                      ? 'operations-filter operations-filter--active'
                      : 'operations-filter'
                  }
                  onClick={() => setCategoryId(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="retail-product-grid">
            {visibleProducts.map((product) => (
              <button
                type="button"
                key={product.id}
                className="retail-product-card"
                onClick={() => addProduct(product)}
              >
                <div className="retail-product-icon">
                  {product.type === 'BEVERAGE' || product.type === 'FOOD'
                    ? <Coffee size={30} />
                    : <PackageSearch size={30} />}
                </div>
                <strong>{product.name}</strong>
                <span>{product.categoryName}</span>
                <small>Stock: {product.stockQuantity}</small>
                <b>RD$ {product.price.toFixed(2)}</b>
              </button>
            ))}
          </div>
        </section>

        <aside className="retail-cart">
          <div className="retail-cart__title">
            <ShoppingCart size={21} />
            <h2>Carrito</h2>
          </div>

          <label>
            Asociar a orden
            <select value={orderId} onChange={(event) => setOrderId(event.target.value)}>
              <option value="">Venta directa</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} · {order.customerAlias}
                </option>
              ))}
            </select>
          </label>

          <div className="retail-cart__items">
            {cart.length === 0 ? (
              <p className="muted">No hay productos agregados.</p>
            ) : (
              cart.map((item) => (
                <article key={item.id} className="retail-cart__item">
                  <div>
                    <strong>{item.name}</strong>
                    <span>RD$ {item.price.toFixed(2)}</span>
                  </div>

                  <div className="quantity-control">
                    <button type="button" onClick={() => changeQuantity(item.id, -1)}>
                      <Minus size={14} />
                    </button>
                    <strong>{item.quantity}</strong>
                    <button type="button" onClick={() => changeQuantity(item.id, 1)}>
                      <Plus size={14} />
                    </button>
                  </div>

                  <strong>RD$ {(item.price * item.quantity).toFixed(2)}</strong>
                </article>
              ))
            )}
          </div>

          <div className="retail-cart__total">
            <span>Total</span>
            <strong>RD$ {total.toFixed(2)}</strong>
          </div>

          {error ? <div className="error-box">{error}</div> : null}
          {message ? <div className="success-box">{message}</div> : null}

          <button type="button" onClick={submit} disabled={saving || cart.length === 0}>
            {saving
              ? 'Guardando...'
              : orderId
                ? 'Enviar consumo a la orden'
                : 'Registrar venta directa'}
          </button>
        </aside>
      </section>
    </main>
  );
}
