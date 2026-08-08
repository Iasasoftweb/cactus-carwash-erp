import {
  ArrowDownCircle,
  Banknote,
  Calculator,
  LockKeyhole,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CashierEmployeeResponse,
  CashRegisterSummaryResponse,
  CashSessionResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

type MovementType = 'WITHDRAWAL';

const movementLabels: Record<string, string> = {
  OPENING: 'Apertura',
  SALE: 'Venta',
  COLLECTION: 'Cobro',
  EXPENSE: 'Gasto',
  WITHDRAWAL: 'Retiro',
  DEPOSIT: 'Ingreso automático',
  ADJUSTMENT: 'Ajuste administrativo',
  CLOSING: 'Cierre',
};

export function CashManagementPage() {
  const navigate = useNavigate();
  const [registers, setRegisters] = useState<CashRegisterSummaryResponse[]>([]);
  const [cashiers, setCashiers] = useState<CashierEmployeeResponse[]>([]);
  const [selectedRegister, setSelectedRegister] =
    useState<CashRegisterSummaryResponse | null>(null);
  const [session, setSession] = useState<CashSessionResponse | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [openingAmount, setOpeningAmount] = useState(0);
  const [movementType, setMovementType] =
    useState<MovementType>('WITHDRAWAL');
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementDescription, setMovementDescription] = useState('');
  const [movementBeneficiary, setMovementBeneficiary] = useState('');
  const [movementReference, setMovementReference] = useState('');
  const [countedAmount, setCountedAmount] = useState(0);

  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load(): void {
    Promise.all([api.cashRegisters(), api.cashiers()])
      .then(([registerRows, cashierRows]) => {
        setRegisters(registerRows);
        setCashiers(cashierRows);

        const current =
          registerRows.find((row) => row.id === selectedRegister?.id) ??
          registerRows[0] ??
          null;

        setSelectedRegister(current);
        setSession(current?.openSession ?? null);
        setEmployeeId((currentId) =>
          cashierRows.some((cashier) => cashier.id === currentId)
            ? currentId
            : cashierRows[0]?.id ?? '',
        );
      })
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, []);

  function selectRegister(register: CashRegisterSummaryResponse): void {
    setSelectedRegister(register);
    setSession(register.openSession);
    setError('');
    setMessage('');
  }

  const totals = useMemo(() => {
    if (!session) {
      return { sales: 0, withdrawals: 0, expenses: 0 };
    }

    return session.movements.reduce(
      (result, movement) => {
        if (
          movement.type === 'SALE' ||
          movement.type === 'COLLECTION' ||
          movement.type === 'DEPOSIT'
        ) {
          result.sales += movement.amount;
        }

        if (movement.type === 'WITHDRAWAL') {
          result.withdrawals += movement.amount;
        }

        if (movement.type === 'EXPENSE') {
          result.expenses += movement.amount;
        }

        return result;
      },
      { sales: 0, withdrawals: 0, expenses: 0 },
    );
  }, [session]);

  async function openSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRegister || !employeeId) {
      setError('Selecciona un cajero autorizado.');
      return;
    }

    setWorking(true);
    setError('');
    setMessage('');

    try {
      const created = await api.openCashSession({
        cashRegisterId: selectedRegister.id,
        employeeId,
        openingAmount,
      });

      setSession(created);
      setMessage('Caja abierta correctamente.');
      setOpeningAmount(0);
      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible abrir la caja.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function addMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !session ||
      movementAmount <= 0 ||
      !movementDescription.trim() ||
      !movementBeneficiary.trim()
    ) {
      setError('Indica monto, motivo y beneficiario.');
      return;
    }

    setWorking(true);
    setError('');
    setMessage('');

    try {
      const updated = await api.addCashMovement(session.id, {
        type: movementType,
        amount: movementAmount,
        description: movementDescription.trim(),
        beneficiary: movementBeneficiary.trim(),
        externalReference: movementReference.trim() || undefined,
      });

      setSession(updated);
      setMovementAmount(0);
      setMovementDescription('');
      setMovementBeneficiary('');
      setMovementReference('');
      setMessage(
        movementType === 'WITHDRAWAL'
          ? 'Retiro registrado correctamente.'
          : 'Gasto registrado correctamente.',
      );
      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible registrar el movimiento.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function closeSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) return;

    setWorking(true);
    setError('');
    setMessage('');

    try {
      const closed = await api.closeCashSession(session.id, {
        countedAmount,
      });

      setSession(closed);
      window.open(
        `/cash/sessions/${closed.id}/print/summary`,
        '_blank',
      );
      window.open(
        `/cash/sessions/${closed.id}/print/detail`,
        '_blank',
      );
      setMessage('Caja cerrada correctamente. Se generaron los tickets.');
      setCountedAmount(0);
      load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cerrar la caja.',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="cash-center">
      <header className="cash-center__header">
        <button type="button" className="secondary-button" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <div>
          <span className="brand">CACTUS</span>
          <h1>Administración de Cajas</h1>
          <p>Cajeros autorizados, retiros, gastos, arqueo y cierre.</p>
        </div>

        <button type="button" className="secondary-button" onClick={load}>
          <RefreshCw size={17} />
          Actualizar
        </button>
      </header>

      {error ? <div className="operations-error">{error}</div> : null}
      {message ? <div className="operations-success">{message}</div> : null}

      <section className="cash-center__layout">
        <aside className="cash-register-list">
          <h2>Cajas</h2>

          {registers.map((register) => (
            <button
              type="button"
              key={register.id}
              className={
                selectedRegister?.id === register.id
                  ? 'cash-register-card cash-register-card--active'
                  : 'cash-register-card'
              }
              onClick={() => selectRegister(register)}
            >
              <WalletCards size={20} />
              <span>
                <strong>{register.name}</strong>
                <small>{register.openSession ? 'Abierta' : 'Cerrada'}</small>
              </span>
            </button>
          ))}
        </aside>

        <section className="cash-workspace">
          {!selectedRegister ? (
            <div className="operations-empty">No hay cajas configuradas.</div>
          ) : !session || session.status === 'CLOSED' ? (
            <section className="cash-panel">
              <div className="cash-panel__title">
                <LockKeyhole size={21} />
                <div>
                  <h2>Abrir {selectedRegister.name}</h2>
                  <p>Selecciona un empleado autorizado y registra el fondo.</p>
                </div>
              </div>

              <form className="cash-form" onSubmit={openSession}>
                <label>
                  Cajero autorizado
                  <select
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                  >
                    <option value="">Seleccionar cajero</option>
                    {cashiers.map((cashier) => (
                      <option key={cashier.id} value={cashier.id}>
                        {cashier.fullName}
                        {cashier.jobPosition
                          ? ` · ${cashier.jobPosition}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Fondo inicial
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={openingAmount}
                    onChange={(event) =>
                      setOpeningAmount(Number(event.target.value))
                    }
                  />
                </label>

                <button type="submit" disabled={working || !employeeId}>
                  Abrir caja
                </button>
              </form>

              {cashiers.length === 0 ? (
                <div className="operations-error">
                  No hay empleados autorizados para operar caja.
                </div>
              ) : null}
            </section>
          ) : (
            <>
              <section className="cash-kpis">
                <article>
                  <Banknote size={21} />
                  <span>Fondo inicial</span>
                  <strong>RD$ {session.openingAmount.toFixed(2)}</strong>
                </article>
                <article>
                  <Banknote size={21} />
                  <span>Cobros automáticos</span>
                  <strong>RD$ {totals.sales.toFixed(2)}</strong>
                </article>
                <article>
                  <ArrowDownCircle size={21} />
                  <span>Retiros</span>
                  <strong>RD$ {totals.withdrawals.toFixed(2)}</strong>
                </article>
                <article>
                  <ArrowDownCircle size={21} />
                  <span>Gastos</span>
                  <strong>RD$ {totals.expenses.toFixed(2)}</strong>
                </article>
                <article>
                  <Calculator size={21} />
                  <span>Saldo esperado</span>
                  <strong>RD$ {session.expectedAmount.toFixed(2)}</strong>
                </article>
              </section>

              <section className="cash-two-columns">
                <section className="cash-panel">
                  <div className="cash-panel__title">
                    <WalletCards size={21} />
                    <div>
                      <h2>{session.cashRegisterName}</h2>
                      <p>
                        Cajero: {session.cashierName} · Abierta{' '}
                        {new Date(session.openedAt).toLocaleString('es-DO')}
                      </p>
                    </div>
                  </div>

                  <form className="cash-form" onSubmit={addMovement}>
                    <label>
                      Operación
                      <select
                        value={movementType}
                        onChange={(event) =>
                          setMovementType(event.target.value as MovementType)
                        }
                      >
                        <option value="WITHDRAWAL">Retiro de efectivo</option>
                      </select>
                    </label>

                    <label>
                      Monto
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={movementAmount}
                        onChange={(event) =>
                          setMovementAmount(Number(event.target.value))
                        }
                      />
                    </label>

                    <label>
                      Beneficiario o receptor
                      <input
                        value={movementBeneficiary}
                        onChange={(event) =>
                          setMovementBeneficiary(event.target.value)
                        }
                        placeholder="Persona, proveedor o banco"
                      />
                    </label>

                    <label>
                      Referencia
                      <input
                        value={movementReference}
                        onChange={(event) =>
                          setMovementReference(event.target.value)
                        }
                        placeholder="Opcional"
                      />
                    </label>

                    <label className="cash-form__wide">
                      Motivo
                      <input
                        value={movementDescription}
                        onChange={(event) =>
                          setMovementDescription(event.target.value)
                        }
                        placeholder="Describe el motivo"
                      />
                    </label>

                    <button type="submit" disabled={working}>
                      Registrar retiro
                    </button>
                  </form>
                </section>

                <section className="cash-panel">
                  <div className="cash-panel__title">
                    <Calculator size={21} />
                    <div>
                      <h2>Arqueo y cierre</h2>
                      <p>Cuenta el efectivo disponible antes de cerrar.</p>
                    </div>
                  </div>

                  <div className="cash-print-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        window.open(
                          `/cash/sessions/${session.id}/print/summary`,
                          '_blank',
                        )
                      }
                    >
                      Imprimir resumen actual
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        window.open(
                          `/cash/sessions/${session.id}/print/detail`,
                          '_blank',
                        )
                      }
                    >
                      Imprimir detalle
                    </button>
                  </div>

                  <form className="cash-form" onSubmit={closeSession}>
                    <label>
                      Efectivo contado
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={countedAmount}
                        onChange={(event) =>
                          setCountedAmount(Number(event.target.value))
                        }
                      />
                    </label>

                    <div className="cash-difference-preview">
                      <span>Diferencia estimada</span>
                      <strong>
                        RD$ {(countedAmount - session.expectedAmount).toFixed(2)}
                      </strong>
                    </div>

                    <button type="submit" disabled={working}>
                      Cerrar caja
                    </button>
                  </form>
                </section>
              </section>

              <section className="cash-panel">
                <div className="cash-panel__title">
                  <Banknote size={21} />
                  <div>
                    <h2>Movimientos del turno</h2>
                    <p>Ventas automáticas, retiros y gastos auditables.</p>
                  </div>
                </div>

                <div className="cash-movement-list">
                  {session.movements.map((movement) => (
                    <article key={movement.id}>
                      <div>
                        <strong>{movementLabels[movement.type]}</strong>
                        <span>{movement.description}</span>
                        {movement.beneficiary ? (
                          <small>Beneficiario: {movement.beneficiary}</small>
                        ) : null}
                      </div>
                      <div>
                        <strong>RD$ {movement.amount.toFixed(2)}</strong>
                        <small>
                          {new Date(movement.createdAt).toLocaleString('es-DO')}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
