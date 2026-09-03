import {
  Building2,
  FileImage,
  Pencil,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  BusinessModuleType,
  PlatformCompanyResponse,
} from '@cactus/shared';
import { api, apiAssetUrl } from '../lib/api';

const EMPTY_FORM = {
  name: '',
  legalName: '',
  taxId: '',
  currencyCode: 'DOP',
  currencySymbol: 'RD$',
  logoUrl: '',
  branchLimit: '1',
  modules: ['POS', 'CAR_WASH'] as BusinessModuleType[],
  active: true,
  branchName: 'Principal',
  branchCode: 'PRINCIPAL',
  branchAddress: '',
  branchPhone: '',
  adminFullName: '',
  adminUsername: '',
  adminEmail: '',
  adminPassword: '',
};

const BUSINESS_MODULES: Array<{
  value: BusinessModuleType;
  label: string;
}> = [
  { value: 'POS', label: 'Punto de venta' },
  { value: 'CAR_WASH', label: 'Lavado de vehículos' },
  { value: 'INVENTORY', label: 'Inventario' },
  { value: 'PURCHASES', label: 'Órdenes de compra' },
  { value: 'ACCOUNTS_RECEIVABLE', label: 'Cuentas por cobrar' },
  { value: 'ACCOUNTS_PAYABLE', label: 'Cuentas por pagar' },
  { value: 'EXPENSES', label: 'Gastos' },
];

