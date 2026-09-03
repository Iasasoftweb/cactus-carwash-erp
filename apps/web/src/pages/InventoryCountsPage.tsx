import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Plus, Printer, Save, XCircle } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardContextResponse, InventoryCountResponse, InventoryOverviewProductResponse } from '@cactus/shared';
import { ERP_PERMISSIONS } from '@cactus/shared';
import { api, apiAssetUrl } from '../lib/api';
import { hasPermission } from '../lib/authStorage';

const statusLabel = { DRAFT: 'Borrador', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado' } as const;

export function InventoryCountsPage() {
  const navigate = useNavigate();
  const canManage = hasPermission(ERP_PERMISSIONS.inventoryManage);
  const [overview, setOverview] = useState<InventoryOverviewProductResponse[]>([]);
  const [context, setContext] = useState<DashboardContextResponse | null>(null);
  const [counts, setCounts] = useState<InventoryCountResponse[]>([]);
  const [selected, setSelected] = useState<InventoryCountResponse | null>(null);
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const branches = useMemo(() => overview[0]?.branches ?? [], [overview]);
  const money = (value: number): string => new Intl.NumberFormat('es-DO', { style: 'currency', currency: context?.currencyCode ?? 'DOP' }).format(value);
  const dateTime = (value: string): string => new Intl.DateTimeFormat('es-DO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

  function applyCount(count: InventoryCountResponse): void {
    setSelected(count);
    setValues(Object.fromEntries(count.items.map((item) => [item.productBranchId, item.countedQuantity === null ? '' : String(item.countedQuantity)])));
    setItemNotes(Object.fromEntries(count.items.map((item) => [item.productBranchId, item.note ?? ''])));
  }

  async function load(): Promise<void> {
    setLoading(true); setError('');
    try {
      const [inventory, dashboard, countRows] = await Promise.all([api.inventoryOverview(), api.dashboardContext(), api.inventoryCounts()]);
      setOverview(inventory); setContext(dashboard); setCounts(countRows);
      const current = selected ? countRows.find((row) => row.id === selected.id) : countRows.find((row) => row.status === 'DRAFT');
      if (current) applyCount(current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible cargar los conteos.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!branchId) { setError('Selecciona la sucursal que será contada.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const count = await api.createInventoryCount({ branchId, notes: notes.trim() || undefined });
      applyCount(count); setNotes(''); setMessage(`Jornada ${count.reference} creada correctamente.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible crear la jornada.'); }
    finally { setSaving(false); }
  }

  async function save(): Promise<void> {
    if (!selected || selected.status !== 'DRAFT') return;
    const items = selected.items.flatMap((item) => {
      const raw = values[item.productBranchId]?.trim();
      if (!raw) return [];
      return [{ productBranchId: item.productBranchId, countedQuantity: Number(raw), note: itemNotes[item.productBranchId]?.trim() || undefined }];
    });
    if (!items.length) { setError('Registra al menos una cantidad física.'); return; }
    setSaving(true); setError(''); setMessage('');
    try { const updated = await api.updateInventoryCountItems(selected.id, { items }); applyCount(updated); setMessage('Conteo guardado correctamente.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible guardar el conteo.'); }
    finally { setSaving(false); }
  }

  async function confirm(): Promise<void> {
    if (!selected || !window.confirm('Esta acción actualizará las existencias y no podrá deshacerse. ¿Confirmar conteo?')) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const items = selected.items.map((item) => ({
        productBranchId: item.productBranchId,
        countedQuantity: Number(values[item.productBranchId]),
        note: itemNotes[item.productBranchId]?.trim() || undefined,
      }));
      await api.updateInventoryCountItems(selected.id, { items });
      const updated = await api.confirmInventoryCount(selected.id);
      applyCount(updated); setMessage('Conteo confirmado e inventario actualizado.'); await load();
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible confirmar el conteo.'); }
    finally { setSaving(false); }
  }

  async function cancel(): Promise<void> {
    if (!selected || !window.confirm('¿Cancelar esta jornada de conteo?')) return;
    setSaving(true); setError('');
    try { const updated = await api.cancelInventoryCount(selected.id); applyCount(updated); setMessage('Jornada cancelada.'); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible cancelar la jornada.'); }
    finally { setSaving(false); }
  }

  const liveSummary = useMemo(() => {
    if (!selected) return { counted: 0, differences: 0, value: 0 };
    return selected.items.reduce((summary, item) => {
      const raw = values[item.productBranchId]?.trim();
      if (!raw) return summary;
      const difference = Number(raw) - item.expectedQuantity;
      return { counted: summary.counted + 1, differences: summary.differences + (difference !== 0 ? 1 : 0), value: summary.value + Math.abs(difference * (item.unitCost ?? 0)) };
    }, { counted: 0, differences: 0, value: 0 });
  }, [selected, values]);

  return (
    <main className="module-page maintenance-page inventory-count-page">
      <header className="module-header maintenance-header"><div className="maintenance-header__content"><div className="maintenance-header__icon"><ClipboardList size={22} /></div><div className="maintenance-header__text"><h1>Conteo físico de inventario</h1><p>Compara la existencia del sistema con las unidades encontradas.</p></div></div><div className="maintenance-toolbar__actions">{selected?.status === 'CONFIRMED' ? <button className="erp-button-primary" type="button" onClick={() => window.print()}><Printer size={16} /> Imprimir acta</button> : null}<button className="secondary-button" type="button" onClick={() => navigate('/admin/inventory/overview')}><ArrowLeft size={16} /> Existencias</button></div></header>
      {error ? <div className="maintenance-alert maintenance-alert--error"><AlertTriangle size={18} />{error}</div> : null}
      {message ? <div className="maintenance-alert maintenance-alert--success"><CheckCircle2 size={18} />{message}</div> : null}
      {loading ? <div className="maintenance-alert">Cargando jornadas de conteo...</div> : null}

      <section className="inventory-count-print-brand" aria-hidden="true">{context?.companyLogoUrl ? <img src={apiAssetUrl(context.companyLogoUrl)} alt="" /> : null}<div><strong>{context?.companyName ?? 'Empresa'}</strong><h1>Acta de conteo físico</h1><p>{selected?.reference} · {selected?.branchName} · {selected ? dateTime(selected.createdAt) : ''}</p></div></section>

      <section className="inventory-count-layout">
        <aside className="settings-card maintenance-card inventory-count-sidebar">
          <form onSubmit={(event) => void create(event)}><p className="eyebrow">NUEVA JORNADA</p><h2>Iniciar conteo</h2><label>Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Seleccionar sucursal</option>{branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.branchName} · {branch.branchCode}</option>)}</select></label><label>Observación<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Motivo o responsable..." /></label><button className="erp-button-primary" type="submit" disabled={saving}><Plus size={16} /> Crear jornada</button></form>
          <div className="inventory-count-history"><p className="eyebrow">HISTORIAL</p>{counts.map((count) => <button key={count.id} type="button" className={selected?.id === count.id ? 'inventory-count-history__item inventory-count-history__item--active' : 'inventory-count-history__item'} onClick={() => applyCount(count)}><span><strong>{count.reference}</strong><small>{count.branchName} · {dateTime(count.createdAt)}</small></span><b className={`inventory-count-status inventory-count-status--${count.status.toLowerCase()}`}>{statusLabel[count.status]}</b></button>)}</div>
        </aside>

        <section className="settings-card maintenance-card inventory-count-workspace">
          {!selected ? <div className="maintenance-empty"><ClipboardList size={34} /><strong>Selecciona o crea una jornada</strong><span>La jornada tomará una fotografía de la existencia actual.</span></div> : <>
            <div className="maintenance-toolbar inventory-count-heading"><div><p className="eyebrow">{selected.reference}</p><h2>{selected.branchName}</h2><small>Creada por {selected.createdBy} · {dateTime(selected.createdAt)}</small></div><span className={`inventory-count-status inventory-count-status--${selected.status.toLowerCase()}`}>{statusLabel[selected.status]}</span></div>
            <div className="inventory-count-summary"><article><span>Productos</span><strong>{selected.totalItems}</strong></article><article><span>Contados</span><strong>{selected.status === 'DRAFT' ? liveSummary.counted : selected.countedItems}</strong></article><article><span>Con diferencia</span><strong>{selected.status === 'DRAFT' ? liveSummary.differences : selected.differenceItems}</strong></article><article><span>Valor diferencia</span><strong>{money(selected.status === 'DRAFT' ? liveSummary.value : selected.totalDifferenceValue)}</strong></article></div>
            <div className="maintenance-table-wrap"><table className="maintenance-table inventory-count-table"><thead><tr><th>Producto</th><th>Sistema</th><th>Conteo físico</th><th>Diferencia</th><th>Costo</th><th>Valor diferencia</th><th>Observación</th></tr></thead><tbody>{selected.items.map((item) => { const raw = values[item.productBranchId] ?? ''; const counted = raw === '' ? null : Number(raw); const difference = selected.status === 'DRAFT' ? counted === null ? null : counted - item.expectedQuantity : item.differenceQuantity; const differenceValue = difference === null || item.unitCost === null ? null : difference * item.unitCost; return <tr key={item.id}><td><strong>{item.productName}</strong><small>{item.productSku}</small></td><td className="inventory-count-number">{item.expectedQuantity}</td><td>{selected.status === 'DRAFT' ? <input className="inventory-count-input" type="number" min="0" step="0.001" value={raw} onChange={(event) => setValues((current) => ({ ...current, [item.productBranchId]: event.target.value }))} /> : item.countedQuantity}</td><td className={`inventory-count-number ${difference && difference !== 0 ? difference > 0 ? 'inventory-count-positive' : 'inventory-count-negative' : ''}`}>{difference === null ? '—' : difference}</td><td>{item.unitCost === null ? 'Sin costo' : money(item.unitCost)}</td><td>{differenceValue === null ? '—' : money(differenceValue)}</td><td>{selected.status === 'DRAFT' ? <input value={itemNotes[item.productBranchId] ?? ''} onChange={(event) => setItemNotes((current) => ({ ...current, [item.productBranchId]: event.target.value }))} placeholder="Razón de diferencia..." /> : item.note ?? '—'}</td></tr>; })}</tbody></table></div>
            {selected.status === 'DRAFT' && canManage ? <footer className="inventory-count-actions"><button className="secondary-button" type="button" onClick={() => void cancel()} disabled={saving}><XCircle size={16} /> Cancelar jornada</button><div><button className="secondary-button" type="button" onClick={() => void save()} disabled={saving}><Save size={16} /> Guardar borrador</button><button className="erp-button-primary" type="button" onClick={() => void confirm()} disabled={saving || liveSummary.counted !== selected.totalItems}><CheckCircle2 size={16} /> Confirmar y ajustar</button></div></footer> : null}
          </>}
        </section>
      </section>
    </main>
  );
}
