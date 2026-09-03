import {
  Banknote,
  CheckCircle2,
  Plus,
  ReceiptText,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CashRegisterSummaryResponse,
  EmployeeResponse,
  ExpenseCategoryResponse,
  ExpenseResponse,
} from '@cactus/shared';
import { api } from '../lib/api';
import './styles/ExpensesPage.dashboard.css';

const PAGE_SIZE = 10;

export function ExpensesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] =
    useState<ExpenseCategoryResponse[]>([]);

  const [registers, setRegisters] =
    useState<CashRegisterSummaryResponse[]>([]);

  const [employees, setEmployees] =
    useState<EmployeeResponse[]>([]);

  const [expenses, setExpenses] =
    useState<ExpenseResponse[]>([]);

  const [form, setForm] = useState({
    categoryId: '',
    cashRegisterId: '',
    requestedById: '',
    beneficiary: '',
    concept: '',
    amount: 0,
    reference: '',
  });

  const [query, setQuery] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const visibleExpenses = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

    if (!normalized) {
      return expenses;
    }

    return expenses.filter((expense) =>
      [
        expense.concept,
        expense.categoryName,
        expense.beneficiary,
        expense.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [expenses, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      visibleExpenses.length / PAGE_SIZE,
    ),
  );

  const paginatedExpenses = useMemo(() => {
    const start =
      (page - 1) * PAGE_SIZE;

    return visibleExpenses.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [
    visibleExpenses,
    page,
  ]);

  function load(): void {
    setLoading(true);
    setError('');

    Promise.all([
      api.expenseCategories(),
      api.cashRegisters(),
      api.employees(),
      api.expenses(),
    ])
      .then(
        ([
          categoryRows,
          registerRows,
          employeeRows,
          expenseRows,
        ]) => {
          setCategories(categoryRows);
          setRegisters(registerRows);
          setEmployees(
            employeeRows.filter(
              (employee) =>
                employee.active,
            ),
          );
          setExpenses(expenseRows);

          setForm((current) => ({
            ...current,
            categoryId:
              current.categoryId ||
              categoryRows[0]?.id ||
              '',
            cashRegisterId:
              current.cashRegisterId ||
              registerRows[0]?.id ||
              '',
            requestedById:
              current.requestedById ||
              employeeRows.find(
                (employee) =>
                  employee.active,
              )?.id ||
              '',
          }));
        },
      )
      .catch((reason: Error) =>
        setError(reason.message),
      )
      .finally(() =>
        setLoading(false),
      );
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [
    page,
    totalPages,
  ]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (
        event.key === 'Escape' &&
        !saving
      ) {
        setIsModalOpen(false);
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    isModalOpen,
    saving,
  ]);

  function openCreate(): void {
    setError('');
    setMessage('');
    setIsModalOpen(true);
  }

  function closeModal(): void {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
  }

  async function create(
    event: FormEvent,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.createExpense({
        ...form,
        reference:
          form.reference ||
          undefined,
      });

      setMessage(
        'Gasto registrado y pendiente de aprobación.',
      );

      setForm((current) => ({
        ...current,
        beneficiary: '',
        concept: '',
        amount: 0,
        reference: '',
      }));

      setIsModalOpen(false);
      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Error al guardar.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function approve(
    id: string,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.approveExpense(id);
      setMessage('Gasto aprobado correctamente.');
      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Error al aprobar.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancel(
    id: string,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.cancelExpense(id);
      setMessage('Gasto cancelado correctamente.');
      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Error al cancelar.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function issue(
    id: string,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.issueExpense(id);

      setMessage(
        'Gasto emitido y aplicado a la caja.',
      );

      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Error al emitir.',
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
            <ReceiptText
              size={22}
              strokeWidth={1.8}
            />
          </div>

          <div className="maintenance-header__text">
            <h1>Gastos</h1>

            <p>
              Registro, control y emisión de
              gastos operativos.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate(-1)
          }
        >
          Volver
        </button>
      </header>

      {error ? (
        <div className="maintenance-alert maintenance-alert--error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="maintenance-alert maintenance-alert--success">
          {message}
        </div>
      ) : null}

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div className="maintenance-toolbar__heading">
            <div>
              <p className="eyebrow">
                FINANZAS
              </p>

              <h2>
                Gastos registrados
              </h2>
            </div>

            <span className="maintenance-count">
              {visibleExpenses.length}
              {visibleExpenses.length === 1
                ? ' gasto'
                : ' gastos'}
            </span>
          </div>

          <div className="maintenance-toolbar__actions">
            <div className="maintenance-search">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(
                    event.target.value,
                  );
                  setPage(1);
                }}
                placeholder="Buscar gastos..."
                aria-label="Buscar gastos"
              />
            </div>

            <button className="erp-button-primary"
              type="button"
              onClick={openCreate}
            >
              <Plus size={15} />
              Nuevo gasto
            </button>
          </div>
        </div>

        {loading ? (
          <div className="operations-empty">
            Cargando gastos...
          </div>
        ) : visibleExpenses.length === 0 ? (
          <div className="operations-empty">
            No hay gastos para mostrar.
          </div>
        ) : (
          <>
            <div className="maintenance-table-wrap">
              <table className="maintenance-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    <th>Beneficiario</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {paginatedExpenses.map(
                    (expense) => (
                      <tr key={expense.id}>
                        <td>
                          <strong>
                            {expense.concept}
                          </strong>
                        </td>

                        <td>
                          {expense.categoryName}
                        </td>

                        <td>
                          {expense.beneficiary}
                        </td>

                        <td>
                          <strong>
                            RD${' '}
                            {expense.amount.toFixed(
                              2,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              expense.status ===
                              'APPROVED'
                                ? 'maintenance-badge maintenance-badge--warning'
                                : expense.status ===
                                    'ISSUED'
                                  ? 'maintenance-badge maintenance-badge--success'
                                  : 'maintenance-badge maintenance-badge--neutral'
                            }
                          >
                            {expense.status}
                          </span>
                        </td>

                        <td>
                          <div className="maintenance-row-actions">
                            {expense.status ===
                            'PENDING' ? (
                              <>
                                <button
                                  type="button"
                                  className="maintenance-icon-button"
                                  title="Aprobar gasto"
                                  aria-label={`Aprobar ${expense.concept}`}
                                  disabled={saving}
                                  onClick={() => {
                                    void approve(expense.id);
                                  }}
                                >
                                  <CheckCircle2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="maintenance-icon-button"
                                  title="Cancelar gasto"
                                  aria-label={`Cancelar ${expense.concept}`}
                                  disabled={saving}
                                  onClick={() => {
                                    void cancel(expense.id);
                                  }}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : expense.status ===
                              'APPROVED' ? (
                              <>
                                <button
                                  type="button"
                                  className="maintenance-icon-button"
                                  title="Emitir gasto"
                                  aria-label={`Emitir ${expense.concept}`}
                                  disabled={saving}
                                  onClick={() => {
                                    void issue(expense.id);
                                  }}
                                >
                                  <CheckCircle2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="maintenance-icon-button"
                                  title="Cancelar gasto"
                                  aria-label={`Cancelar ${expense.concept}`}
                                  disabled={saving}
                                  onClick={() => {
                                    void cancel(expense.id);
                                  }}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
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
                disabled={
                  page >= totalPages
                }
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

      {isModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <section
            className="maintenance-modal expenses-maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">
                  NUEVO
                </p>

                <h2 id="expense-modal-title">
                  Registrar gasto
                </h2>

                <p>
                  Registra el gasto para iniciar
                  su flujo de aprobación.
                </p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={(event) => {
                void create(event);
              }}
            >
              <div className="maintenance-modal__body">
                <div className="maintenance-form-grid">
                  <label>
                    Categoría
                    <select
                      value={form.categoryId}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          categoryId:
                            event.target.value,
                        })
                      }
                    >
                      {categories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    Caja
                    <select
                      value={
                        form.cashRegisterId
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          cashRegisterId:
                            event.target.value,
                        })
                      }
                    >
                      {registers.map(
                        (register) => (
                          <option
                            key={register.id}
                            value={register.id}
                          >
                            {register.name}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    Solicitante
                    <select
                      value={
                        form.requestedById
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          requestedById:
                            event.target.value,
                        })
                      }
                    >
                      {employees.map(
                        (employee) => (
                          <option
                            key={employee.id}
                            value={employee.id}
                          >
                            {employee.fullName}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    Beneficiario
                    <input
                      required
                      value={form.beneficiary}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          beneficiary:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Concepto
                    <input
                      required
                      value={form.concept}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          concept:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Monto
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={form.amount}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          amount:
                            Number(
                              event.target.value,
                            ),
                        })
                      }
                    />
                  </label>
                </div>

                <label className="maintenance-field">
                  Comprobante o referencia
                  <input
                    value={form.reference}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        reference:
                          event.target.value,
                      })
                    }
                    placeholder="Opcional"
                  />
                </label>
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

                <button className="erp-button-primary"
                  type="submit"
                  disabled={saving}
                >
                  <Banknote size={15} />

                  {saving
                    ? 'Registrando...'
                    : 'Registrar gasto'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