export function AdminCompanyPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<PlatformCompanyResponse[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) =>
      [company.name, company.legalName ?? '', company.taxId ?? ''].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [companies, search]);

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      setCompanies(await api.platformCompanies());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar las empresas.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate(): void {
    setEditingId('');
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setLogoPreview('');
    setError('');
    setMessage('');
    setModalOpen(true);
  }

  function openEdit(company: PlatformCompanyResponse): void {
    setEditingId(company.id);
    setForm({
      name: company.name,
      legalName: company.legalName ?? '',
      taxId: company.taxId ?? '',
      currencyCode: company.currencyCode,
      currencySymbol: company.currencySymbol,
      logoUrl: company.logoUrl ?? '',
      branchLimit: String(company.branchLimit),
      modules: company.modules,
      active: company.active,
      branchName: '',
      branchCode: '',
      branchAddress: '',
      branchPhone: '',
      adminFullName: '',
      adminUsername: '',
      adminEmail: '',
      adminPassword: '',
    });
    setLogoFile(null);
    setLogoPreview(apiAssetUrl(company.logoUrl));
    setError('');
    setMessage('');
    setModalOpen(true);
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');

    if (form.modules.length === 0) {
      setError('Debe seleccionar al menos un módulo.');
      setSaving(false);
      return;
    }

    const companyPayload = {
      name: form.name.trim(),
      legalName: form.legalName.trim() || null,
      taxId: form.taxId.trim() || null,
      currencyCode: form.currencyCode.trim().toUpperCase(),
      currencySymbol: form.currencySymbol.trim(),
      logoUrl: form.logoUrl.trim() || null,
      branchLimit: Number(form.branchLimit),
      modules: form.modules,
      active: form.active,
    };

    try {
      let savedCompany: PlatformCompanyResponse;

      if (editingId) {
        savedCompany = await api.updatePlatformCompany(
          editingId,
          companyPayload,
        );
      } else {
        savedCompany = await api.createPlatformCompany({
          ...companyPayload,
          branchName: form.branchName.trim(),
          branchCode: form.branchCode.trim().toUpperCase(),
          branchAddress: form.branchAddress.trim() || null,
          branchPhone: form.branchPhone.trim() || null,
          adminFullName: form.adminFullName.trim(),
          adminUsername: form.adminUsername.trim(),
          adminEmail: form.adminEmail.trim() || null,
          adminPassword: form.adminPassword,
        });
      }

      if (logoFile) {
        savedCompany = await api.uploadPlatformCompanyLogo(
          savedCompany.id,
          logoFile,
        );
      }

      setMessage(
        editingId
          ? 'Empresa actualizada correctamente.'
          : 'Empresa creada correctamente.',
      );
      setModalOpen(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar la empresa.',
      );
    } finally {
      setSaving(false);
    }
  }

  function selectLogo(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WEBP.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('El logo no puede superar 5 MB.');
      event.target.value = '';
      return;
    }

    if (logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }

    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function toggleModule(module: BusinessModuleType): void {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(module)
        ? current.modules.filter((item) => item !== module)
        : [...current.modules, module],
    }));
  }

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <ShieldCheck size={22} strokeWidth={1.8} />
          </div>
          <div className="maintenance-header__text">
            <h1>Empresas de la plataforma</h1>
            <p>Administración exclusiva del propietario de Cactus.</p>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/dashboard')}
        >
          Volver al panel
        </button>
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
              <p className="eyebrow">PLATAFORMA</p>
              <h2>Empresas registradas</h2>
            </div>
            <span className="maintenance-count">{filtered.length}</span>
          </div>
          <div className="maintenance-toolbar__actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar empresa..."
            />
            <button
              type="button"
              className="erp-button-primary"
              onClick={openCreate}
            >
              <Plus size={16} /> Nueva empresa
            </button>
          </div>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando empresas...</div>
        ) : filtered.length === 0 ? (
          <div className="operations-empty">No hay empresas para mostrar.</div>
        ) : (
          <div className="maintenance-table-wrap">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>RNC</th>
                  <th>Moneda</th>
                  <th>Sucursales</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <strong>{company.name}</strong>
                      <small style={{ display: 'block' }}>
                        {company.legalName ?? 'Sin razón social'}
                      </small>
                    </td>
                    <td>{company.taxId ?? '—'}</td>
                    <td>{company.currencyCode} ({company.currencySymbol})</td>
                    <td>
                      {company.activeBranchCount} / {company.branchLimit}
                      <small style={{ display: 'block' }}>
                        {company.branchCount} registradas
                      </small>
                    </td>
                    <td>{company.userCount}</td>
                    <td>
                      <span className={company.active
                        ? 'maintenance-badge maintenance-badge--success'
                        : 'maintenance-badge maintenance-badge--danger'}>
                        {company.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="maintenance-icon-button"
                        aria-label={`Editar ${company.name}`}
                        onClick={() => openEdit(company)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="maintenance-modal-backdrop" role="presentation">
          <section className="maintenance-modal" role="dialog" aria-modal="true">
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">EMPRESA</p>
                <h2>{editingId ? 'Editar empresa' : 'Nueva empresa'}</h2>
              </div>
              <button
                type="button"
                className="maintenance-modal__close"
                disabled={saving}
                onClick={() => !saving && setModalOpen(false)}
              >×</button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={(event) => void save(event)}
            >
              <div className="maintenance-modal__body">
                <div className="maintenance-form-grid">
                  <label>Nombre
                    <input required maxLength={160} value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  </label>
                  <label>Razón social
                    <input maxLength={200} value={form.legalName}
                      onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
                  </label>
                  <label>RNC / Identificación fiscal
                    <input maxLength={50} value={form.taxId}
                      onChange={(event) => setForm({ ...form, taxId: event.target.value })} />
                  </label>
                  <label>Código de moneda
                    <input required minLength={3} maxLength={3} value={form.currencyCode}
                      onChange={(event) => setForm({ ...form, currencyCode: event.target.value.toUpperCase() })} />
                  </label>
                  <label>Símbolo monetario
                    <input required maxLength={8} value={form.currencySymbol}
                      onChange={(event) => setForm({ ...form, currencySymbol: event.target.value })} />
                  </label>
                  <label>Límite de sucursales activas
                    <input required type="number" min={1} step={1}
                      value={form.branchLimit}
                      onChange={(event) => setForm({ ...form, branchLimit: event.target.value })} />
                  </label>
                  <label>
                    Logo de la empresa
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={selectLogo}
                    />
                    <small>JPG, PNG o WEBP. Máximo 5 MB.</small>
                  </label>

                  <div
                    style={{
                      minHeight: 104,
                      border: '1px solid #d7dfda',
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      padding: 12,
                      background: '#f8faf9',
                    }}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Vista previa del logo"
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: 88,
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: '#66736c',
                        }}
                      >
                        <FileImage size={22} />
                        Sin logo seleccionado
                      </span>
                    )}
                  </div>
                </div>

                <p className="eyebrow">MÓDULOS CONTRATADOS</p>
                <div className="maintenance-form-grid">
                  {BUSINESS_MODULES.map((module) => (
                    <label key={module.value} className="maintenance-switch">
                      <span><strong>{module.label}</strong></span>
                      <input
                        type="checkbox"
                        checked={form.modules.includes(module.value)}
                        onChange={() => toggleModule(module.value)}
                      />
                      <i aria-hidden="true" />
                    </label>
                  ))}
                </div>

                {!editingId ? (
                  <>
                    <p className="eyebrow">SUCURSAL PRINCIPAL</p>
                    <div className="maintenance-form-grid">
                      <label>Nombre de sucursal
                        <input required maxLength={160} value={form.branchName}
                          onChange={(event) => setForm({ ...form, branchName: event.target.value })} />
                      </label>
                      <label>Código de sucursal
                        <input required maxLength={20} value={form.branchCode}
                          onChange={(event) => setForm({ ...form, branchCode: event.target.value.toUpperCase() })} />
                      </label>
                      <label>Dirección
                        <input maxLength={255} value={form.branchAddress}
                          onChange={(event) => setForm({ ...form, branchAddress: event.target.value })} />
                      </label>
                      <label>Teléfono
                        <input maxLength={30} value={form.branchPhone}
                          onChange={(event) => setForm({ ...form, branchPhone: event.target.value })} />
                      </label>
                    </div>

                    <p className="eyebrow">ADMINISTRADOR INICIAL</p>
                    <div className="maintenance-form-grid">
                      <label>Nombre completo
                        <input required maxLength={160} value={form.adminFullName}
                          onChange={(event) => setForm({ ...form, adminFullName: event.target.value })} />
                      </label>
                      <label>Usuario
                        <input required maxLength={80} autoComplete="off" value={form.adminUsername}
                          onChange={(event) => setForm({ ...form, adminUsername: event.target.value })} />
                      </label>
                      <label>Correo
                        <input type="email" maxLength={180} value={form.adminEmail}
                          onChange={(event) => setForm({ ...form, adminEmail: event.target.value })} />
                      </label>
                      <label>Contraseña inicial
                        <input required type="password" minLength={8} maxLength={128}
                          autoComplete="new-password" value={form.adminPassword}
                          onChange={(event) => setForm({ ...form, adminPassword: event.target.value })} />
                      </label>
                    </div>
                  </>
                ) : null}

                {editingId ? (
                  <label className="maintenance-switch">
                    <span><strong>Empresa activa</strong><small>Permite el acceso de sus usuarios.</small></span>
                    <input type="checkbox" checked={form.active}
                      onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                    <i aria-hidden="true" />
                  </label>
                ) : null}

                <div className="maintenance-alert">
                  <Building2 size={16} />
                  La empresa nueva incluirá POS, Car Wash, su sucursal principal
                  y un administrador con acceso a todas las sucursales.
                </div>
              </div>
              <footer className="maintenance-modal__footer">
                <button type="button" className="secondary-button" disabled={saving}
                  onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="erp-button-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar empresa'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
