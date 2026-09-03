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
import './styles/CashManagementPage.dashboard.css';

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
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

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
    setMovementModalOpen(false);
    setCloseModalOpen(false);
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
      setMovementModalOpen(false);
      setMessage('Retiro registrado correctamente.');
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
      setMessage(
        'Caja cerrada correctamente. Se generaron los tickets.',
      );
      setCountedAmount(0);
      setCloseModalOpen(false);
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
    <main className="cash-center maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <WalletCards size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Administración de cajas</h1>
            <p>
              Cajeros autorizados, retiros, arqueo y cierre de turnos.
            </p>
          </div>
        </div>

        <div className="cash-maintenance-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={load}
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
        </div>
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

      <section className="cash-maintenance-layout">
        <aside className="cash-register-list maintenance-card">
          <div className="cash-maintenance-aside-title">
            <div>
              <p className="eyebrow">CAJAS</p>
              <h2>Puntos de caja</h2>
            </div>

            <span className="maintenance-count">{registers.length}</span>
          </div>

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
              <WalletCards size={17} />

              <span>
                <strong>{register.name}</strong>
                <small>{register.openSession ? 'Abierta' : 'Cerrada'}</small>
              </span>

              <i
                className={
                  register.openSession
                    ? 'cash-status-dot cash-status-dot--open'
                    : 'cash-status-dot'
                }
              />
            </button>
          ))}
        </aside>

        <section className="cash-workspace">
          {!selectedRegister ? (
            <div className="operations-empty">
              No hay cajas configuradas.
            </div>
          ) : !session || session.status === 'CLOSED' ? (
            <section className="cash-panel maintenance-card cash-open-panel">
              <div className="cash-panel__title">
                <LockKeyhole size={20} />

                <div>
                  <p className="eyebrow">APERTURA</p>
                  <h2>Abrir {selectedRegister.name}</h2>
                  <p>
                    Selecciona un empleado autorizado y registra el fondo
                    inicial.
                  </p>
                </div>
              </div>

              <form
                className="cash-form cash-open-form"
                onSubmit={openSession}
              >
                <label>
                  Cajero autorizado
                  <select
                    value={employeeId}
                    onChange={(event) =>
                      setEmployeeId(event.target.value)
                    }
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

                <button className="erp-button-primary"
                  type="submit"
                  disabled={working || !employeeId}
                >
                  Abrir caja
                </button>
              </form>

              {cashiers.length === 0 ? (
                <div className="maintenance-alert maintenance-alert--error">
                  No hay empleados autorizados para operar caja.
                </div>
              ) : null}
            </section>
          ) : (
            <>
              <section className="cash-maintenance-commandbar maintenance-card">
                <div>
                  <p className="eyebrow">TURNO ACTIVO</p>
                  <h2>{session.cashRegisterName}</h2>
                  <p>
                    Cajero: {session.cashierName} · Abierta{' '}
                    {new Date(session.openedAt).toLocaleString('es-DO')}
                  </p>
                </div>

                <div className="cash-maintenance-commandbar__actions">
                  <button className="erp-button-primary"
                    type="button"
                    onClick={() => setMovementModalOpen(true)}
                  >
                    <ArrowDownCircle size={15} />
                    Registrar retiro
                  </button>

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
                    Resumen
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
                    Detalle
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setCloseModalOpen(true)}
                  >
                    <Calculator size={15} />
                    Arqueo y cierre
                  </button>
                </div>
              </section>

              <section className="cash-kpis">
                <article>
                  <Banknote size={19} />
                  <span>Fondo inicial</span>
                  <strong>RD$ {session.openingAmount.toFixed(2)}</strong>
                </article>

                <article>
                  <Banknote size={19} />
                  <span>Cobros automáticos</span>
                  <strong>RD$ {totals.sales.toFixed(2)}</strong>
                </article>

                <article>
                  <ArrowDownCircle size={19} />
                  <span>Retiros</span>
                  <strong>RD$ {totals.withdrawals.toFixed(2)}</strong>
                </article>

                <article>
                  <ArrowDownCircle size={19} />
                  <span>Gastos</span>
                  <strong>RD$ {totals.expenses.toFixed(2)}</strong>
                </article>

                <article>
                  <Calculator size={19} />
                  <span>Saldo esperado</span>
                  <strong>RD$ {session.expectedAmount.toFixed(2)}</strong>
                </article>
              </section>

              <section className="cash-panel maintenance-card cash-movements-panel">
                <div className="cash-panel__title">
                  <Banknote size={19} />

                  <div>
                    <h2>Movimientos del turno</h2>
                    <p>
                      Ventas automáticas, retiros y movimientos auditables.
                    </p>
                  </div>
                </div>

                <div className="cash-movement-list">
                  {session.movements.length === 0 ? (
                    <div className="operations-empty">
                      No hay movimientos en este turno.
                    </div>
                  ) : (
                    session.movements.map((movement) => (
                      <article key={movement.id}>
                        <div>
                          <strong>
                            {movementLabels[movement.type]}
                          </strong>

                          <span>{movement.description}</span>

                          {movement.beneficiary ? (
                            <small>
                              Beneficiario: {movement.beneficiary}
                            </small>
                          ) : null}
                        </div>

                        <div>
                          <strong>
                            RD$ {movement.amount.toFixed(2)}
                          </strong>

                          <small>
                            {new Date(
                              movement.createdAt,
                            ).toLocaleString('es-DO')}
                          </small>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </section>
      </section>

      {movementModalOpen && session ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !working
            ) {
              setMovementModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal cash-maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-movement-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">
                  MOVIMIENTO DE CAJA
                </p>

                <h2 id="cash-movement-title">
                  Registrar retiro
                </h2>

                <p>
                  Registra la salida de efectivo con su trazabilidad.
                </p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                onClick={() => setMovementModalOpen(false)}
                disabled={working}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={addMovement}
            >
              <div className="maintenance-modal__body cash-modal-form">
                <label>
                  Operación
                  <select
                    value={movementType}
                    onChange={(event) =>
                      setMovementType(
                        event.target.value as MovementType,
                      )
                    }
                  >
                    <option value="WITHDRAWAL">
                      Retiro de efectivo
                    </option>
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

                <label className="cash-modal-form__wide">
                  Motivo
                  <input
                    value={movementDescription}
                    onChange={(event) =>
                      setMovementDescription(event.target.value)
                    }
                    placeholder="Describe el motivo"
                  />
                </label>
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMovementModalOpen(false)}
                  disabled={working}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="erp-button-primary"
                  disabled={working}
                >
                  {working
                    ? 'Registrando...'
                    : 'Registrar retiro'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {closeModalOpen && session ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !working
            ) {
              setCloseModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal cash-maintenance-modal cash-maintenance-modal--close"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-close-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">ARQUEO</p>

                <h2 id="cash-close-title">
                  Arqueo y cierre
                </h2>

                <p>
                  Cuenta el efectivo disponible antes de cerrar la caja.
                </p>
              </div>

              <button
                type="button"
                className="maintenance-modal__close"
                onClick={() => setCloseModalOpen(false)}
                disabled={working}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <form
              className="maintenance-modal__form"
              onSubmit={closeSession}
            >
              <div className="maintenance-modal__body cash-close-form">
                <div className="cash-close-summary">
                  <span>Saldo esperado</span>
                  <strong>
                    RD$ {session.expectedAmount.toFixed(2)}
                  </strong>
                </div>

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
                    RD${' '}
                    {(
                      countedAmount -
                      session.expectedAmount
                    ).toFixed(2)}
                  </strong>
                </div>
              </div>

              <footer className="maintenance-modal__footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCloseModalOpen(false)}
                  disabled={working}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="erp-button-primary"
                  disabled={working}
                >
                  {working
                    ? 'Cerrando...'
                    : 'Cerrar caja'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
