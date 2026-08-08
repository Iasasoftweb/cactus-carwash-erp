import { Plus, Save, UserCog } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmployeeResponse } from '@cactus/shared';
import { api } from '../lib/api';

const emptyForm = {
  employeeNo: '',
  fullName: '',
  phone: '',
  jobPosition: '',
  canOperateCash: false,
  active: true,
};

export function EmployeesAdminPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api.employees()
      .then(setEmployees)
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(load, []);

  function edit(employee: EmployeeResponse) {
    setEditingId(employee.id);
    setForm({
      employeeNo: employee.employeeNo,
      fullName: employee.fullName,
      phone: employee.phone ?? '',
      jobPosition: employee.jobPosition ?? '',
      canOperateCash: employee.canOperateCash,
      active: employee.active,
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (editingId) {
        await api.updateEmployee(editingId, form);
        setMessage('Empleado actualizado correctamente.');
      } else {
        await api.createEmployee(form);
        setMessage('Empleado creado correctamente.');
      }

      setEditingId('');
      setForm(emptyForm);
      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar el empleado.',
      );
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <button type="button" className="secondary-button" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <div>
          <span className="brand">CACTUS</span>
          <h1>Mantenimiento de empleados</h1>
          <p>Puestos, estado y autorización para operar caja.</p>
        </div>
      </header>

      {error ? <div className="operations-error">{error}</div> : null}
      {message ? <div className="operations-success">{message}</div> : null}

      <section className="admin-page__grid">
        <form className="admin-card admin-form" onSubmit={save}>
          <div className="order-panel-title">
            {editingId ? <Save size={20} /> : <Plus size={20} />}
            <h2>{editingId ? 'Editar empleado' : 'Nuevo empleado'}</h2>
          </div>

          <label>
            Número
            <input
              value={form.employeeNo}
              onChange={(event) =>
                setForm({ ...form, employeeNo: event.target.value })
              }
            />
          </label>

          <label>
            Nombre completo
            <input
              value={form.fullName}
              onChange={(event) =>
                setForm({ ...form, fullName: event.target.value })
              }
            />
          </label>

          <label>
            Teléfono
            <input
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </label>

          <label>
            Puesto
            <input
              value={form.jobPosition}
              onChange={(event) =>
                setForm({ ...form, jobPosition: event.target.value })
              }
              placeholder="Cajero, Lavador, Técnico..."
            />
          </label>

          <label className="checklist-item">
            <input
              type="checkbox"
              checked={form.canOperateCash}
              onChange={(event) =>
                setForm({ ...form, canOperateCash: event.target.checked })
              }
            />
            Puede operar caja
          </label>

          {editingId ? (
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm({ ...form, active: event.target.checked })
                }
              />
              Empleado activo
            </label>
          ) : null}

          <button type="submit">
            {editingId ? 'Guardar cambios' : 'Crear empleado'}
          </button>
        </form>

        <section className="admin-card">
          <div className="order-panel-title">
            <UserCog size={20} />
            <h2>Empleados registrados</h2>
          </div>

          <div className="admin-table">
            {employees.map((employee) => (
              <button
                type="button"
                key={employee.id}
                onClick={() => edit(employee)}
              >
                <span>
                  <strong>{employee.fullName}</strong>
                  <small>
                    {employee.employeeNo} · {employee.jobPosition ?? 'Sin puesto'}
                  </small>
                </span>
                <span>
                  {employee.canOperateCash ? 'Cajero autorizado' : 'Sin caja'}
                </span>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
