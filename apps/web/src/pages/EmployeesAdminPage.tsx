import { Pencil, UserCog, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EmployeeBranchResponse, EmployeeResponse } from "@cactus/shared";
import { api } from "../lib/api";

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  branchId: "",
  employeeNo: "",
  fullName: "",
  phone: "",
  jobPosition: "",
  canOperateCash: false,
  active: true,
};

export function EmployeesAdminPage() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);

  const [branches, setBranches] = useState<EmployeeBranchResponse[]>([]);

  const [editingId, setEditingId] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter((employee) =>
      [
        employee.employeeNo,
        employee.fullName,
        employee.branchName,
        employee.phone ?? "",
        employee.jobPosition ?? "",
        employee.canOperateCash ? "cajero autorizado" : "sin caja",
        employee.active ? "activo" : "inactivo",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [employees, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / PAGE_SIZE),
  );

  const visibleEmployees = filteredEmployees.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  async function load(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const [employeeRows, branchRows] = await Promise.all([
        api.employees(),
        api.employeeBranches(),
      ]);

      setEmployees(employeeRows);
      setBranches(branchRows);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar los empleados.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !saving) {
        setIsModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, saving]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function resetForm(): void {
    setEditingId("");

    setForm({
      ...EMPTY_FORM,
      branchId: branches[0]?.id ?? "",
    });
  }

  function openCreate(): void {
    resetForm();
    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function edit(employee: EmployeeResponse): void {
    setEditingId(employee.id);

    setForm({
      branchId: employee.branchId,
      employeeNo: employee.employeeNo,
      fullName: employee.fullName,
      phone: employee.phone ?? "",
      jobPosition: employee.jobPosition ?? "",
      canOperateCash: employee.canOperateCash,
      active: employee.active,
    });

    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function closeModal(): void {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    resetForm();
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await api.updateEmployee(editingId, form);

        setMessage("Empleado actualizado correctamente.");
      } else {
        await api.createEmployee({
          branchId: form.branchId,
          employeeNo: form.employeeNo,
          fullName: form.fullName,
          phone: form.phone || undefined,
          jobPosition: form.jobPosition || undefined,
          canOperateCash: form.canOperateCash,
        });

        setMessage("Empleado creado correctamente.");
      }

      setIsModalOpen(false);
      resetForm();
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar el empleado.",
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
            <UserCog size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Empleados</h1>
            <p>Puestos, estado y autorización para operar caja.</p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/dashboard")}
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
              <p className="eyebrow">PERSONAL</p>
              <h2>Empleados registrados</h2>
            </div>

            <span className="maintenance-count">
              {filteredEmployees.length}
              {filteredEmployees.length === 1 ? " empleado" : " empleados"}
            </span>
          </div>

          <div className="maintenance-toolbar__actions">
            <div className="maintenance-search">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar empleados..."
                aria-label="Buscar empleados"
              />
            </div>

            <button className="erp-button-primary" type="button" onClick={openCreate}>
              <UserPlus size={16} />
              Nuevo empleado
            </button>
          </div>
        </div>

        {loading ? (
          <div className="operations-empty">Cargando empleados...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="operations-empty">No hay empleados para mostrar.</div>
        ) : (
          <>
            <div className="maintenance-table-wrap">
              <table className="maintenance-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Sucursal</th>
                    <th>Número</th>
                    <th>Puesto</th>
                    <th>Teléfono</th>
                    <th>Caja</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {visibleEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <strong>{employee.fullName}</strong>
                      </td>
                      <td>{employee.branchName}</td>

                      <td>{employee.employeeNo}</td>

                      <td>{employee.jobPosition ?? "Sin puesto"}</td>

                      <td>{employee.phone ?? "—"}</td>

                      <td>
                        <span
                          className={
                            employee.canOperateCash
                              ? "maintenance-badge maintenance-badge--success"
                              : "maintenance-badge maintenance-badge--muted"
                          }
                        >
                          {employee.canOperateCash ? "Autorizado" : "Sin caja"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            employee.active
                              ? "maintenance-badge maintenance-badge--success"
                              : "maintenance-badge maintenance-badge--danger"
                          }
                        >
                          {employee.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td>
                        <div className="maintenance-row-actions">
                          <button
                            type="button"
                            className="maintenance-icon-button"
                            title="Editar empleado"
                            aria-label={`Editar ${employee.fullName}`}
                            onClick={() => edit(employee)}
                          >
                            <Pencil size={16} />
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

              <span>
                Página {page} de {totalPages}
              </span>

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
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">{editingId ? "EDICIÓN" : "NUEVO"}</p>

                <h2 id="employee-modal-title">
                  {editingId ? "Editar empleado" : "Nuevo empleado"}
                </h2>

                <p>Datos generales y permisos operativos del empleado.</p>
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
              onSubmit={(event) => {
                void save(event);
              }}
            >
              <div className="maintenance-modal__body">
                <div className="maintenance-form-grid">
                  <label>
                    Número
                    <input
                      required
                      value={form.employeeNo}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          employeeNo: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Nombre completo
                    <input
                      required
                      value={form.fullName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fullName: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Sucursal
                    <select
                      required
                      value={form.branchId}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          branchId: event.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar sucursal</option>

                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Teléfono
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Puesto
                    <input
                      value={form.jobPosition}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          jobPosition: event.target.value,
                        })
                      }
                      placeholder="Cajero, Lavador, Técnico..."
                    />
                  </label>
                </div>

                <label className="maintenance-switch">
                  <span>
                    <strong>Puede operar caja</strong>
                    <small>
                      Autoriza al empleado a realizar operaciones de caja.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.canOperateCash}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        canOperateCash: event.target.checked,
                      })
                    }
                  />

                  <i aria-hidden="true" />
                </label>

                {editingId ? (
                  <label className="maintenance-switch">
                    <span>
                      <strong>Empleado activo</strong>
                      <small>
                        Permite utilizar este empleado en nuevas operaciones.
                      </small>
                    </span>

                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          active: event.target.checked,
                        })
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
                  disabled={saving}
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button className="erp-button-primary" type="submit" disabled={saving}>
                  {saving
                    ? "Guardando..."
                    : editingId
                      ? "Guardar cambios"
                      : "Crear empleado"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
