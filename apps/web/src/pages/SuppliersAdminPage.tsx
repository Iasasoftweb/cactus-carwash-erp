import {
  Building2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  ToggleLeft,
  ToggleRight,
  Truck,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CreateSupplierRequest,
  PointOfSaleResponse,
  SupplierResponse,
  UpdateSupplierRequest,
} from '@cactus/shared';
import { api } from '../lib/api';

const PAGE_SIZE = 10;

type SupplierFormState = {
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
};

const EMPTY_FORM: SupplierFormState = {
  name: '',
  taxId: '',
  phone: '',
  email: '',
  address: '',
  active: true,
};

export function SuppliersAdminPage() {
  const navigate = useNavigate();

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [pointId, setPointId] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === pointId) ?? null,
    [points, pointId],
  );

  const companyId = selectedPoint?.companyId ?? '';

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedId) ?? null,
    [suppliers, selectedId],
  );

  const visibleSuppliers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      if (!showInactive && !supplier.active) return false;
      if (!normalized) return true;

      return [
        supplier.name,
        supplier.taxId ?? '',
        supplier.phone ?? '',
        supplier.email ?? '',
        supplier.address ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [suppliers, query, showInactive]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleSuppliers.length / PAGE_SIZE),
  );

  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleSuppliers.slice(start, start + PAGE_SIZE);
  }, [visibleSuppliers, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!isModalOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        setIsModalOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, saving]);

  function setField<K extends keyof SupplierFormState>(
    field: K,
    value: SupplierFormState[K],
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm(): void {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate(): void {
    resetForm();
    setError('');
    setMessage('');
    setIsModalOpen(true);
  }

  function closeModal(): void {
    if (saving) return;
    setIsModalOpen(false);
    resetForm();
  }

  function editSupplier(supplier: SupplierResponse): void {
    setSelectedId(supplier.id);
    setForm({
      name: supplier.name,
      taxId: supplier.taxId ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      active: supplier.active,
    });
    setError('');
    setMessage('');
    setIsModalOpen(true);
  }

  async function loadSuppliers(currentCompanyId: string): Promise<void> {
    if (!currentCompanyId) {
      setSuppliers([]);
      return;
    }

    setSuppliers(await api.suppliers(currentCompanyId));
  }

  useEffect(() => {
    setLoading(true);
    setError('');

    api
      .posPoints()
      .then(async (pointRows) => {
        const coffeePoint =
          pointRows.find((point) => {
            const code = point.code?.toUpperCase() ?? '';
            const name = point.name.toUpperCase();
            return code.includes('COFFEE') || name.includes('COFFEE');
          }) ?? pointRows[0];

        setPoints(pointRows);

        if (!coffeePoint) {
          throw new Error('No existe un punto de venta configurado.');
        }

        setPointId(coffeePoint.id);
        await loadSuppliers(coffeePoint.companyId);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  async function changePoint(nextPointId: string): Promise<void> {
    const nextPoint =
      points.find((point) => point.id === nextPointId) ?? null;

    setPointId(nextPointId);
    resetForm();
    setLoading(true);
    setError('');
    setMessage('');
    setPage(1);

    try {
      await loadSuppliers(nextPoint?.companyId ?? '');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar los proveedores.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSupplier(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!companyId) {
      setError('No se pudo determinar la empresa activa.');
      return;
    }

    if (!form.name.trim()) {
      setError('El nombre del proveedor es obligatorio.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (selectedSupplier) {
        const payload: UpdateSupplierRequest = {
          name: form.name.trim(),
          taxId: form.taxId.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          active: form.active,
        };

        await api.updateSupplier(selectedSupplier.id, payload);
        setMessage('Proveedor actualizado correctamente.');
      } else {
        const payload: CreateSupplierRequest = {
          companyId,
          name: form.name.trim(),
          taxId: form.taxId.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
        };

        await api.createSupplier(payload);
        setMessage('Proveedor creado correctamente.');
      }

      await loadSuppliers(companyId);
      setIsModalOpen(false);
      resetForm();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar el proveedor.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSupplier(supplier: SupplierResponse): Promise<void> {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.updateSupplier(supplier.id, {
        name: supplier.name,
        taxId: supplier.taxId ?? undefined,
        phone: supplier.phone ?? undefined,
        email: supplier.email ?? undefined,
        address: supplier.address ?? undefined,
        active: !supplier.active,
      });

      await loadSuppliers(companyId);

      setMessage(
        supplier.active
          ? 'Proveedor desactivado correctamente.'
          : 'Proveedor activado correctamente.',
      );

      if (selectedId === supplier.id) {
        closeModal();
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cambiar el estado del proveedor.',
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
            <Truck size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Proveedores</h1>
            <p>
              Proveedores para órdenes de compra y recepción de mercancía.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/admin/inventory/replenishment')}
        >
          Inventario
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
          <div className="maintenance-toolbar__heading">
            <div>
              <p className="eyebrow">COMPRAS</p>
              <h2>Directorio de proveedores</h2>
            </div>

            <span className="maintenance-count">
              {visibleSuppliers.length}{' '}
              {visibleSuppliers.length === 1 ? 'proveedor' : 'proveedores'}
            </span>
          </div>

          <div className="maintenance-toolbar__actions">
            <label className="maintenance-toolbar-select">
              <span>Punto de venta</span>
              <select
                value={pointId}
                onChange={(event) => void changePoint(event.target.value)}
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
              onClick={() => navigate('/admin/purchases/orders')}
            >
              <Truck size={16} />
              Órdenes de compra
            </button>

            <button className="erp-button-primary" type="button" onClick={openCreate} disabled={saving}>
              <Plus size={16} />
              Nuevo proveedor
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
              placeholder="Buscar proveedor, RNC, teléfono o correo..."
              aria-label="Buscar proveedores"
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
            title="Actualizar"
            aria-label="Actualizar proveedores"
            disabled={loading || saving || !companyId}
            onClick={() => {
              if (!companyId) return;
              setLoading(true);
              loadSuppliers(companyId)
                .catch((reason: Error) => setError(reason.message))
                .finally(() => setLoading(false));
            }}
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        <div className="maintenance-summary-strip">
          <span><strong>{suppliers.length}</strong>Total</span>
          <span>
            <strong>{suppliers.filter((supplier) => supplier.active).length}</strong>
            Activos
          </span>
          <span>
            <strong>{suppliers.filter((supplier) => !supplier.active).length}</strong>
            Inactivos
          </span>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando proveedores...</div>
        ) : visibleSuppliers.length === 0 ? (
          <div className="operations-empty">
            No hay proveedores que coincidan con el filtro.
          </div>
        ) : (
          <>
            <div className="maintenance-table-wrap">
              <table className="maintenance-table">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>RNC / ID fiscal</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {paginatedSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <div className="maintenance-product-cell">
                          <div className="maintenance-product-thumb">
                            <Building2 size={17} />
                          </div>
                          <div>
                            <strong>{supplier.name}</strong>
                            <small>{supplier.address ?? 'Sin dirección'}</small>
                          </div>
                        </div>
                      </td>

                      <td>{supplier.taxId ?? '—'}</td>
                      <td>{supplier.phone ?? '—'}</td>
                      <td>{supplier.email ?? '—'}</td>

                      <td>
                        <span
                          className={
                            supplier.active
                              ? 'maintenance-badge maintenance-badge--success'
                              : 'maintenance-badge maintenance-badge--danger'
                          }
                        >
                          {supplier.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <div className="maintenance-row-actions">
                          <button
                            type="button"
                            className="maintenance-icon-button"
                            title="Editar proveedor"
                            aria-label={`Editar ${supplier.name}`}
                            onClick={() => editSupplier(supplier)}
                            disabled={saving}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            className="maintenance-icon-button"
                            title={supplier.active ? 'Desactivar' : 'Activar'}
                            aria-label={
                              supplier.active
                                ? `Desactivar ${supplier.name}`
                                : `Activar ${supplier.name}`
                            }
                            onClick={() => void toggleSupplier(supplier)}
                            disabled={saving}
                          >
                            {supplier.active ? (
                              <ToggleRight size={17} />
                            ) : (
                              <ToggleLeft size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="maintenance-pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>

              <span>Página {page} de {totalPages}</span>

              <button
                type="button"
                className="secondary-button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>

      {isModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">
                  {selectedSupplier ? 'EDICIÓN' : 'NUEVO'}
                </p>
                <h2 id="supplier-modal-title">
                  {selectedSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
                </h2>
                <p>Información comercial y de contacto del proveedor.</p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeModal}
              >
                ×
              </button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={(event) => void saveSupplier(event)}
            >
              <div className="maintenance-modal__body">
                <div className="maintenance-form-grid">
                  <label>
                    Nombre / razón comercial
                    <input
                      required
                      value={form.name}
                      onChange={(event) => setField('name', event.target.value)}
                      placeholder="Ej. Distribuidora Central"
                      disabled={saving}
                    />
                  </label>

                  <label>
                    RNC / identificación fiscal
                    <input
                      value={form.taxId}
                      onChange={(event) => setField('taxId', event.target.value)}
                      placeholder="Opcional"
                      disabled={saving}
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      value={form.phone}
                      onChange={(event) => setField('phone', event.target.value)}
                      placeholder="Opcional"
                      disabled={saving}
                    />
                  </label>

                  <label>
                    Correo electrónico
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setField('email', event.target.value)}
                      placeholder="compras@proveedor.com"
                      disabled={saving}
                    />
                  </label>
                </div>

                <label className="maintenance-field">
                  Dirección
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(event) => setField('address', event.target.value)}
                    placeholder="Dirección comercial"
                    disabled={saving}
                  />
                </label>

                {selectedSupplier ? (
                  <label className="maintenance-switch">
                    <span>
                      <strong>Proveedor activo</strong>
                      <small>
                        Los proveedores inactivos no deberían utilizarse en
                        nuevas órdenes de compra.
                      </small>
                    </span>

                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        setField('active', event.target.checked)
                      }
                      disabled={saving}
                    />
                    <i aria-hidden="true" />
                  </label>
                ) : null}
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button className="erp-button-primary" type="submit" disabled={saving}>
                  <Save size={16} />
                  {saving
                    ? 'Guardando...'
                    : selectedSupplier
                      ? 'Guardar cambios'
                      : 'Crear proveedor'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
