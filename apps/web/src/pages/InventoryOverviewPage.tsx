import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  BookOpenCheck,
  ClipboardList,
  ClipboardCheck,
  Boxes,
  Printer,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  DashboardContextResponse,
  InventoryOverviewProductResponse,
} from '@cactus/shared';
import { api, apiAssetUrl } from '../lib/api';

type StockFilter = 'ALL' | 'LOW' | 'OUT' | 'MISSING_COST';

export function InventoryOverviewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InventoryOverviewProductResponse[]>([]);
  const [context, setContext] = useState<DashboardContextResponse | null>(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.inventoryOverview(),
      api.dashboardContext(),
    ])
      .then(([inventoryRows, dashboardContext]) => {
        setRows(inventoryRows);
        setContext(dashboardContext);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const branches = useMemo(() => rows[0]?.branches ?? [], [rows]);

  const generatedAt = useMemo(
    () => new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date()),
    [],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.name.toLocaleLowerCase().includes(term) ||
        row.sku.toLocaleLowerCase().includes(term) ||
        row.barcode?.toLocaleLowerCase().includes(term);

      const activeStocks = row.branches.filter((branch) => branch.active);
      const isOut = activeStocks.some((branch) => branch.stockQuantity <= 0);
      const isLow = activeStocks.some(
        (branch) =>
          branch.minimumStock > 0 &&
          branch.stockQuantity > 0 &&
          branch.stockQuantity <= branch.minimumStock,
      );

      const matchesStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'OUT' && isOut) ||
        (stockFilter === 'LOW' && isLow) ||
        (stockFilter === 'MISSING_COST' && row.missingCost);

      return matchesSearch && matchesStock;
    });
  }, [rows, search, stockFilter]);

  const reportTotal = useMemo(
    () => filteredRows.reduce((total, row) => total + row.totalStock, 0),
    [filteredRows],
  );

  const valuation = useMemo(
    () =>
      filteredRows.reduce(
        (summary, row) => ({
          investment: summary.investment + row.totalInventoryValue,
          potentialSale: summary.potentialSale + row.totalPotentialSaleValue,
          margin: summary.margin + row.totalEstimatedMargin,
          missingCosts: summary.missingCosts + (row.missingCost ? 1 : 0),
        }),
        { investment: 0, potentialSale: 0, margin: 0, missingCosts: 0 },
      ),
    [filteredRows],
  );

  function money(value: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: context?.currencyCode ?? 'DOP',
      minimumFractionDigits: 2,
    }).format(value);
  }

  function stockStatus(stock: number, minimum: number): string {
    if (stock <= 0) return 'Agotado';
    if (minimum > 0 && stock <= minimum) return 'Stock bajo';
    return 'Disponible';
  }

  return (
    <main className="module-page maintenance-page inventory-overview-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Boxes size={22} />
          </div>
          <div className="maintenance-header__text">
            <h1>Existencias por sucursal</h1>
            <p>Consulta el inventario de la principal y todas las sucursales.</p>
          </div>
        </div>

        <div className="maintenance-toolbar__actions">
          <button type="button" className="secondary-button" onClick={() => navigate('/admin/inventory/audit')}>
            <ClipboardCheck size={16} /> Historial de ajustes
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/inventory/counts')}
          >
            <ClipboardList size={16} />
            Conteo físico
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/inventory/kardex')}
          >
            <BookOpenCheck size={16} />
            Kardex
          </button>
          <button
            type="button"
            className="erp-button-primary"
            disabled={loading || filteredRows.length === 0}
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Imprimir reporte
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/inventory/transfers')}
          >
            <ArrowRightLeft size={16} />
            Transferir
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
        <div className="maintenance-alert maintenance-alert--error" role="alert">
          <AlertTriangle size={18} />
          {error}
        </div>
      ) : null}

      <section className="inventory-print-header" aria-hidden="true">
        <div className="inventory-print-brand">
          {context?.companyLogoUrl ? (
            <img
              src={apiAssetUrl(context.companyLogoUrl)}
              alt=""
            />
          ) : null}
          <div>
            <strong>{context?.companyName ?? 'Empresa'}</strong>
            <h1>Reporte de Existencias por Sucursal</h1>
            <p>Generado el {generatedAt}</p>
          </div>
        </div>
        <div className="inventory-print-summary">
          <span><b>{filteredRows.length}</b> artículos</span>
          <span><b>{branches.length}</b> sucursales</span>
          <span><b>{money(valuation.investment)}</b> invertido</span>
        </div>
      </section>

      <section className="inventory-valuation-grid">
        <article>
          <span>Existencia total</span>
          <strong>{reportTotal}</strong>
          <small>Unidades disponibles</small>
        </article>
        <article>
          <span>Inversión en inventario</span>
          <strong>{money(valuation.investment)}</strong>
          <small>Existencia × costo unitario</small>
        </article>
        <article>
          <span>Valor potencial de venta</span>
          <strong>{money(valuation.potentialSale)}</strong>
          <small>Existencia × precio de venta</small>
        </article>
        <article>
          <span>Margen bruto estimado</span>
          <strong>{money(valuation.margin)}</strong>
          <small>Venta potencial menos inversión</small>
        </article>
      </section>

      {valuation.missingCosts > 0 ? (
        <div className="maintenance-alert maintenance-alert--warning" role="status">
          <AlertTriangle size={18} />
          {valuation.missingCosts} artículo(s) con existencia no tienen costo
          configurado y no están incluidos correctamente en la inversión.
        </div>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar inventory-overview-controls">
          <div>
            <p className="eyebrow">INVENTARIO CONSOLIDADO</p>
            <h2>{filteredRows.length} artículos</h2>
          </div>

          <div className="maintenance-toolbar__actions">
            <label className="maintenance-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, SKU o código..."
              />
            </label>
            <select
              value={stockFilter}
              onChange={(event) =>
                setStockFilter(event.target.value as StockFilter)
              }
              aria-label="Filtrar por existencia"
            >
              <option value="ALL">Todos</option>
              <option value="LOW">Stock bajo</option>
              <option value="OUT">Agotados</option>
              <option value="MISSING_COST">Sin costo configurado</option>
            </select>
          </div>
        </div>

        <div className="maintenance-table-wrap">
          <table className="maintenance-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>SKU / código</th>
                {branches.map((branch) => (
                  <th key={branch.branchId}>
                    {branch.branchName}
                    <small style={{ display: 'block', fontWeight: 500 }}>
                      {branch.branchCode}
                    </small>
                  </th>
                ))}
                <th>Total empresa</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.productId}>
                  <td>
                    <strong>{row.name}</strong>
                    {!row.trackInventory ? (
                      <small style={{ display: 'block' }}>Sin control de inventario</small>
                    ) : null}
                  </td>
                  <td>
                    {row.sku}
                    {row.barcode ? (
                      <small style={{ display: 'block' }}>{row.barcode}</small>
                    ) : null}
                  </td>
                  {row.branches.map((branch) => {
                    const status = stockStatus(
                      branch.stockQuantity,
                      branch.minimumStock,
                    );
                    return (
                      <td key={branch.branchId}>
                        <strong>{branch.stockQuantity}</strong>
                        <small
                          className={
                            status === 'Agotado'
                              ? 'inventory-stock-status inventory-stock-status--danger'
                              : status === 'Stock bajo'
                                ? 'inventory-stock-status inventory-stock-status--warning'
                                : 'inventory-stock-status inventory-stock-status--success'
                          }
                        >
                          {branch.active ? status : 'No asignado'}
                        </small>
                        {branch.active && branch.stockQuantity > 0 ? (
                          <small className="inventory-cell-value">
                            {branch.missingCost
                              ? 'Costo pendiente'
                              : money(branch.inventoryValue)}
                          </small>
                        ) : null}
                      </td>
                    );
                  })}
                  <td>
                    <strong>{row.totalStock}</strong>
                    <small className="inventory-cell-value">
                      {money(row.totalInventoryValue)}
                    </small>
                  </td>
                </tr>
              ))}

              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={branches.length + 3}>
                    No hay artículos que coincidan con los filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? <p>Cargando existencias...</p> : null}
      </section>

      <footer className="inventory-print-footer" aria-hidden="true">
        <span>Cactus POS · Inventario consolidado</span>
        <span>{context?.companyName ?? ''}</span>
      </footer>
    </main>
  );
}
