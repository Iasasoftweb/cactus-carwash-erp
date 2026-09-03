import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Coffee,
  PackageSearch,
  Search,
  ShoppingCart,
  History,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import type { PointOfSaleResponse, ProductResponse } from "@cactus/shared";

import { api } from "../lib/api";
import "./styles/InventoryReplenishmentPage.dashboard.css";

const API_ORIGIN =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ??
  "http://127.0.0.1:3000";

function productImageUrl(
  imageUrl: string | null | undefined,
): string | undefined {
  if (!imageUrl) return undefined;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl}`;
}

type StockFilter = "ALL" | "OUT_OF_STOCK" | "LOW_STOCK";

function stockStatus(
  product: ProductResponse,
): "OUT_OF_STOCK" | "LOW_STOCK" | "NORMAL" {
  if (product.stockQuantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (
    product.minimumStock > 0 &&
    product.stockQuantity <= product.minimumStock
  ) {
    return "LOW_STOCK";
  }

  return "NORMAL";
}

function suggestedReplenishment(product: ProductResponse): number {
  return Math.max(
    product.minimumStock - product.stockQuantity,

    0,
  );
}

export function InventoryReplenishmentPage() {
  const navigate = useNavigate();

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);

  const [pointId, setPointId] = useState("");

  const [products, setProducts] = useState<ProductResponse[]>([]);

  const [query, setQuery] = useState("");

  const [filter, setFilter] = useState<StockFilter>("ALL");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  async function loadProducts(currentPointId: string): Promise<void> {
    const rows = await api.adminProducts(currentPointId);

    setProducts(
      rows.filter((product) => product.trackInventory && product.active),
    );
  }

  useEffect(() => {
    setLoading(true);

    setError("");

    api

      .posPoints()

      .then(async (pointRows) => {
        const coffeePoint =
          pointRows.find((point) => {
            const code = point.code?.toUpperCase() ?? "";

            const name = point.name.toUpperCase();

            return code.includes("COFFEE") || name.includes("COFFEE");
          }) ?? pointRows[0];

        setPoints(pointRows);

        if (!coffeePoint) {
          throw new Error("No existe un punto de venta configurado.");
        }

        setPointId(coffeePoint.id);

        await loadProducts(coffeePoint.id);
      })

      .catch((reason: Error) => setError(reason.message))

      .finally(() => setLoading(false));
  }, []);

  async function changePoint(nextPointId: string): Promise<void> {
    setPointId(nextPointId);

    setLoading(true);

    setError("");

    try {
      await loadProducts(nextPointId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el inventario.",
      );
    } finally {
      setLoading(false);
    }
  }

  const criticalProducts = useMemo(
    () => products.filter((product) => stockStatus(product) !== "NORMAL"),

    [products],
  );

  const outOfStockCount = useMemo(
    () =>
      criticalProducts.filter(
        (product) => stockStatus(product) === "OUT_OF_STOCK",
      ).length,

    [criticalProducts],
  );

  const lowStockCount = useMemo(
    () =>
      criticalProducts.filter((product) => stockStatus(product) === "LOW_STOCK")
        .length,

    [criticalProducts],
  );

  const suggestedUnits = useMemo(
    () =>
      criticalProducts.reduce(
        (sum, product) => sum + suggestedReplenishment(product),

        0,
      ),

    [criticalProducts],
  );

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return criticalProducts.filter((product) => {
      const status = stockStatus(product);

      if (filter !== "ALL" && status !== filter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        product.name

          .toLowerCase()

          .includes(normalized) ||
        product.sku

          .toLowerCase()

          .includes(normalized) ||
        product.categoryName

          .toLowerCase()

          .includes(normalized)
      );
    });
  }, [criticalProducts, query, filter]);

  return (
    <main className="inventory-replenishment-v2 maintenance-page">
      <header className="inventory-replenishment-v2__header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <PackageSearch size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Reposición de inventario</h1>

            <p>Productos agotados o por debajo de su stock mínimo.</p>
          </div>
        </div>

        <div className="inventory-replenishment-v2__header-actions">
          <label className="inventory-replenishment-v2__point">
            Punto de venta
            <select
              value={pointId}
              onChange={(event) => {
                void changePoint(event.target.value);
              }}
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
            onClick={() => navigate("/admin/products")}
          >
            <ArrowLeft size={15} />
            Productos
          </button>

          

          <button
            type="button"
            className="secondary-button inventory-replenishment-v2__pos-button"
            onClick={() => navigate("/sales-pos")}
          >
            <ShoppingCart size={15} />
            Punto de Venta
          </button>
        </div>
      </header>

      {error ? (
        <div className="inventory-replenishment-v2__error">{error}</div>
      ) : null}

      <section className="inventory-replenishment-v2__summary">
        <article>
          <PackageSearch size={22} />

          <span>Productos críticos</span>

          <strong>{criticalProducts.length}</strong>
        </article>

        <article>
          <AlertTriangle size={22} />

          <span>Agotados</span>

          <strong>{outOfStockCount}</strong>
        </article>

        <article>
          <Boxes size={22} />

          <span>Stock bajo</span>

          <strong>{lowStockCount}</strong>
        </article>

        <article>
          <Coffee size={22} />

          <span>Reposición sugerida</span>

          <strong>{suggestedUnits.toFixed(3)}</strong>
        </article>
      </section>

      <section className="inventory-replenishment-v2__panel">
        <div className="inventory-replenishment-v2__toolbar">
          <div className="inventory-replenishment-v2__search">
            <Search size={18} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto, SKU o categoría"
            />
          </div>

          <div className="inventory-replenishment-v2__filters">
            <button
              type="button"
              className={filter === "ALL" ? "active" : ""}
              onClick={() => setFilter("ALL")}
            >
              Todos
            </button>

            <button
              type="button"
              className={filter === "OUT_OF_STOCK" ? "active" : ""}
              onClick={() => setFilter("OUT_OF_STOCK")}
            >
              Agotados
            </button>

            <button
              type="button"
              className={filter === "LOW_STOCK" ? "active" : ""}
              onClick={() => setFilter("LOW_STOCK")}
            >
              Stock bajo
            </button>
          </div>
        </div>

        {loading ? (
          <div className="inventory-replenishment-v2__empty">
            Cargando inventario...
          </div>
        ) : null}

        {!loading && visibleProducts.length === 0 ? (
          <div className="inventory-replenishment-v2__empty">
            No hay productos que requieran reposición con los filtros actuales.
          </div>
        ) : null}

        <div className="inventory-replenishment-v2__list">
          {visibleProducts.map((product) => {
            const status = stockStatus(product);

            const suggested = suggestedReplenishment(product);

            return (
              <article
                key={product.id}
                className="inventory-replenishment-v2__item"
              >
                <div className="inventory-replenishment-v2__image">
                  {product.imageUrl ? (
                    <img
                      src={productImageUrl(product.imageUrl)}
                      alt={product.name}
                    />
                  ) : (
                    <Boxes size={26} />
                  )}
                </div>

                <div className="inventory-replenishment-v2__main">
                  <div className="inventory-replenishment-v2__title">
                    <div>
                      <span>{product.sku}</span>

                      <strong>{product.name}</strong>
                    </div>

                    <span
                      className={
                        status === "OUT_OF_STOCK"
                          ? "inventory-alert inventory-alert--out"
                          : "inventory-alert inventory-alert--low"
                      }
                    >
                      {status === "OUT_OF_STOCK" ? "Agotado" : "Stock bajo"}
                    </span>
                  </div>

                  <div className="inventory-replenishment-v2__meta">
                    <span>{product.categoryName}</span>

                    <span>Existencia {product.stockQuantity}</span>

                    <span>Mínimo {product.minimumStock}</span>

                    <span className="inventory-replenishment-v2__suggested">
                      Reponer {suggested.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="inventory-replenishment-v2__actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      navigate(`/admin/products/${product.id}/inventory`)
                    }
                  >
                    Ver movimientos
                  </button>

                  <button className="erp-button-primary"
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({
                        productId: product.id,

                        quantity: suggested > 0 ? suggested.toString() : "1",

                        pointId,
                      });

                      navigate(`/admin/purchases/orders?${params.toString()}`);
                    }}
                  >
                    <ShoppingCart size={17} />
                    Comprar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
