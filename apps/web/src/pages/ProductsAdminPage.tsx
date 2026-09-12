import {
  Boxes,
  Car,
  Coffee,
  CupSoda,
  Droplets,
  Grid2X2,
  House,
  Package,
  Pizza,
  Sandwich,
  ShoppingBag,
  Sparkles,
  Tag,
  Utensils,
  Wrench,
  PackagePlus,
  Pencil,
  RefreshCcw,
  Save,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import type {
  CreateProductRequest,
  PointOfSaleResponse,
  PosCapabilityResponse,
  ProductCategoryResponse,
  ProductResponse,
  PreparationStationResponse,
  ProductSaleUnit,
  ProductType,
  UpdateProductRequest,
} from "@cactus/shared";

import { api } from "../lib/api";
import {
  ProductAssignmentModals,
  type ProductAssignmentMode,
} from "../components/ProductAssignmentModals";

const PAGE_SIZE = 10;

type ProductFormState = {
  sku: string;

  barcode: string;

  name: string;

  description: string;

  categoryId: string;

  preparationStationId: string;

  type: ProductType;

  saleUnit: ProductSaleUnit;

  price: string;

  unitCost: string;

  taxRate: string;

  stockQuantity: string;

  minimumStock: string;

  trackInventory: boolean;

  active: boolean;
};

const EMPTY_FORM: ProductFormState = {
  sku: "",

  barcode: "",

  name: "",

  description: "",

  categoryId: "",

  preparationStationId: "",

  type: "PRODUCT",

  saleUnit: "UNIT",

  price: "0",

  unitCost: "",

  taxRate: "0",

  stockQuantity: "0",

  minimumStock: "0",

  trackInventory: true,

  active: true,
};

type CategoryFormState = {
  id: string | null;
  code: string;
  name: string;
  iconCode: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  id: null,
  code: "",
  name: "",
  iconCode: "tag",
  sortOrder: "0",
  active: true,
};

const CATEGORY_ICONS = [
  { code: "tag", label: "General", Icon: Tag },
  { code: "grid", label: "Catálogo", Icon: Grid2X2 },
  { code: "coffee", label: "Café", Icon: Coffee },
  { code: "cup-soda", label: "Bebidas", Icon: CupSoda },
  { code: "utensils", label: "Comida", Icon: Utensils },
  { code: "sandwich", label: "Sándwich", Icon: Sandwich },
  { code: "pizza", label: "Pizza", Icon: Pizza },
  { code: "package", label: "Producto", Icon: Package },
  { code: "shopping-bag", label: "Tienda", Icon: ShoppingBag },
  { code: "droplets", label: "Lavado", Icon: Droplets },
  { code: "wrench", label: "Servicio", Icon: Wrench },
  { code: "sparkles", label: "Detalle", Icon: Sparkles },
  { code: "car", label: "Vehículo", Icon: Car },
] as const;

function categoryIconComponent(iconCode: string) {
  return CATEGORY_ICONS.find((item) => item.code === iconCode)?.Icon ?? Tag;
}

type StationFormState = {
  id: string | null;

  code: string;

  name: string;

  sortOrder: string;

  active: boolean;
};

const EMPTY_STATION_FORM: StationFormState = {
  id: null,

  code: "",

  name: "",

  sortOrder: "0",

  active: true,
};

const API_ORIGIN =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ??
  "http://127.0.0.1:3000";

function productImageUrl(
  imageUrl: string | null | undefined,
): string | undefined {
  if (!imageUrl) return undefined;

  if (imageUrl.startsWith("http\://") || imageUrl.startsWith("https\://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl}`;
}

const PRODUCT_TYPES: Array<{
  value: ProductType;

  label: string;
}> = [
  { value: "PRODUCT", label: "Producto" },

  { value: "FOOD", label: "Alimento" },

  { value: "BEVERAGE", label: "Bebida" },

  { value: "GIFT", label: "Regalo" },

  { value: "ACCESSORY", label: "Accesorio" },

  { value: "SUPPLY", label: "Suministro" },

  { value: "PART", label: "Repuesto" },

  { value: "LUBRICANT", label: "Lubricante" },
];

const PRODUCT_SALE_UNITS: Array<{
  value: ProductSaleUnit;

  label: string;
}> = [
  { value: "UNIT", label: "Unidad" },

  { value: "WEIGHT", label: "Peso" },

  { value: "VOLUME", label: "Volumen" },

  { value: "SERVICE", label: "Servicio" },
];

function normalizeNumber(value: string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function inventoryStatus(
  product: ProductResponse,
): "NO_CONTROL" | "OUT_OF_STOCK" | "LOW_STOCK" | "NORMAL" {
  if (!product.trackInventory) {
    return "NO_CONTROL";
  }

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

function capabilityEnabled(
  capabilities: PosCapabilityResponse[],

  capability: PosCapabilityResponse["capability"],
): boolean {
  return (
    capabilities.find((item) => item.capability === capability)?.enabled ??
    false
  );
}

export function ProductsAdminPage() {
  const [assignmentMode, setAssignmentMode] =
    useState<ProductAssignmentMode>(null);

  const navigate = useNavigate();

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);

  const [pointId, setPointId] = useState("");

  const [categories, setCategories] = useState<ProductCategoryResponse[]>([]);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(EMPTY_CATEGORY_FORM);
  const [categorySaving, setCategorySaving] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  const [products, setProducts] = useState<ProductResponse[]>([]);

  const [capabilities, setCapabilities] = useState<PosCapabilityResponse[]>([]);

  const [stations, setStations] = useState<PreparationStationResponse[]>([]);

  const [stationForm, setStationForm] =
    useState<StationFormState>(EMPTY_STATION_FORM);

  const [stationSaving, setStationSaving] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const [query, setQuery] = useState("");

  const [showInactive, setShowInactive] = useState(true);

  const [page, setPage] = useState(1);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [isStationsModalOpen, setIsStationsModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [productImage, setProductImage] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,

    [products, selectedId],
  );

  const foodServiceEnabled = useMemo(
    () =>
      capabilityEnabled(
        capabilities,

        "FOOD_SERVICE",
      ),

    [capabilities],
  );

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return products.filter((product) => {
      if (!showInactive && !product.active) {
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
        (product.barcode ?? "")

          .toLowerCase()

          .includes(normalized) ||
        product.categoryName

          .toLowerCase()

          .includes(normalized) ||
        (foodServiceEnabled ? (product.preparationStationName ?? "") : "")

          .toLowerCase()

          .includes(normalized)
      );
    });
  }, [products, query, showInactive, foodServiceEnabled]);

  const totalPages = Math.max(
    1,

    Math.ceil(visibleProducts.length / PAGE_SIZE),
  );

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return visibleProducts.slice(
      start,

      start + PAGE_SIZE,
    );
  }, [visibleProducts, page]);

  function setField<K extends keyof ProductFormState>(
    field: K,

    value: ProductFormState[K],
  ): void {
    setForm((current) => ({
      ...current,

      [field]: value,
    }));
  }

  function resetForm(): void {
    setProductImage(null);

    setImagePreview(null);

    setSelectedId(null);

    setForm({
      ...EMPTY_FORM,

      categoryId: categories.find((category) => category.active)?.id ?? "",

      preparationStationId: "",
    });

    setError("");

    setMessage("");
  }

  function openCreateProduct(): void {
    resetForm();

    setIsProductModalOpen(true);
  }

  function closeProductModal(): void {
    if (saving) return;

    setIsProductModalOpen(false);

    resetForm();
  }

  function editProduct(product: ProductResponse): void {
    setSelectedId(product.id);

    setProductImage(null);

    setImagePreview(productImageUrl(product.imageUrl) ?? null);

    setForm({
      sku: product.sku,

      barcode: product.barcode ?? "",

      name: product.name,

      description: product.description ?? "",

      categoryId: product.categoryId,

      preparationStationId: foodServiceEnabled
        ? (product.preparationStationId ?? "")
        : "",

      type: product.type,

      saleUnit: product.saleUnit,

      price: product.price.toString(),

      unitCost: product.unitCost === null ? "" : product.unitCost.toString(),

      taxRate: product.taxRate.toString(),

      stockQuantity: product.stockQuantity.toString(),

      minimumStock: product.minimumStock.toString(),

      trackInventory: product.trackInventory,

      active: product.active,
    });

    setError("");

    setMessage("");

    setIsProductModalOpen(true);
  }

  async function loadCatalog(currentPointId: string): Promise<void> {
    const [categoryRows, productRows, capabilityRows] = await Promise.all([
      api.adminProductCategories(currentPointId),

      api.adminProducts(currentPointId),

      api.posCapabilities(currentPointId),
    ]);

    const hasFoodService = capabilityEnabled(
      capabilityRows,

      "FOOD_SERVICE",
    );

    const stationRows = hasFoodService
      ? await api.preparationStations(currentPointId)
      : [];

    setCategories(categoryRows);

    setProducts(productRows);

    setCapabilities(capabilityRows);

    setStations(stationRows);

    if (!hasFoodService) {
      setStationForm(EMPTY_STATION_FORM);
    }

    setForm((current) => ({
      ...current,

      categoryId: categoryRows.some(
        (category) => category.id === current.categoryId,
      )
        ? current.categoryId
        : (categoryRows.find((category) => category.active)?.id ?? ""),

      preparationStationId: hasFoodService ? current.preparationStationId : "",
    }));
  }

  useEffect(() => {
    setLoading(true);

    setError("");

    api

      .posPoints()

      .then(async (pointRows: PointOfSaleResponse[]) => {
        const defaultPoint =
          pointRows.find((point) => {
            const code = point.code?.toUpperCase() ?? "";

            const name = point.name.toUpperCase();

            return code.includes("POS") || name.includes("PUNTO");
          }) ?? pointRows[0];

        setPoints(pointRows);

        if (!defaultPoint) {
          throw new Error("No existe un punto de venta configurado.");
        }

        setPointId(defaultPoint.id);

        await loadCatalog(defaultPoint.id);
      })

      .catch((reason: Error) => setError(reason.message))

      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isProductModalOpen && !isStationsModalOpen && !isCategoriesModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.key === "Escape" &&
        !saving &&
        !stationSaving &&
        !categorySaving
      ) {
        setIsProductModalOpen(false);

        setIsStationsModalOpen(false);

        setIsCategoriesModalOpen(false);
      }
    }

    window.addEventListener(
      "keydown",

      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",

        handleKeyDown,
      );
    };
  }, [
    isProductModalOpen,
    isStationsModalOpen,
    isCategoriesModalOpen,
    saving,
    stationSaving,
    categorySaving,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function changePoint(nextPointId: string): Promise<void> {
    setPointId(nextPointId);

    setSelectedId(null);

    setCategoryForm(EMPTY_CATEGORY_FORM);

    setStationForm(EMPTY_STATION_FORM);

    setLoading(true);

    setError("");

    setMessage("");

    setPage(1);

    try {
      await loadCatalog(nextPointId);

      setForm((current) => ({
        ...EMPTY_FORM,

        categoryId: current.categoryId,
      }));

      setProductImage(null);

      setImagePreview(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar los productos.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetCategoryForm(): void {
    setCategoryForm(EMPTY_CATEGORY_FORM);
  }

  function editCategory(category: ProductCategoryResponse): void {
    setCategoryForm({
      id: category.id,
      code: category.code,
      name: category.name,
      iconCode: category.iconCode || "tag",
      sortOrder: category.sortOrder.toString(),
      active: category.active,
    });
    setError("");
    setMessage("");
  }

  async function saveCategory(): Promise<void> {
    if (!pointId) {
      setError("Selecciona un punto de venta.");
      return;
    }

    const code = categoryForm.code.trim().toUpperCase();
    const name = categoryForm.name.trim();
    const iconCode = categoryForm.iconCode.trim() || "tag";
    const sortOrder = Math.max(
      0,
      Math.trunc(normalizeNumber(categoryForm.sortOrder)),
    );

    if (!code || !name) {
      setError("Código y nombre de la categoría son obligatorios.");
      return;
    }

    setCategorySaving(true);
    setError("");
    setMessage("");

    try {
      if (categoryForm.id) {
        await api.updateProductCategory(categoryForm.id, {
          pointOfSaleId: pointId,
          code,
          name,
          iconCode,
          sortOrder,
          active: categoryForm.active,
        });
        setMessage("Categoría actualizada correctamente.");
      } else {
        await api.createProductCategory({
          pointOfSaleId: pointId,
          code,
          name,
          iconCode,
          sortOrder,
        });
        setMessage("Categoría creada correctamente.");
      }

      const categoryRows = await api.adminProductCategories(pointId);
      setCategories(categoryRows);
      resetCategoryForm();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la categoría.",
      );
    } finally {
      setCategorySaving(false);
    }
  }

  function editStation(station: PreparationStationResponse): void {
    if (!foodServiceEnabled) {
      return;
    }

    setStationForm({
      id: station.id,

      code: station.code,

      name: station.name,

      sortOrder: station.sortOrder.toString(),

      active: station.active,
    });

    setError("");

    setMessage("");
  }

  function resetStationForm(): void {
    setStationForm(EMPTY_STATION_FORM);
  }

  async function saveStation(): Promise<void> {
    if (!foodServiceEnabled) {
      setError(
        "Las estaciones de preparación requieren la capacidad Restaurante / Food Service.",
      );

      return;
    }

    if (!pointId) {
      setError("Selecciona un punto de venta.");

      return;
    }

    const code = stationForm.code

      .trim()

      .toUpperCase();

    const name = stationForm.name.trim();

    const sortOrder = Math.max(
      0,

      Math.trunc(normalizeNumber(stationForm.sortOrder)),
    );

    if (!code || !name) {
      setError("Código y nombre de la estación son obligatorios.");

      return;
    }

    setStationSaving(true);

    setError("");

    setMessage("");

    try {
      if (stationForm.id) {
        await api.updatePreparationStation(
          stationForm.id,

          {
            code,

            name,

            sortOrder,

            active: stationForm.active,
          },
        );

        setMessage("Estación actualizada correctamente.");
      } else {
        await api.createPreparationStation({
          pointOfSaleId: pointId,

          code,

          name,

          sortOrder,
        });

        setMessage("Estación creada correctamente.");
      }

      setStations(await api.preparationStations(pointId));

      resetStationForm();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la estación.",
      );
    } finally {
      setStationSaving(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!pointId) {
      setError("Selecciona un punto de venta.");

      return;
    }

    if (!form.categoryId) {
      setError("Selecciona una categoría.");

      return;
    }

    if (!form.name.trim()) {
      setError("El nombre del producto es obligatorio.");

      return;
    }

    const price = normalizeNumber(form.price);

    const unitCost =
      form.unitCost.trim() === "" ? null : normalizeNumber(form.unitCost);

    const taxRate = normalizeNumber(form.taxRate);

    const stockQuantity = normalizeNumber(form.stockQuantity);

    const minimumStock = normalizeNumber(form.minimumStock);

    if (
      price < 0 ||
      (unitCost !== null && unitCost < 0) ||
      taxRate < 0 ||
      stockQuantity < 0 ||
      minimumStock < 0
    ) {
      setError(
        "Precio, costo, impuesto, existencia y stock mínimo no pueden ser negativos.",
      );

      return;
    }

    setSaving(true);

    setError("");

    setMessage("");

    try {
      const basePayload: CreateProductRequest = {
        pointOfSaleId: pointId,

        categoryId: form.categoryId,

        preparationStationId: foodServiceEnabled
          ? form.preparationStationId || null
          : null,

        ...(selectedProduct ? { sku: selectedProduct.sku } : {}),

        barcode: form.barcode.trim() || undefined,

        name: form.name.trim().toUpperCase(),

        description: form.description.trim().toUpperCase() || undefined,

        type: form.type,

        saleUnit: form.saleUnit,

        price,

        unitCost,

        taxRate,

        stockQuantity: form.trackInventory ? stockQuantity : 0,

        minimumStock: form.trackInventory ? minimumStock : 0,

        trackInventory: form.trackInventory,
      };

      let savedProduct: ProductResponse;

      if (selectedProduct) {
        const payload: UpdateProductRequest = {
          ...basePayload,

          active: form.active,
        };

        savedProduct = await api.updateProduct(
          selectedProduct.id,

          payload,
        );

        setMessage("Producto actualizado correctamente.");
      } else {
        savedProduct = await api.createProduct(basePayload);

        setMessage("Producto creado correctamente.");
      }

      if (productImage) {
        savedProduct = await api.uploadProductImage(
          savedProduct.id,

          productImage,
        );
      }

      await loadCatalog(pointId);

      setIsProductModalOpen(false);

      resetForm();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar el producto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: ProductResponse): Promise<void> {
    setSaving(true);

    setError("");

    setMessage("");

    try {
      const payload: UpdateProductRequest = {
        pointOfSaleId: product.pointOfSaleId,

        categoryId: product.categoryId,

        preparationStationId: foodServiceEnabled
          ? product.preparationStationId
          : null,

        sku: product.sku,

        barcode: product.barcode ?? undefined,

        name: product.name,

        description: product.description ?? undefined,

        type: product.type,

        saleUnit: product.saleUnit,

        price: product.price,

        unitCost: product.unitCost,

        taxRate: product.taxRate,

        stockQuantity: product.stockQuantity,

        minimumStock: product.minimumStock,

        trackInventory: product.trackInventory,

        active: !product.active,
      };

      await api.updateProduct(
        product.id,

        payload,
      );

      await loadCatalog(pointId);

      setMessage(
        product.active
          ? "Producto desactivado correctamente."
          : "Producto activado correctamente.",
      );

      if (selectedId === product.id) {
        resetForm();
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cambiar el estado del producto.",
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
            <Boxes size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Productos</h1>

            <p>
              Catálogo, precios, inventario y configuración del punto de venta.
            </p>
          </div>
        </div>

        <div className="maintenance-header__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/sales-pos")}
          >
            Punto de Venta
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            <House size={15} />
            Menú principal
          </button>
        </div>
      </header>

      {error ? (
        <p className="maintenance-alert maintenance-alert--error">{error}</p>
      ) : null}

      {message ? (
        <p className="maintenance-alert maintenance-alert--success">
          {message}
        </p>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div className="maintenance-toolbar__heading">
            <div>
              <p className="eyebrow">CATÁLOGO</p>

              <h2>Productos</h2>
            </div>

            <span className="maintenance-count">
              {visibleProducts.length}

              {visibleProducts.length === 1 ? " producto" : " productos"}
            </span>
          </div>

          <div className="maintenance-toolbar__actions maintenance-toolbar__actions--products">
            <label className="maintenance-toolbar-select">
              <span>Punto de venta</span>

              <select
                value={pointId}
                onChange={(event) => {
                  void changePoint(event.target.value);
                }}
                disabled={saving || loading}
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
              onClick={() => {
                resetCategoryForm();
                setIsCategoriesModalOpen(true);
              }}
              disabled={saving || loading}
            >
              <Tag size={16} />
              Categorías
            </button>

            {foodServiceEnabled ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetStationForm();

                  setIsStationsModalOpen(true);
                }}
                disabled={saving || loading}
              >
                <Settings2 size={16} />
                Estaciones
              </button>
            ) : null}

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/admin/inventory/replenishment")}
            >
              Reposición
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/admin/pricing/levels")}
              disabled={saving || loading}
            >
              Niveles de precio
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setAssignmentMode("bulk")}
              disabled={saving || loading}
            >
              <Boxes size={16} />
              Asignar varios
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setAssignmentMode("detail")}
              disabled={saving || loading}
            >
              <PackagePlus size={16} />
              Asignación detallada
            </button>

            <button
              className="erp-button-primary"
              type="button"
              onClick={openCreateProduct}
              disabled={saving}
            >
              <PackagePlus size={16} />
              Nuevo producto
            </button>
          </div>
        </div>

        <div className="maintenance-filter-row">
          <div className="maintenance-search maintenance-search--grow">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);

                setPage(1);
              }}
              placeholder={
                foodServiceEnabled
                  ? "Buscar por nombre, SKU, código, categoría o estación..."
                  : "Buscar por nombre, SKU, código o categoría..."
              }
              aria-label="Buscar productos"
            />
          </div>

          <label className="maintenance-filter-toggle">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => {
                setShowInactive(event.target.checked);

                setPage(1);
              }}
            />
            Mostrar inactivos
          </label>

          <button
            type="button"
            className="maintenance-icon-button"
            onClick={() => {
              if (!pointId) return;

              setLoading(true);

              loadCatalog(pointId)
                .catch((reason: Error) => setError(reason.message))

                .finally(() => setLoading(false));
            }}
            disabled={loading || saving}
            title="Actualizar"
            aria-label="Actualizar catálogo"
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        <div className="maintenance-summary-strip">
          <span>
            <strong>{products.length}</strong>
            Total
          </span>

          <span>
            <strong>
              {products.filter((product) => product.active).length}
            </strong>
            Activos
          </span>

          <span>
            <strong>
              {products.filter((product) => product.trackInventory).length}
            </strong>
            Con inventario
          </span>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando productos...</div>
        ) : visibleProducts.length === 0 ? (
          <div className="operations-empty">
            No hay productos que coincidan con el filtro.
          </div>
        ) : (
          <>
            <div className="maintenance-table-wrap">
              <table className="maintenance-table maintenance-table--products">
                <thead>
                  <tr>
                    <th>Producto</th>

                    <th>Categoría</th>

                    {foodServiceEnabled ? <th>Estación</th> : null}

                    <th>Precio</th>

                    <th>Inventario</th>

                    <th>Estado</th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {paginatedProducts.map((product) => {
                    const status = inventoryStatus(product);

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="maintenance-product-cell">
                            <div className="maintenance-product-thumb">
                              {product.imageUrl ? (
                                <img
                                  src={productImageUrl(product.imageUrl)}
                                  alt={product.name}
                                />
                              ) : product.type === "FOOD" ||
                                product.type === "BEVERAGE" ? (
                                <Coffee size={18} />
                              ) : (
                                <Boxes size={18} />
                              )}
                            </div>

                            <div>
                              <strong>{product.name}</strong>

                              <small>
                                {product.sku}

                                {product.barcode ? ` · ${product.barcode}` : ""}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          {(() => {
                            const category = categories.find(
                              (item) => item.id === product.categoryId,
                            );
                            const CategoryIcon = categoryIconComponent(
                              category?.iconCode ?? "tag",
                            );

                            return (
                              <span className="maintenance-product-category">
                                <span className="maintenance-product-category__icon">
                                  <CategoryIcon size={15} />
                                </span>
                                <span>{product.categoryName}</span>
                              </span>
                            );
                          })()}
                        </td>

                        {foodServiceEnabled ? (
                          <td>
                            {product.preparationStationName ?? "Sin estación"}
                          </td>
                        ) : null}

                        <td>
                          <strong className="maintenance-price">
                            RD$ {product.price.toFixed(2)}
                          </strong>

                          <small>
                            {PRODUCT_SALE_UNITS.find(
                              (unit) => unit.value === product.saleUnit,
                            )?.label ?? product.saleUnit}
                          </small>
                        </td>

                        <td>
                          {status === "NO_CONTROL" ? (
                            <span className="maintenance-badge maintenance-badge--muted">
                              Sin control
                            </span>
                          ) : status === "OUT_OF_STOCK" ? (
                            <span className="maintenance-badge maintenance-badge--danger">
                              Agotado
                            </span>
                          ) : status === "LOW_STOCK" ? (
                            <span className="maintenance-badge maintenance-badge--warning">
                              Stock bajo · {product.stockQuantity}
                            </span>
                          ) : (
                            <span className="maintenance-badge maintenance-badge--success">
                              Stock {product.stockQuantity}
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              product.active
                                ? "maintenance-badge maintenance-badge--success"
                                : "maintenance-badge maintenance-badge--danger"
                            }
                          >
                            {product.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td>
                          <div className="maintenance-row-actions">
                            <button
                              type="button"
                              className="maintenance-icon-button"
                              title="Editar producto"
                              aria-label={`Editar ${product.name}`}
                              onClick={() => editProduct(product)}
                              disabled={saving}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="maintenance-icon-button"
                              title="Precios por nivel"
                              aria-label={`Precios de ${product.name}`}
                              onClick={() =>
                                navigate(
                                  `/admin/products/${product.id}/prices?pointOfSaleId=${encodeURIComponent(
                                    pointId,
                                  )}`,
                                )
                              }
                              disabled={saving || !pointId}
                            >
                              $
                            </button>
                            <button
                              type="button"
                              className="maintenance-icon-button"
                              title="Movimientos"
                              aria-label={`Movimientos de ${product.name}`}
                              onClick={() =>
                                navigate(
                                  `/admin/products/${product.id}/inventory`,
                                )
                              }
                              disabled={saving}
                            >
                              <RefreshCcw size={15} />
                            </button>

                            <button
                              type="button"
                              className="maintenance-icon-button"
                              title={product.active ? "Desactivar" : "Activar"}
                              aria-label={
                                product.active
                                  ? `Desactivar ${product.name}`
                                  : `Activar ${product.name}`
                              }
                              onClick={() => {
                                void toggleProduct(product);
                              }}
                              disabled={saving}
                            >
                              {product.active ? (
                                <ToggleRight size={17} />
                              ) : (
                                <ToggleLeft size={17} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="maintenance-pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      1,

                      current - 1,
                    ),
                  )
                }
              >
                Anterior
              </button>

              <span>
                Página {page} de {totalPages}
              </span>

              <button
                type="button"
                className="secondary-button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,

                      current + 1,
                    ),
                  )
                }
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>

      {isProductModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProductModal();
            }
          }}
        >
          <section
            className="maintenance-modal maintenance-modal--xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">
                  {selectedProduct ? "EDICIÓN" : "NUEVO"}
                </p>

                <h2 id="product-modal-title">
                  {selectedProduct ? selectedProduct.name : "Nuevo producto"}
                </h2>

                <p>Datos comerciales, inventario y configuración de venta.</p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeProductModal}
              >
                ×
              </button>
            </header>

            {error ? (
              <p
                className="maintenance-alert maintenance-alert--error"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {error ? (
              <p
                className="maintenance-alert maintenance-alert--error"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <form
              className="maintenance-modal__form"
              onSubmit={(event) => {
                void saveProduct(event);
              }}
            >
              <div className="maintenance-modal__body">
                <section className="maintenance-section maintenance-section--first">
                  <div>
                    <h3>Identificación</h3>

                    <p>Información visible y códigos del producto.</p>
                  </div>

                  <div className="maintenance-form-grid maintenance-form-grid--4">
                    <label>
                      SKU / código
                      <input
                        value={selectedProduct ? form.sku : "AUTOMÁTICO"}
                        readOnly
                        aria-readonly="true"
                        title={
                          selectedProduct
                            ? "El código del producto permanece estable."
                            : "Se generará automáticamente al crear el producto."
                        }
                      />
                      <small className="field-hint">
                        {selectedProduct
                          ? "Código asignado automáticamente y no editable."
                          : "Se generará automáticamente al guardar."}
                      </small>
                    </label>

                    <label>
                      Código de barras
                      <input
                        value={form.barcode}
                        onChange={(event) =>
                          setField(
                            "barcode",

                            event.target.value,
                          )
                        }
                        placeholder="EAN / UPC / GTIN"
                        inputMode="numeric"
                        autoComplete="off"
                        disabled={saving}
                      />
                    </label>

                    <label>
                      Tipo
                      <select
                        value={form.type}
                        onChange={(event) =>
                          setField(
                            "type",

                            event.target.value as ProductType,
                          )
                        }
                        disabled={saving}
                      >
                        {PRODUCT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Unidad de venta
                      <select
                        value={form.saleUnit}
                        onChange={(event) =>
                          setField(
                            "saleUnit",

                            event.target.value as ProductSaleUnit,
                          )
                        }
                        disabled={saving}
                      >
                        {PRODUCT_SALE_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="maintenance-form-grid">
                    <label>
                      Nombre
                      <input
                        required
                        value={form.name}
                        onChange={(event) =>
                          setField(
                            "name",
                            event.target.value.toLocaleUpperCase("es"),
                          )
                        }
                        style={{ textTransform: "uppercase" }}
                        autoComplete="off"
                        placeholder="NOMBRE VISIBLE EN PUNTO DE VENTA"
                        disabled={saving}
                      />
                    </label>

                    <label>
                      Categoría
                      <select
                        value={form.categoryId}
                        onChange={(event) =>
                          setField(
                            "categoryId",

                            event.target.value,
                          )
                        }
                        disabled={saving}
                      >
                        <option value="">Seleccionar categoría</option>

                        {categories
                          .filter(
                            (category) =>
                              category.active ||
                              category.id === form.categoryId,
                          )
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                              {category.active ? "" : " (inactiva)"}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>

                  <label className="maintenance-field">
                    Descripción
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setField(
                          "description",
                          event.target.value.toLocaleUpperCase("es"),
                        )
                      }
                      style={{ textTransform: "uppercase" }}
                      rows={2}
                      placeholder="DESCRIPCIÓN OPCIONAL"
                      disabled={saving}
                    />
                  </label>
                </section>

                <section className="maintenance-section">
                  <div>
                    <h3>Precio e inventario</h3>

                    <p>Valores comerciales y niveles de existencia.</p>
                  </div>

                  <div className="maintenance-form-grid maintenance-form-grid--5">
                    <label>
                      Precio
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) =>
                          setField(
                            "price",

                            event.target.value,
                          )
                        }
                        disabled={saving}
                      />
                    </label>

                    <label>
                      Costo unitario
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={form.unitCost}
                        onChange={(event) =>
                          setField(
                            "unitCost",

                            event.target.value,
                          )
                        }
                        disabled={saving}
                        placeholder="Sin costo"
                      />
                    </label>

                    <label>
                      Impuesto
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.taxRate}
                        onChange={(event) =>
                          setField(
                            "taxRate",

                            event.target.value,
                          )
                        }
                        disabled={saving}
                      />
                    </label>

                    <label>
                      Existencia
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.stockQuantity}
                        onChange={(event) =>
                          setField(
                            "stockQuantity",

                            event.target.value,
                          )
                        }
                        disabled={saving || !form.trackInventory}
                      />
                    </label>

                    <label>
                      Stock mínimo
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.minimumStock}
                        onChange={(event) =>
                          setField(
                            "minimumStock",

                            event.target.value,
                          )
                        }
                        disabled={saving || !form.trackInventory}
                      />
                    </label>
                  </div>

                  <label className="maintenance-switch">
                    <span>
                      <strong>Controlar inventario</strong>

                      <small>
                        Descuenta existencia automáticamente al vender.
                      </small>
                    </span>

                    <input
                      type="checkbox"
                      checked={form.trackInventory}
                      onChange={(event) =>
                        setField(
                          "trackInventory",

                          event.target.checked,
                        )
                      }
                      disabled={saving}
                    />

                    <i aria-hidden="true" />
                  </label>
                </section>

                <section className="maintenance-section">
                  <div>
                    <h3>Configuración adicional</h3>

                    <p>Imagen, estación y disponibilidad.</p>
                  </div>

                  <div className="maintenance-form-grid">
                    <label>
                      Imagen del producto
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={saving}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;

                          setProductImage(file);

                          if (file) {
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    {foodServiceEnabled ? (
                      <label>
                        Estación de preparación
                        <select
                          value={form.preparationStationId}
                          onChange={(event) =>
                            setField(
                              "preparationStationId",

                              event.target.value,
                            )
                          }
                          disabled={saving}
                        >
                          <option value="">Sin estación</option>

                          {stations

                            .filter(
                              (station) =>
                                station.active ||
                                station.id === form.preparationStationId,
                            )

                            .map((station) => (
                              <option key={station.id} value={station.id}>
                                {station.name}

                                {station.active ? "" : " (inactiva)"}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : (
                      <div />
                    )}
                  </div>

                  {imagePreview ? (
                    <div className="maintenance-image-preview">
                      <img src={imagePreview} alt="Vista previa del producto" />
                    </div>
                  ) : null}

                  {selectedProduct ? (
                    <label className="maintenance-switch">
                      <span>
                        <strong>Producto activo</strong>

                        <small>
                          Los productos inactivos no aparecen en el Punto de
                          Venta.
                        </small>
                      </span>

                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(event) =>
                          setField(
                            "active",

                            event.target.checked,
                          )
                        }
                        disabled={saving}
                      />

                      <i aria-hidden="true" />
                    </label>
                  ) : null}
                </section>
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={closeProductModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="erp-button-primary"
                  disabled={saving}
                >
                  <Save size={16} />

                  {saving
                    ? "Guardando..."
                    : selectedProduct
                      ? "Guardar cambios"
                      : "Crear producto"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {isCategoriesModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !categorySaving) {
              setIsCategoriesModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal maintenance-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">CATÁLOGO</p>
                <h2 id="category-modal-title">Categorías de productos</h2>
                <p>
                  Administra las categorías y el icono que se mostrará en el
                  Punto de Venta.
                </p>
              </div>
              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={categorySaving}
                onClick={() => setIsCategoriesModalOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="maintenance-modal__body">
              <section className="maintenance-section maintenance-section--first">
                <div className="maintenance-station-toolbar">
                  <div>
                    <h3>
                      {categoryForm.id ? "Editar categoría" : "Nueva categoría"}
                    </h3>
                    <p>Código, nombre, icono y orden de visualización.</p>
                  </div>
                  {categoryForm.id ? (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={categorySaving}
                      onClick={resetCategoryForm}
                    >
                      Nueva categoría
                    </button>
                  ) : null}
                </div>

                <div className="maintenance-inline-fields maintenance-inline-fields--station">
                  <label>
                    Código
                    <input
                      value={categoryForm.code}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                      placeholder="BEBIDAS"
                      disabled={categorySaving}
                    />
                  </label>

                  <label>
                    Nombre
                    <input
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Bebidas"
                      disabled={categorySaving}
                    />
                  </label>

                  <label>
                    Orden
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={categoryForm.sortOrder}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                      disabled={categorySaving}
                    />
                  </label>

                  <button
                    type="button"
                    className="erp-button-primary"
                    disabled={categorySaving || saving}
                    onClick={() => {
                      void saveCategory();
                    }}
                  >
                    <Save size={16} />
                    {categorySaving
                      ? "Guardando..."
                      : categoryForm.id
                        ? "Guardar"
                        : "Crear"}
                  </button>
                </div>

                <div className="maintenance-category-icon-section">
                  <div className="maintenance-category-icon-heading">
                    <div>
                      <h4>Icono de la categoría</h4>
                      <p>Selecciona el icono que identificará la categoría.</p>
                    </div>
                    {(() => {
                      const PreviewIcon = categoryIconComponent(
                        categoryForm.iconCode,
                      );
                      return (
                        <span className="maintenance-category-icon-preview">
                          <PreviewIcon size={20} />
                          {categoryForm.name.trim() || "Categoría"}
                        </span>
                      );
                    })()}
                  </div>

                  <div
                    className="maintenance-category-icon-picker"
                    role="radiogroup"
                    aria-label="Icono de categoría"
                  >
                    {CATEGORY_ICONS.map(({ code, label, Icon }) => (
                      <button
                        type="button"
                        key={code}
                        className={
                          categoryForm.iconCode === code
                            ? "maintenance-category-icon-option maintenance-category-icon-option--selected"
                            : "maintenance-category-icon-option"
                        }
                        onClick={() =>
                          setCategoryForm((current) => ({
                            ...current,
                            iconCode: code,
                          }))
                        }
                        disabled={categorySaving}
                        title={label}
                        aria-label={label}
                        aria-pressed={categoryForm.iconCode === code}
                      >
                        <Icon size={20} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {categoryForm.id ? (
                  <label className="maintenance-switch">
                    <span>
                      <strong>Categoría activa</strong>
                      <small>
                        Controla si la categoría está disponible para el
                        catálogo.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={categoryForm.active}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          active: event.target.checked,
                        }))
                      }
                      disabled={categorySaving}
                    />
                    <i aria-hidden="true" />
                  </label>
                ) : null}
              </section>

              <section className="maintenance-section">
                <div>
                  <h3>Categorías configuradas</h3>
                </div>

                {categories.length === 0 ? (
                  <div className="operations-empty">
                    No hay categorías configuradas.
                  </div>
                ) : (
                  <div className="maintenance-category-list">
                    {categories.map((category) => {
                      const CategoryIcon = categoryIconComponent(
                        category.iconCode,
                      );

                      return (
                        <button
                          type="button"
                          key={category.id}
                          className={
                            categoryForm.id === category.id
                              ? "maintenance-category-item maintenance-category-item--selected"
                              : "maintenance-category-item"
                          }
                          onClick={() => editCategory(category)}
                          disabled={categorySaving}
                        >
                          <span className="maintenance-category-item__icon">
                            <CategoryIcon size={18} />
                          </span>
                          <span className="maintenance-category-item__text">
                            <strong>{category.name}</strong>
                            <small>
                              {category.code} · orden {category.sortOrder}
                            </small>
                          </span>
                          <span
                            className={
                              category.active
                                ? "maintenance-badge maintenance-badge--success"
                                : "maintenance-badge maintenance-badge--muted"
                            }
                          >
                            {category.active ? "Activa" : "Inactiva"}
                          </span>
                          <Pencil size={15} />
                        </button>
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
                disabled={categorySaving}
                onClick={() => setIsCategoriesModalOpen(false)}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {foodServiceEnabled && isStationsModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !stationSaving) {
              setIsStationsModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal maintenance-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="station-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">PREPARACIÓN</p>

                <h2 id="station-modal-title">Estaciones de preparación</h2>

                <p>
                  Define Cocina, Bar u otras estaciones y asígnalas a los
                  productos.
                </p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={stationSaving}
                onClick={() => setIsStationsModalOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="maintenance-modal__body">
              <section className="maintenance-section maintenance-section--first">
                <div className="maintenance-station-toolbar">
                  <div>
                    <h3>
                      {stationForm.id ? "Editar estación" : "Nueva estación"}
                    </h3>

                    <p>Código, nombre y orden de visualización.</p>
                  </div>

                  {stationForm.id ? (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={stationSaving}
                      onClick={resetStationForm}
                    >
                      Nueva estación
                    </button>
                  ) : null}
                </div>

                <div className="maintenance-inline-fields maintenance-inline-fields--station">
                  <label>
                    Código
                    <input
                      value={stationForm.code}
                      onChange={(event) =>
                        setStationForm((current) => ({
                          ...current,

                          code: event.target.value,
                        }))
                      }
                      placeholder="COCINA"
                      disabled={stationSaving}
                    />
                  </label>

                  <label>
                    Nombre
                    <input
                      value={stationForm.name}
                      onChange={(event) =>
                        setStationForm((current) => ({
                          ...current,

                          name: event.target.value,
                        }))
                      }
                      placeholder="Cocina"
                      disabled={stationSaving}
                    />
                  </label>

                  <label>
                    Orden
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={stationForm.sortOrder}
                      onChange={(event) =>
                        setStationForm((current) => ({
                          ...current,

                          sortOrder: event.target.value,
                        }))
                      }
                      disabled={stationSaving}
                    />
                  </label>

                  <button
                    type="button"
                    className="erp-button-primary"
                    disabled={stationSaving || saving}
                    onClick={() => {
                      void saveStation();
                    }}
                  >
                    <Save size={16} />

                    {stationSaving
                      ? "Guardando..."
                      : stationForm.id
                        ? "Guardar"
                        : "Crear"}
                  </button>
                </div>

                {stationForm.id ? (
                  <label className="maintenance-switch">
                    <span>
                      <strong>Estación activa</strong>

                      <small>
                        Controla si puede asignarse a nuevos productos.
                      </small>
                    </span>

                    <input
                      type="checkbox"
                      checked={stationForm.active}
                      onChange={(event) =>
                        setStationForm((current) => ({
                          ...current,

                          active: event.target.checked,
                        }))
                      }
                      disabled={stationSaving}
                    />

                    <i aria-hidden="true" />
                  </label>
                ) : null}
              </section>

              <section className="maintenance-section">
                <div>
                  <h3>Estaciones configuradas</h3>
                </div>

                {stations.length === 0 ? (
                  <div className="operations-empty">
                    No hay estaciones configuradas.
                  </div>
                ) : (
                  <div className="maintenance-station-list">
                    {stations.map((station) => (
                      <button
                        type="button"
                        key={station.id}
                        className={
                          stationForm.id === station.id
                            ? "maintenance-station-item maintenance-station-item--selected"
                            : "maintenance-station-item"
                        }
                        onClick={() => editStation(station)}
                        disabled={stationSaving}
                      >
                        <span>
                          <strong>{station.name}</strong>

                          <small>
                            {station.code} · orden {station.sortOrder}
                          </small>
                        </span>

                        <span
                          className={
                            station.active
                              ? "maintenance-badge maintenance-badge--success"
                              : "maintenance-badge maintenance-badge--danger"
                          }
                        >
                          {station.active ? "Activa" : "Inactiva"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="maintenance-modal__footer">
              <button
                type="button"
                className="secondary-button"
                disabled={stationSaving}
                onClick={() => setIsStationsModalOpen(false)}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      <ProductAssignmentModals
        mode={assignmentMode}
        onClose={() => setAssignmentMode(null)}
        onCompleted={async () => {
          if (pointId) {
            await loadCatalog(pointId);
          }
        }}
      />
    </main>
  );
}
