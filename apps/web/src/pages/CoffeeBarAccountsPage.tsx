import {
  Coffee,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CashRegisterResponse,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PosAccountResponse,
  ProductCategoryResponse,
  ProductResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

type CartItem = ProductResponse & { quantity: number };
type Mode = 'POS' | 'HOLD';

const DEFAULT_CUSTOMER_ALIAS = 'Cliente Express';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function printCoffeeBarTicket(params: {
  title: string;
  reference: string;
  customerAlias: string;
  cashRegisterName: string;
  paymentMethodName: string;
  paymentReference?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
}): void {
  const popup = window.open('', '_blank', 'width=420,height=720');

  if (!popup) {
    throw new Error(
      'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir el ticket.',
    );
  }

  const rows = params.items
    .map(
      (item) => `
        <tr>
          <td>
            ${escapeHtml(item.name)}
            <small>${item.quantity} × RD$ ${item.unitPrice.toFixed(2)}</small>
          </td>
          <td class="amount">RD$ ${item.lineTotal.toFixed(2)}</td>
        </tr>
      `,
    )
    .join('');

  popup.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(params.title)}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          * { box-sizing: border-box; }
          body {
            width: 74mm;
            margin: 0 auto;
            padding: 3mm 1mm;
            color: #111;
            background: #fff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
          }
          h1, h2, p { margin: 0; }
          .center { text-align: center; }
          h1 { font-size: 18px; letter-spacing: .08em; }
          h2 { margin-top: 3px; font-size: 13px; }
          .divider { margin: 8px 0; border-top: 1px dashed #111; }
          .meta { display: grid; gap: 4px; }
          .meta div, .total {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }
          table { width: 100%; border-collapse: collapse; }
          td {
            padding: 5px 0;
            vertical-align: top;
            border-bottom: 1px dotted #777;
          }
          td small {
            display: block;
            margin-top: 2px;
            color: #444;
          }
          .amount { text-align: right; white-space: nowrap; }
          .total {
            margin-top: 8px;
            padding-top: 7px;
            border-top: 2px solid #111;
            font-size: 14px;
            font-weight: 900;
          }
          footer { margin-top: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>CACTUS</h1>
          <h2>COFFEE BAR</h2>
          <p>${escapeHtml(params.title)}</p>
        </div>

        <div class="divider"></div>

        <div class="meta">
          <div><span>Fecha:</span><strong>${new Date().toLocaleString('es-DO')}</strong></div>
          <div><span>Referencia:</span><strong>${escapeHtml(params.reference)}</strong></div>
          <div><span>Cliente:</span><strong>${escapeHtml(params.customerAlias)}</strong></div>
          <div><span>Caja:</span><strong>${escapeHtml(params.cashRegisterName)}</strong></div>
          <div><span>Método:</span><strong>${escapeHtml(params.paymentMethodName)}</strong></div>
          ${
            params.paymentReference
              ? `<div><span>Ref. pago:</span><strong>${escapeHtml(params.paymentReference)}</strong></div>`
              : ''
          }
        </div>

        <div class="divider"></div>

        <table><tbody>${rows}</tbody></table>

        <div class="total">
          <span>TOTAL</span>
          <span>RD$ ${params.total.toFixed(2)}</span>
        </div>

        <footer><p>Gracias por su compra.</p></footer>

        <script>
          window.addEventListener('load', function () {
            setTimeout(function () {
              window.print();
              window.close();
            }, 150);
          });
        </script>
      </body>
    </html>
  `);

  popup.document.close();
}


export function CoffeeBarAccountsPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('POS');
  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [registers, setRegisters] = useState<CashRegisterResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [categories, setCategories] = useState<ProductCategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [accounts, setAccounts] = useState<PosAccountResponse[]>([]);

  const [pointId, setPointId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerAlias, setCustomerAlias] = useState(DEFAULT_CUSTOMER_ALIAS);
  const [tableReference, setTableReference] = useState('');
  const [selectedAccount, setSelectedAccount] =
    useState<PosAccountResponse | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const orderedPaymentMethods = useMemo(() => {
    const priority: Record<string, number> = {
      CASH: 1,
      CARD: 2,
      TRANSFER: 3,
      OTHER: 4,
      CREDIT: 5,
    };

    return [...paymentMethods].sort(
      (a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99),
    );
  }, [paymentMethods]);

  function loadAccounts(currentPointId: string): void {
    api
      .posAccounts(currentPointId)
      .then(setAccounts)
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    Promise.all([api.posPoints(), api.paymentMethods()])
      .then(([pointRows, methodRows]) => {
        const coffeePoint =
          pointRows.find((point) => {
            const code = point.code?.toUpperCase() ?? '';
            const name = point.name.toUpperCase();

            return code.includes('COFFEE') || name.includes('COFFEE');
          }) ?? pointRows[0];

        const defaultMethod =
          methodRows.find((method) => method.type === 'CASH') ??
          methodRows.find((method) => method.type !== 'CREDIT') ??
          methodRows[0];

        setPoints(pointRows);
        setPaymentMethods(methodRows);
        setPointId(coffeePoint?.id ?? '');
        setPaymentMethodId(defaultMethod?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!pointId) return;

    Promise.all([
      api.posCashRegisters(pointId),
      api.posCategories(pointId),
      api.posProducts(pointId),
      api.posAccounts(pointId),
    ])
      .then(([registerRows, categoryRows, productRows, accountRows]) => {
        setRegisters(registerRows);
        setCategories(categoryRows);
        setProducts(productRows);
        setAccounts(accountRows);
        setRegisterId(registerRows[0]?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message));
  }, [pointId]);

  useEffect(() => {
    if (!pointId) return;

    api
      .posProducts(pointId, categoryId || undefined)
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

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const selectedRegister = registers.find(
    (register) => register.id === registerId,
  );

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.id === paymentMethodId,
  );

  function addProduct(product: ProductResponse): void {
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

  function changeQuantity(productId: string, delta: number): void {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return [item];

        const quantity = item.quantity + delta;
        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    );
  }

  function resetSale(): void {
    setCart([]);
    setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
    setTableReference('');
    setSelectedAccount(null);
    setPaymentReference('');
  }

  async function persistSelectedAccount(): Promise<PosAccountResponse> {
    if (!selectedAccount) {
      throw new Error('No hay una cuenta HOLD seleccionada.');
    }

    const updated = await api.updatePosAccount(selectedAccount.id, {
      customerAlias: customerAlias.trim() || DEFAULT_CUSTOMER_ALIAS,
      tableReference: tableReference.trim() || undefined,
    });

    setSelectedAccount(updated);
    setCustomerAlias(updated.customerAlias);
    setTableReference(updated.tableReference ?? '');

    return updated;
  }

  async function saveToHold(): Promise<void> {
    if (!pointId || cart.length === 0) {
      setError('Agrega al menos un artículo.');
      return;
    }

    if (!customerAlias.trim()) {
      setError('Indica el nombre o alias del cliente.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const account = await api.openPosAccount({
        pointOfSaleId: pointId,
        cashRegisterId: registerId || undefined,
        customerAlias: customerAlias.trim(),
        tableReference: tableReference.trim() || undefined,
      });

      await api.addPosAccountItems(account.id, {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      setMessage('Cuenta guardada en HOLD correctamente.');
      resetSale();
      loadAccounts(pointId);
      setMode('HOLD');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function payNow(): Promise<void> {
    if (!pointId || cart.length === 0) {
      setError('Agrega al menos un artículo.');
      return;
    }

    if (!registerId) {
      setError('Selecciona una caja.');
      return;
    }

    if (!paymentMethodId || !selectedPaymentMethod) {
      setError('Selecciona un método de pago.');
      return;
    }

    const ticketCart = [...cart];
    const ticketAlias = customerAlias.trim() || DEFAULT_CUSTOMER_ALIAS;
    const ticketPaymentReference = paymentReference.trim() || undefined;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await api.directPosPayment({
        pointOfSaleId: pointId,
        cashRegisterId: registerId,
        customerAlias: ticketAlias,
        paymentMethodId,
        paymentReference: ticketPaymentReference,
        items: ticketCart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      printCoffeeBarTicket({
        title: 'TICKET DE VENTA',
        reference: result.reference,
        customerAlias: ticketAlias,
        cashRegisterName: selectedRegister?.name ?? 'Caja Coffee Bar',
        paymentMethodName: selectedPaymentMethod.name,
        paymentReference: ticketPaymentReference,
        items: ticketCart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          lineTotal: item.price * item.quantity,
        })),
        total: result.total,
      });

      setMessage(result.message);
      resetSale();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cobrar la venta.',
      );
    } finally {
      setSaving(false);
    }
  }

  function openHoldAccount(account: PosAccountResponse): void {
    setSelectedAccount(account);
    setCustomerAlias(account.customerAlias);
    setTableReference(account.tableReference ?? '');
    setCart([]);
    setPaymentReference('');
    setMode('POS');
    setError('');
    setMessage(
      `Cuenta ${account.reference} abierta. Selecciona nuevos artículos y usa "Agregar a la cuenta".`,
    );
  }

  async function addToSelectedAccount(): Promise<void> {
    if (!selectedAccount || cart.length === 0) {
      setError('Selecciona una cuenta y agrega artículos.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const account = await persistSelectedAccount();

      const updated = await api.addPosAccountItems(account.id, {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      setSelectedAccount(updated);
      setCustomerAlias(updated.customerAlias);
      setTableReference(updated.tableReference ?? '');
      setCart([]);
      setMessage(
        'Consumo agregado correctamente. Puedes seguir agregando artículos o cobrar la cuenta.',
      );

      loadAccounts(pointId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function paySelectedAccount(): Promise<void> {
    if (!selectedAccount || !paymentMethodId || !selectedPaymentMethod) {
      setError('Selecciona una cuenta y método de pago.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      let accountToPay = await persistSelectedAccount();

      if (cart.length > 0) {
        accountToPay = await api.addPosAccountItems(selectedAccount.id, {
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        });

        setSelectedAccount(accountToPay);
        setCart([]);
      }

      const ticketPaymentReference = paymentReference.trim() || undefined;

      const paidAccount = await api.payPosAccount(accountToPay.id, {
        paymentMethodId,
        paymentReference: ticketPaymentReference,
      });

      printCoffeeBarTicket({
        title: 'TICKET DE PAGO',
        reference: paidAccount.reference,
        customerAlias: paidAccount.customerAlias,
        cashRegisterName:
          paidAccount.cashRegisterName ??
          selectedRegister?.name ??
          'Caja Coffee Bar',
        paymentMethodName: selectedPaymentMethod.name,
        paymentReference: ticketPaymentReference,
        items: paidAccount.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        total: paidAccount.total,
      });

      setMessage('Cuenta pagada correctamente.');
      resetSale();
      loadAccounts(pointId);
      setMode('HOLD');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cobrar la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function returnToHold(): Promise<void> {
    if (!selectedAccount) {
      setMode('HOLD');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await persistSelectedAccount();
      loadAccounts(pointId);

      setSelectedAccount(null);
      setCart([]);
      setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
      setTableReference('');
      setPaymentReference('');
      setMode('HOLD');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar los cambios de la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="coffee-pos">
      <header className="coffee-pos__header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>Coffee Bar POS</h1>
          <p>Venta inmediata y cuentas en HOLD.</p>
        </div>

        <div className="coffee-pos__tabs">
        <button
            type="button"
            onClick={() => {
              if (mode === 'HOLD') {
                setMode('POS');
                setSelectedAccount(null);
                setCart([]);
                setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
                setTableReference('');
                setPaymentReference('');
                setError('');
                setMessage('');
                return;
              }

              navigate('/dashboard');
            }}
          >
            ← Volver
          </button>

          <button
            type="button"
            className={mode === 'POS' ? 'active' : ''}
            onClick={() => {
              setMode('POS');
              setError('');
              setMessage('');
            }}
          >
            <Coffee size={17} />
            Nueva venta
          </button>

          <button
            type="button"
            className={mode === 'HOLD' ? 'active' : ''}
            onClick={() => {
              setMode('HOLD');
              setSelectedAccount(null);
              setCart([]);
              setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
              setTableReference('');
              setError('');
              setMessage('');
            }}
          >
            <WalletCards size={17} />
            HOLD ({accounts.length})
          </button>
        </div>
      </header>

      {error ? <div className="operations-error">{error}</div> : null}
      {message ? <div className="operations-success">{message}</div> : null}

      {mode === 'HOLD' ? (
        <section className="coffee-hold-board">
          {accounts.length === 0 ? (
            <div className="operations-empty">No hay cuentas abiertas.</div>
          ) : (
            <div className="coffee-account-grid">
              {accounts.map((account) => (
                <article className="coffee-account-card" key={account.id}>
                  <div>
                    <strong>{account.reference}</strong>
                    <span className="coffee-status">Abierta</span>
                  </div>

                  <h3>{account.customerAlias}</h3>
                  <p>{account.tableReference ?? 'Sin mesa'}</p>
                  <p>{account.cashRegisterName ?? 'Caja Coffee Bar'}</p>

                  <div className="coffee-account-lines">
                    {account.items.map((item) => (
                      <span key={item.id}>
                        {item.quantity} × {item.productName}
                      </span>
                    ))}
                  </div>

                  <div className="coffee-account-total">
                    <span>Total</span>
                    <strong>RD$ {account.total.toFixed(2)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => openHoldAccount(account)}
                  >
                    Abrir cuenta / agregar consumo
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="coffee-pos__layout">
          <section className="coffee-pos__catalog">
            <div className="operations-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar artículo o código"
              />
            </div>

            <div className="operations-filters">
              <button
                type="button"
                className={
                  !categoryId
                    ? 'operations-filter operations-filter--active'
                    : 'operations-filter'
                }
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

            <div className="retail-product-grid">
              {visibleProducts.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className="retail-product-card"
                  onClick={() => addProduct(product)}
                >
                  <div className="retail-product-icon">
                    <Coffee size={30} />
                  </div>
                  <strong>{product.name}</strong>
                  <span>{product.categoryName}</span>
                  <small>Stock: {product.stockQuantity}</small>
                  <b>RD$ {product.price.toFixed(2)}</b>
                </button>
              ))}
            </div>
          </section>

          <aside className="coffee-pos__cart">
            <div className="retail-cart__title">
              <ShoppingCart size={21} />
              <h2>
                {selectedAccount ? selectedAccount.reference : 'Carrito'}
              </h2>
            </div>

            <label>
              Cliente o alias
              <input
                value={customerAlias}
                onChange={(event) => setCustomerAlias(event.target.value)}
                placeholder={DEFAULT_CUSTOMER_ALIAS}
              />
            </label>

            <label>
              Mesa o referencia
              <input
                value={tableReference}
                disabled={Boolean(selectedAccount)}
                onChange={(event) => setTableReference(event.target.value)}
                placeholder="Opcional"
              />
            </label>

            <label>
              Caja
              <select
                value={registerId}
                disabled={Boolean(selectedAccount)}
                onChange={(event) => setRegisterId(event.target.value)}
              >
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="retail-cart__items">
              {cart.length === 0 ? (
                <p className="muted">
                  {selectedAccount
                    ? 'Selecciona artículos para agregarlos al consumo de esta cuenta.'
                    : 'Selecciona artículos del catálogo.'}
                </p>
              ) : (
                cart.map((item) => (
                  <article className="retail-cart__item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>RD$ {item.price.toFixed(2)}</span>
                    </div>

                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        <Minus size={14} />
                      </button>

                      <strong>{item.quantity}</strong>

                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <strong>
                      RD$ {(item.price * item.quantity).toFixed(2)}
                    </strong>
                  </article>
                ))
              )}
            </div>

            {selectedAccount ? (
              <div className="selected-account-existing">
                <h3>Consumo acumulado</h3>

                {selectedAccount.items.map((item) => (
                  <div key={item.id}>
                    <span>
                      {item.quantity} × {item.productName}
                    </span>
                    <strong>RD$ {item.lineTotal.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {selectedAccount ? (
              <div className="selected-account-summary">
                <span>Total acumulado</span>
                <strong>RD$ {selectedAccount.total.toFixed(2)}</strong>
              </div>
            ) : null}

            <div className="retail-cart__total">
              <span>
                {selectedAccount ? 'Nuevo consumo' : 'Total venta'}
              </span>
              <strong>RD$ {cartTotal.toFixed(2)}</strong>
            </div>

            <label>
              Método de pago
              <select
                value={paymentMethodId}
                onChange={(event) =>
                  setPaymentMethodId(event.target.value)
                }
              >
                {orderedPaymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Referencia de pago
              <input
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(event.target.value)
                }
                placeholder="Opcional"
              />
            </label>

            {selectedAccount ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void addToSelectedAccount();
                  }}
                  disabled={saving || cart.length === 0}
                >
                  Agregar a la cuenta
                </button>

                <button
                  type="button"
                  className="pay-now-button"
                  onClick={() => {
                    void paySelectedAccount();
                  }}
                  disabled={saving}
                >
                  {cart.length > 0
                    ? 'Agregar consumo y cobrar cuenta'
                    : 'Cobrar cuenta'}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    void returnToHold();
                  }}
                  disabled={saving}
                >
                  Volver a HOLD
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void payNow();
                  }}
                  disabled={saving || cart.length === 0}
                >
                  Cobrar ahora
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    void saveToHold();
                  }}
                  disabled={saving || cart.length === 0}
                >
                  Guardar en HOLD
                </button>
              </>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
