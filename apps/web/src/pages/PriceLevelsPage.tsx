import {
  ArrowLeft,
  BadgeDollarSign,
  Pencil,
  Plus,
  Save,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PriceLevelResponse } from '@cactus/shared';
import { api } from '../lib/api';

type LevelForm = {
  code: string;
  name: string;
  isDefault: boolean;
  sortOrder: string;
  active: boolean;
};

const EMPTY_FORM: LevelForm = {
  code: '',
  name: '',
  isDefault: false,
  sortOrder: '0',
  active: true,
};

export function PriceLevelsPage() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<PriceLevelResponse[]>([]);
  const [editing, setEditing] = useState<PriceLevelResponse | null>(null);
  const [form, setForm] = useState<LevelForm>(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      setLevels(await api.priceLevels());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar los niveles de precio.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate(): void {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setMessage('');
    setModalOpen(true);
  }

  function openEdit(level: PriceLevelResponse): void {
    setEditing(level);
    setForm({
      code: level.code,
      name: level.name,
      isDefault: level.isDefault,
      sortOrder: level.sortOrder.toString(),
      active: level.active,
    });
    setError('');
    setMessage('');
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const basePayload = {
      code: form.code,
      name: form.name,
      isDefault: form.isDefault,
      sortOrder: Number(form.sortOrder),
    };

    try {
      if (editing) {
        await api.updatePriceLevel(editing.id, {
          ...basePayload,
          active: form.active,
        });
        setMessage('Nivel de precio actualizado.');
      } else {
        await api.createPriceLevel(basePayload);
        setMessage('Nivel de precio creado.');
      }

      setModalOpen(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar el nivel de precio.',
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
            <BadgeDollarSign size={22} />
          </div>
          <div className="maintenance-header__text">
            <h1>Niveles de precios</h1>
            <p>Define precios de detalle, mayorista y otras condiciones comerciales.</p>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/admin/products')}
        >
          <ArrowLeft size={16} />
          Productos
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
              <p className="eyebrow">CONFIGURACIÓN COMERCIAL</p>
              <h2>Niveles disponibles</h2>
            </div>
            <span className="maintenance-count">{levels.length} niveles</span>
          </div>
          <button
            type="button"
            className="erp-button-primary"
            onClick={openCreate}
          >
            <Plus size={16} />
            Nuevo nivel
          </button>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando niveles...</div>
        ) : (
          <div className="maintenance-table-wrap">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Orden</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level.id}>
                    <td><strong>{level.code}</strong></td>
                    <td>{level.name}</td>
                    <td>{level.sortOrder}</td>
                    <td>
                      <span className="maintenance-badge maintenance-badge--neutral">
                        {level.isDefault ? 'Predeterminado' : 'Alternativo'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          level.active
                            ? 'maintenance-badge maintenance-badge--success'
                            : 'maintenance-badge maintenance-badge--danger'
                        }
                      >
                        {level.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="maintenance-icon-button"
                        onClick={() => openEdit(level)}
                        aria-label={`Editar ${level.name}`}
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
                <p className="eyebrow">NIVEL DE PRECIO</p>
                <h2>{editing ? 'Editar nivel' : 'Nuevo nivel'}</h2>
              </div>
              <button
                type="button"
                className="maintenance-modal__close"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                ×
              </button>
            </header>

            <form className="maintenance-modal__form" onSubmit={submit}>
              <div className="maintenance-modal__body">
                <div className="maintenance-form-grid">
                  <label>
                    Código
                    <input
                      required
                      maxLength={40}
                      value={form.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Nombre
                    <input
                      required
                      maxLength={120}
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Orden
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.sortOrder}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <label className="maintenance-switch">
                  <span>
                    <strong>Nivel predeterminado</strong>
                    <small>Se aplica cuando el cliente no tiene otro nivel.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    disabled={Boolean(editing?.isDefault)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isDefault: event.target.checked,
                      }))
                    }
                  />
                  <i aria-hidden="true" />
                </label>

                {editing ? (
                  <label className="maintenance-switch">
                    <span><strong>Activo</strong><small>Disponible para productos y clientes.</small></span>
                    <input
                      type="checkbox"
                      checked={form.active}
                      disabled={editing.isDefault}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          active: event.target.checked,
                        }))
                      }
                    />
                    <i aria-hidden="true" />
                  </label>
                ) : null}
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="erp-button-primary" disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
