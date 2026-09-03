import { AlertTriangle, ArrowDownLeft, ArrowLeft, ArrowUpRight, BookOpenCheck, Printer, Search } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardContextResponse, InventoryKardexEntryResponse, InventoryMovementType, InventoryOverviewProductResponse } from '@cactus/shared';
import { api, apiAssetUrl } from '../lib/api';

const LABELS: Record<InventoryMovementType, string> = {
  INITIAL: 'Existencia inicial', PURCHASE: 'Compra', SALE: 'Venta',
  ADJUSTMENT_IN: 'Ajuste de entrada', ADJUSTMENT_OUT: 'Ajuste de salida',
  RETURN_IN: 'Devolución de entrada', RETURN_OUT: 'Devolución de salida',
  TRANSFER_OUT: 'Transferencia enviada', TRANSFER_IN: 'Transferencia recibida',
};
const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export function InventoryKardexPage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), [today]);
  const [overview, setOverview] = useState<InventoryOverviewProductResponse[]>([]);
  const [context, setContext] = useState<DashboardContextResponse | null>(null);
  const [rows, setRows] = useState<InventoryKardexEntryResponse[]>([]);
  const [branchId, setBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState(isoDate(monthStart));
  const [to, setTo] = useState(isoDate(today));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadKardex(): Promise<void> {
    setLoading(true); setError('');
    try { setRows(await api.inventoryKardex({ branchId, productId, from, to })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible cargar el Kardex.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    Promise.all([api.inventoryOverview(), api.dashboardContext()])
      .then(([inventory, dashboard]) => {
        setOverview(inventory); setContext(dashboard);
        return api.inventoryKardex({ from: isoDate(monthStart), to: isoDate(today) });
      })
      .then(setRows).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [monthStart, today]);

  const branches = useMemo(() => overview[0]?.branches ?? [], [overview]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return !term ? rows : rows.filter((row) =>
      [row.productName, row.productSku, row.branchName, row.referenceNumber, row.note]
        .filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(term)));
  }, [rows, search]);
  const totals = useMemo(() => filteredRows.reduce((result, row) => ({
    entries: result.entries + (row.direction === 'IN' ? row.quantity : 0),
    exits: result.exits + (row.direction === 'OUT' ? row.quantity : 0),
    valueIn: result.valueIn + (row.direction === 'IN' ? row.movementValue ?? 0 : 0),
    valueOut: result.valueOut + (row.direction === 'OUT' ? row.movementValue ?? 0 : 0),
    missingCost: result.missingCost + (row.unitCost === null ? 1 : 0),
  }), { entries: 0, exits: 0, valueIn: 0, valueOut: 0, missingCost: 0 }), [filteredRows]);
  const money = (value: number): string => new Intl.NumberFormat('es-DO', { style: 'currency', currency: context?.currencyCode ?? 'DOP', minimumFractionDigits: 2 }).format(value);
  const dateTime = (value: string): string => new Intl.DateTimeFormat('es-DO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  function submit(event: FormEvent): void { event.preventDefault(); void loadKardex(); }

  return (
    <main className="module-page maintenance-page inventory-kardex-page">
      <header className="module-header maintenance-header inventory-kardex-header">
        <div className="maintenance-header__content"><div className="maintenance-header__icon"><BookOpenCheck size={22} /></div><div className="maintenance-header__text"><h1>Kardex valorizado</h1><p>Trazabilidad de entradas, salidas, costos y saldos por sucursal.</p></div></div>
        <div className="maintenance-toolbar__actions"><button className="erp-button-primary" type="button" onClick={() => window.print()} disabled={!filteredRows.length}><Printer size={16} /> Imprimir</button><button className="secondary-button" type="button" onClick={() => navigate('/admin/inventory/overview')}><ArrowLeft size={16} /> Existencias</button></div>
      </header>
      {error ? <div className="maintenance-alert maintenance-alert--error"><AlertTriangle size={18} />{error}</div> : null}
      {totals.missingCost ? <div className="maintenance-alert maintenance-alert--warning"><AlertTriangle size={18} />{totals.missingCost} movimiento(s) histórico(s) no tienen costo registrado y se muestran sin valor.</div> : null}
      <section className="inventory-kardex-print-brand" aria-hidden="true">{context?.companyLogoUrl ? <img src={apiAssetUrl(context.companyLogoUrl)} alt="" /> : null}<div><strong>{context?.companyName ?? 'Empresa'}</strong><h1>Kardex valorizado</h1><p>Período: {from} al {to}</p></div></section>
      <form className="settings-card maintenance-card inventory-kardex-filters" onSubmit={submit}>
        <label>Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.branchName} · {branch.branchCode}</option>)}</select></label>
        <label>Producto<select value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Todos los productos</option>{overview.map((product) => <option key={product.productId} value={product.productId}>{product.name} · {product.sku}</option>)}</select></label>
        <label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <button className="erp-button-primary" type="submit" disabled={loading}><Search size={16} />{loading ? 'Consultando...' : 'Consultar'}</button>
      </form>
      <section className="inventory-kardex-summary"><article><ArrowDownLeft size={19} /><span>Entradas<strong>{totals.entries}</strong><small>{money(totals.valueIn)}</small></span></article><article><ArrowUpRight size={19} /><span>Salidas<strong>{totals.exits}</strong><small>{money(totals.valueOut)}</small></span></article><article><BookOpenCheck size={19} /><span>Movimientos<strong>{filteredRows.length}</strong><small>{totals.missingCost ? `${totals.missingCost} sin costo` : 'Todos valorizados'}</small></span></article></section>
      <section className="settings-card maintenance-card"><div className="maintenance-toolbar inventory-kardex-toolbar"><div><p className="eyebrow">MOVIMIENTOS</p><h2>{filteredRows.length} registros</h2></div><label className="maintenance-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar referencia, producto o sucursal..." /></label></div>
        <div className="maintenance-table-wrap"><table className="maintenance-table inventory-kardex-table"><thead><tr><th>Fecha</th><th>Producto</th><th>Sucursal</th><th>Movimiento</th><th>Entrada</th><th>Salida</th><th>Saldo</th><th>Costo</th><th>Valor movimiento</th><th>Valor saldo</th><th>Referencia</th></tr></thead><tbody>
          {filteredRows.map((row) => <tr key={row.id}><td>{dateTime(row.createdAt)}</td><td><strong>{row.productName}</strong><small>{row.productSku}</small></td><td>{row.branchName}<small>{row.branchCode}</small></td><td><span className={`inventory-kardex-type inventory-kardex-type--${row.direction.toLowerCase()}`}>{LABELS[row.type]}</span></td><td className="inventory-kardex-number inventory-kardex-number--in">{row.direction === 'IN' ? row.quantity : '—'}</td><td className="inventory-kardex-number inventory-kardex-number--out">{row.direction === 'OUT' ? row.quantity : '—'}</td><td className="inventory-kardex-number"><strong>{row.newStock}</strong></td><td className="inventory-kardex-number">{row.unitCost === null ? 'Sin costo' : money(row.unitCost)}</td><td className="inventory-kardex-number">{row.movementValue === null ? '—' : money(row.movementValue)}</td><td className="inventory-kardex-number">{row.balanceValue === null ? '—' : money(row.balanceValue)}</td><td>{row.referenceNumber ?? '—'}<small>{row.createdBy ?? ''}</small></td></tr>)}
          {!loading && !filteredRows.length ? <tr><td colSpan={11} className="maintenance-empty">No hay movimientos para los filtros seleccionados.</td></tr> : null}
        </tbody></table></div>
      </section>
    </main>
  );
}
