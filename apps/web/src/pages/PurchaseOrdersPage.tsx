import {
  ArrowLeft,
  Boxes,
  Building2,
  ClipboardList,
  House,
  PackagePlus,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
  CreatePurchaseOrderRequest,
  PointOfSaleResponse,
  ProductResponse,
  PurchaseOrderResponse,
  SupplierResponse,
} from "@cactus/shared";
import { api } from "../lib/api";
import "./styles/PurchaseOrdersPage.dashboard.css";

type DraftItem = {
  productId: string;
  quantity: string;
  unitCost: string;
};

type OrderStatusFilter = "ALL" | PurchaseOrderResponse["status"];

const STATUS_LABELS: Record<PurchaseOrderResponse["status"], string> = {
  DRAFT: "Borrador",
  OPEN: "Abierta",
  PARTIALLY_RECEIVED: "Recepción parcial",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

function normalizeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedProductId = searchParams.get("productId") ?? "";
  const requestedQuantity = searchParams.get("quantity") ?? "";
  const requestedPointId = searchParams.get("pointId") ?? "";

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [pointId, setPointId] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderResponse[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === pointId) ?? null,
    [points, pointId],
  );

  const companyId = selectedPoint?.companyId ?? "";
  const branchId = selectedPoint?.branchId ?? "";

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.active),
    [suppliers],
  );

  const visibleProducts = useMemo(() => {
    const normalized = productQuery.trim().toLowerCase();

    return products.filter((product) => {
      if (!product.active) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized) ||
        product.categoryName.toLowerCase().includes(normalized)
      );
    });
  }, [products, productQuery]);

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) {
        return false;
      }

      if (supplierFilter && order.supplierId !== supplierFilter) {
        return false;
      }

      const orderDate = new Date(order.createdAt);

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);

        if (orderDate < from) {
          return false;
        }
      }

      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59.999`);

        if (orderDate > to) {
          return false;
        }
      }

      if (!normalized) {
        return true;
      }

      return [
        order.orderNumber,
        order.supplierName,
        STATUS_LABELS[order.status],
        order.notes ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [orders, query, statusFilter, supplierFilter, dateFrom, dateTo]);

  function clearOrderFilters(): void {
    setQuery("");
    setStatusFilter("ALL");
    setSupplierFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const draftTotal = useMemo(
    () =>
      draftItems.reduce((sum, item) => {
        const quantity = normalizeNumber(item.quantity);
        const unitCost = normalizeNumber(item.unitCost);

        return sum + quantity * unitCost;
      }, 0),
    [draftItems],
  );

  function addProduct(product: ProductResponse): void {
    setDraftItems((current) => {
      if (current.some((item) => item.productId === product.id)) {
        return current;
      }

      return [
        ...current,
        {
          productId: product.id,
          quantity: "1",
          unitCost: "0",
        },
      ];
    });
  }

  function updateDraftItem(
    productId: string,
    field: "quantity" | "unitCost",
    value: string,
  ): void {
    setDraftItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function removeDraftItem(productId: string): void {
    setDraftItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
  }

  function resetOrderForm(): void {
    setSupplierId(activeSuppliers[0]?.id ?? "");
    setNotes("");
    setDraftItems([]);
    setProductQuery("");
    setError("");
    setMessage("");
  }

  async function loadContext(currentPoint: PointOfSaleResponse): Promise<void> {
    const [supplierRows, productRows, orderRows] = await Promise.all([
      api.suppliers(currentPoint.companyId),
      api.adminProducts(currentPoint.id),
      api.purchaseOrders(currentPoint.companyId, currentPoint.branchId),
    ]);

    setSuppliers(supplierRows);
    setProducts(productRows);
    setOrders(orderRows);

    const firstActiveSupplier = supplierRows.find(
      (supplier) => supplier.active,
    );

    setSupplierId((current) => current || firstActiveSupplier?.id || "");
  }

  useEffect(() => {
    setLoading(true);
    setError("");

    api
      .posPoints()
      .then(async (pointRows) => {
        const requestedPoint = requestedPointId
          ? pointRows.find((point) => point.id === requestedPointId)
          : undefined;

        const coffeePoint =
          pointRows.find((point) => {
            const code = point.code?.toUpperCase() ?? "";
            const name = point.name.toUpperCase();

            return code.includes("COFFEE") || name.includes("COFFEE");
          }) ?? pointRows[0];

        const initialPoint = requestedPoint ?? coffeePoint;

        setPoints(pointRows);

        if (!initialPoint) {
          throw new Error("No existe un punto de venta configurado.");
        }

        setPointId(initialPoint.id);
        await loadContext(initialPoint);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [requestedPointId]);

  useEffect(() => {
    if (!requestedProductId || products.length === 0) {
      return;
    }

    const product = products.find((row) => row.id === requestedProductId);

    if (!product) {
      setError(
        "El producto solicitado para reposición no está disponible en este punto de venta.",
      );
      return;
    }

    const parsedQuantity = normalizeNumber(requestedQuantity);

    const quantity = parsedQuantity > 0 ? parsedQuantity.toString() : "1";

    setDraftItems((current) => {
      if (current.some((item) => item.productId === product.id)) {
        return current;
      }

      return [
        ...current,
        {
          productId: product.id,
          quantity,
          unitCost: "0",
        },
      ];
    });

    setProductQuery(product.name);
  }, [products, requestedProductId, requestedQuantity]);

  async function changePoint(nextPointId: string): Promise<void> {
    const nextPoint = points.find((point) => point.id === nextPointId) ?? null;

    if (!nextPoint) {
      return;
    }

    setPointId(nextPointId);
    setLoading(true);
    setError("");
    setMessage("");
    setSupplierId("");
    setDraftItems([]);

    try {
      await loadContext(nextPoint);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar compras.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrders(): Promise<void> {
    if (!companyId || !branchId) {
      return;
    }

    const rows = await api.purchaseOrders(companyId, branchId);

    setOrders(rows);
  }

  async function createOrder(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!companyId || !branchId || !supplierId) {
      setError("Selecciona punto de venta y proveedor.");
      return;
    }

    if (draftItems.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }

    const items = draftItems.map((item) => ({
      productId: item.productId,
      quantity: normalizeNumber(item.quantity),
      unitCost: normalizeNumber(item.unitCost),
    }));

    if (items.some((item) => item.quantity <= 0 || item.unitCost < 0)) {
      setError(
        "Cantidad debe ser mayor que cero y costo no puede ser negativo.",
      );
      return;
    }

    const payload: CreatePurchaseOrderRequest = {
      companyId,
      branchId,
      supplierId,
      notes: notes.trim() || undefined,
      items,
    };

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const created = await api.createPurchaseOrder(payload);

      setMessage(`Orden ${created.orderNumber} creada correctamente.`);

      setCreateModalOpen(false);
      resetOrderForm();
      await refreshOrders();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible crear la orden de compra.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="purchase-orders-v2 maintenance-page">
      <header className="purchase-orders-v2__header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <ClipboardList size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Órdenes de compra</h1>
            <p>Crea órdenes y administra recepciones de mercancía.</p>
          </div>
        </div>

        <div className="purchase-orders-v2__header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            <House size={15} />
            Menú principal
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/admin/purchases/suppliers")}
          >
            <ArrowLeft size={15} />
            Proveedores
          </button>
          <label>
            Punto de venta
            <select
              value={pointId}
              onChange={(event) => {
                void changePoint(event.target.value);
              }}
              disabled={saving}
            >
              {points.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/admin/inventory/replenishment")}
          >
            <Boxes size={18} />
            Reposición
          </button>
        </div>
      </header>

      {error ? <div className="purchase-orders-v2__error">{error}</div> : null}

      {message ? (
        <div className="purchase-orders-v2__success">{message}</div>
      ) : null}

      <section className="purchase-orders-v2__layout">
        <section className="purchase-orders-v2__orders">
          <div className="purchase-orders-v2__orders-header">
            <div>
              <span>ÓRDENES</span>
              <h2>Historial de compras</h2>
            </div>

            <div className="purchase-orders-v2__orders-header-actions">
              <button
                type="button"
                className="purchase-orders-v2__new-order-button"
                onClick={() => setCreateModalOpen(true)}
                disabled={loading || saving || activeSuppliers.length === 0}
              >
                <PackagePlus size={15} />
                Nueva orden
              </button>

              <button
                type="button"
                className="purchase-orders-v2__refresh"
                onClick={() => {
                  setLoading(true);

                  refreshOrders()
                    .catch((reason: Error) => setError(reason.message))
                    .finally(() => setLoading(false));
                }}
                disabled={loading || saving}
                title="Actualizar órdenes"
                aria-label="Actualizar órdenes"
              >
                <RefreshCcw size={17} />
              </button>
            </div>
          </div>

          <div className="purchase-orders-v2__toolbar purchase-orders-v2__toolbar--filters">
            <div className="purchase-orders-v2__search">
              <Search size={18} />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar orden, proveedor o nota"
              />
            </div>

            <label className="purchase-orders-v2__filter-field">
              Estado
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as OrderStatusFilter)
                }
              >
                <option value="ALL">Todos</option>

                <option value="OPEN">Abiertas</option>

                <option value="PARTIALLY_RECEIVED">Recepción parcial</option>

                <option value="RECEIVED">Recibidas</option>

                <option value="CANCELLED">Canceladas</option>

                <option value="DRAFT">Borradores</option>
              </select>
            </label>

            <label className="purchase-orders-v2__filter-field">
              Proveedor
              <select
                value={supplierFilter}
                onChange={(event) => setSupplierFilter(event.target.value)}
              >
                <option value="">Todos</option>

                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="purchase-orders-v2__filter-field">
              Desde
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>

            <label className="purchase-orders-v2__filter-field">
              Hasta
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="secondary-button purchase-orders-v2__clear-filters"
              onClick={clearOrderFilters}
            >
              <RotateCcw size={16} />
              Limpiar
            </button>
          </div>

          <div className="purchase-orders-v2__summary">
            <article>
              <ClipboardList size={20} />
              <span>Total</span>
              <strong>{orders.length}</strong>
            </article>

            <article>
              <PackagePlus size={20} />
              <span>Abiertas</span>
              <strong>
                {
                  orders.filter(
                    (order) =>
                      order.status === "OPEN" ||
                      order.status === "PARTIALLY_RECEIVED",
                  ).length
                }
              </strong>
            </article>

            <article>
              <Boxes size={20} />
              <span>Recibidas</span>
              <strong>
                {orders.filter((order) => order.status === "RECEIVED").length}
              </strong>
            </article>
          </div>

          {loading ? (
            <div className="purchase-orders-v2__empty">Cargando órdenes...</div>
          ) : null}

          {!loading && visibleOrders.length === 0 ? (
            <div className="purchase-orders-v2__empty">
              No hay órdenes que coincidan con los filtros.
            </div>
          ) : null}

          <div className="purchase-orders-v2__order-list">
            {visibleOrders.map((order) => {
              const total = order.items.reduce(
                (sum, item) => sum + item.quantity * item.unitCost,
                0,
              );

              return (
                <article
                  key={order.id}
                  className="purchase-orders-v2__order-card"
                >
                  <div className="purchase-orders-v2__order-icon">
                    <ClipboardList size={22} />
                  </div>

                  <div className="purchase-orders-v2__order-main">
                    <div className="purchase-orders-v2__order-title">
                      <div>
                        <span>{order.orderNumber}</span>

                        <strong>{order.supplierName}</strong>
                      </div>

                      <span
                        className={`purchase-orders-v2__status purchase-orders-v2__status--${order.status.toLowerCase()}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="purchase-orders-v2__order-meta">
                      <span>{order.items.length} artículos</span>

                      <span>RD$ {total.toFixed(2)}</span>

                      <span>
                        {new Date(order.createdAt).toLocaleString("es-DO")}
                      </span>
                    </div>
                  </div>

                  <div className="purchase-orders-v2__order-actions">
                    <button
                      type="button"
                      className="purchase-orders-v2__open-order-button"
                      onClick={() =>
                        navigate(`/admin/purchases/orders/${order.id}`)
                      }
                    >
                      Abrir orden
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      {createModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setCreateModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal purchase-order-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-order-create-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">NUEVA ORDEN</p>
                <h2 id="purchase-order-create-title">Crear orden de compra</h2>
                <p>Selecciona proveedor y agrega los artículos de la compra.</p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                onClick={() => setCreateModalOpen(false)}
                disabled={saving}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={(event) => {
                void createOrder(event);
              }}
            >
              <div className="maintenance-modal__body purchase-order-create-modal__body">
                <div className="purchase-order-create-modal__top">
                  <label>
                    Proveedor
                    <select
                      value={supplierId}
                      onChange={(event) => setSupplierId(event.target.value)}
                      disabled={saving}
                    >
                      <option value="">Seleccionar proveedor</option>

                      {activeSuppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Notas
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Observaciones de compra"
                      disabled={saving}
                    />
                  </label>
                </div>

                <section className="purchase-order-create-modal__picker">
                  <div className="purchase-order-create-modal__section-title purchase-order-create-modal__section-title--catalog">
                    <div>
                      <strong>Catálogo de productos</strong>
                      <small>
                        {visibleProducts.length} disponibles ·{" "}
                        {draftItems.length} seleccionados
                      </small>
                    </div>

                    <div className="purchase-orders-v2__search purchase-order-create-modal__catalog-search">
                      <Search size={16} />
                      <input
                        value={productQuery}
                        onChange={(event) =>
                          setProductQuery(event.target.value)
                        }
                        placeholder="Buscar por nombre, SKU o categoría..."
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="purchase-order-create-modal__product-list">
                    {visibleProducts.length === 0 ? (
                      <div className="purchase-order-create-modal__catalog-empty">
                        No hay productos que coincidan con la búsqueda.
                      </div>
                    ) : (
                      visibleProducts.map((product) => {
                        const selected = draftItems.some(
                          (item) => item.productId === product.id,
                        );

                        return (
                          <article
                            key={product.id}
                            className={
                              selected
                                ? "purchase-order-create-modal__product-list-item selected"
                                : "purchase-order-create-modal__product-list-item"
                            }
                          >
                            <div className="purchase-order-create-modal__product-list-main">
                              <div className="purchase-order-create-modal__product-list-code">
                                <span>{product.sku}</span>
                                {product.barcode ? (
                                  <small>{product.barcode}</small>
                                ) : null}
                              </div>

                              <div className="purchase-order-create-modal__product-list-name">
                                <strong>{product.name}</strong>
                                <small>{product.categoryName}</small>
                              </div>

                              <div className="purchase-order-create-modal__product-list-stock">
                                <span>Existencia</span>
                                <strong>
                                  {product.trackInventory
                                    ? product.stockQuantity.toFixed(3)
                                    : "—"}
                                </strong>
                              </div>
                            </div>

                            <div className="purchase-order-create-modal__product-list-action">
                              {selected ? (
                                <span className="purchase-order-create-modal__selected-label">
                                  Agregado
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => addProduct(product)}
                                  disabled={saving}
                                >
                                  <Plus size={14} />
                                  Agregar
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="purchase-order-create-modal__draft">
                  <div className="purchase-order-create-modal__section-title">
                    <div>
                      <strong>Detalle de la orden</strong>
                      <small>{draftItems.length} artículos seleccionados</small>
                    </div>

                    <strong className="purchase-order-create-modal__total">
                      RD$ {draftTotal.toFixed(2)}
                    </strong>
                  </div>

                  {draftItems.length === 0 ? (
                    <div className="purchase-orders-v2__empty">
                      Agrega productos a la orden.
                    </div>
                  ) : (
                    <div className="purchase-order-create-modal__items">
                      {draftItems.map((item) => {
                        const product = products.find(
                          (row) => row.id === item.productId,
                        );

                        if (!product) {
                          return null;
                        }

                        return (
                          <article
                            key={item.productId}
                            className="purchase-order-create-modal__item"
                          >
                            <div>
                              <small>{product.sku}</small>
                              <strong>{product.name}</strong>
                            </div>

                            <label>
                              Cantidad
                              <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={item.quantity}
                                onChange={(event) =>
                                  updateDraftItem(
                                    item.productId,
                                    "quantity",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              Costo
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(event) =>
                                  updateDraftItem(
                                    item.productId,
                                    "unitCost",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <button
                              type="button"
                              className="maintenance-icon-button"
                              onClick={() => removeDraftItem(item.productId)}
                              title="Quitar"
                              aria-label={`Quitar ${product.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button className="erp-button-primary"
                  type="submit"
                  disabled={saving || draftItems.length === 0}
                >
                  <Save size={15} />
                  {saving ? "Creando..." : "Crear orden"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
