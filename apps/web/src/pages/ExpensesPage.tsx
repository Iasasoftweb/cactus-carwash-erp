import { Banknote, CheckCircle2, Plus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CashRegisterSummaryResponse,
  EmployeeResponse,
  ExpenseCategoryResponse,
  ExpenseResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

export function ExpensesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([]);
  const [registers, setRegisters] = useState<CashRegisterSummaryResponse[]>([]);
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [form, setForm] = useState({
    categoryId: '',
    cashRegisterId: '',
    requestedById: '',
    beneficiary: '',
    concept: '',
    amount: 0,
    reference: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    Promise.all([
      api.expenseCategories(),
      api.cashRegisters(),
      api.employees(),
      api.expenses(),
    ])
      .then(([categoryRows, registerRows, employeeRows, expenseRows]) => {
        setCategories(categoryRows);
        setRegisters(registerRows);
        setEmployees(employeeRows.filter((employee) => employee.active));
        setExpenses(expenseRows);
        setForm((current) => ({
          ...current,
          categoryId: current.categoryId || categoryRows[0]?.id || '',
          cashRegisterId:
            current.cashRegisterId || registerRows[0]?.id || '',
          requestedById:
            current.requestedById || employeeRows[0]?.id || '',
        }));
      })
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(load, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.createExpense({
        ...form,
        reference: form.reference || undefined,
      });
      setMessage('Gasto registrado y pendiente de emisión.');
      setForm((current) => ({
        ...current,
        beneficiary: '',
        concept: '',
        amount: 0,
        reference: '',
      }));
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error al guardar.');
    }
  }

  async function issue(id: string) {
    try {
      await api.issueExpense(id);
      setMessage('Gasto emitido y aplicado a la caja.');
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error al emitir.');
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
          <h1>Módulo de gastos</h1>
          <p>Los gastos emitidos alimentan automáticamente el cuadre.</p>
        </div>
      </header>

      {error ? <div className="operations-error">{error}</div> : null}
      {message ? <div className="operations-success">{message}</div> : null}

      <section className="admin-page__grid">
        <form className="admin-card admin-form" onSubmit={create}>
          <div className="order-panel-title">
            <Plus size={20} />
            <h2>Registrar gasto</h2>
          </div>

          <label>
            Categoría
            <select
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Caja
            <select
              value={form.cashRegisterId}
              onChange={(event) =>
                setForm({ ...form, cashRegisterId: event.target.value })
              }
            >
              {registers.map((register) => (
                <option key={register.id} value={register.id}>
                  {register.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Solicitante
            <select
              value={form.requestedById}
              onChange={(event) =>
                setForm({ ...form, requestedById: event.target.value })
              }
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Beneficiario
            <input
              value={form.beneficiary}
              onChange={(event) =>
                setForm({ ...form, beneficiary: event.target.value })
              }
            />
          </label>

          <label>
            Concepto
            <input
              value={form.concept}
              onChange={(event) =>
                setForm({ ...form, concept: event.target.value })
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
                setForm({ ...form, amount: Number(event.target.value) })
              }
            />
          </label>

          <label>
            Comprobante o referencia
            <input
              value={form.reference}
              onChange={(event) =>
                setForm({ ...form, reference: event.target.value })
              }
            />
          </label>

          <button type="submit">Registrar gasto</button>
        </form>

        <section className="admin-card">
          <div className="order-panel-title">
            <Banknote size={20} />
            <h2>Gastos registrados</h2>
          </div>

          <div className="admin-table">
            {expenses.map((expense) => (
              <article key={expense.id}>
                <span>
                  <strong>{expense.concept}</strong>
                  <small>
                    {expense.categoryName} · {expense.beneficiary}
                  </small>
                </span>
                <strong>RD$ {expense.amount.toFixed(2)}</strong>
                <span>{expense.status}</span>
                {expense.status === 'APPROVED' ? (
                  <button type="button" onClick={() => issue(expense.id)}>
                    <CheckCircle2 size={16} />
                    Emitir
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
