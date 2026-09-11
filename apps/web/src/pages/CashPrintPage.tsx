import {
  useEffect,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import type {
  CashCloseReportResponse,
} from '@cactus/shared';

import { api } from '../lib/api';
import './styles/CashPrintPage.css';

export function CashPrintPage() {
  const {
    id = '',
    document: documentType = 'summary',
  } = useParams();

  const [
    report,
    setReport,
  ] =
    useState<CashCloseReportResponse | null>(
      null,
    );

  const [error, setError] =
    useState('');

  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-cash-print-page', 'true');
    style.textContent = `
      @media print {
        @page {
          size: 72mm 250mm;
          margin: 0;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setError(
        'La sesión de caja no está disponible.',
      );
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const result =
          await api.cashReport(id);

        if (cancelled) return;

        setReport(result);

        await api.registerCashPrint(
          id,
          {
            documentType:
              documentType === 'detail'
                ? 'SALES_DETAIL'
                : 'CLOSING_SUMMARY',
            reprint:
              result.printCount > 0,
          },
        );

        if (cancelled) return;

        window.setTimeout(
          () => window.print(),
          250,
        );
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No fue posible preparar la impresión.',
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    documentType,
  ]);

  if (error) {
    return (
      <main className="cash-print cash-print--state">
        {error}
      </main>
    );
  }

  if (!report) {
    return (
      <main className="cash-print cash-print--state">
        Cargando impresión...
      </main>
    );
  }

  const { session } = report;

  if (documentType === 'detail') {
    return (
      <main className="cash-print">
        <header className="cash-print__header">
          <h1>DETALLE DE VENTAS</h1>
          <p>{session.cashRegisterName}</p>
          <p>
            Cajero: {session.cashierName}
          </p>
        </header>

        <section className="cash-print__section">
          {report.sales.map((line) => (
            <div
              className="cash-print__row"
              key={`${line.kind}-${line.description}`}
            >
              <span>
                {line.quantity} ×{' '}
                {line.description}
              </span>

              <strong>
                RD$ {line.total.toFixed(2)}
              </strong>
            </div>
          ))}
        </section>

        <section className="cash-print__totals">
          <div className="cash-print__row">
            <span>Servicios</span>
            <strong>
              RD${' '}
              {report.totalServices.toFixed(
                2,
              )}
            </strong>
          </div>

          <div className="cash-print__row">
            <span>Productos</span>
            <strong>
              RD${' '}
              {report.totalProducts.toFixed(
                2,
              )}
            </strong>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cash-print">
      <header className="cash-print__header">
        <h1>CUADRE DE CAJA</h1>
        <p>{session.cashRegisterName}</p>
        <p>
          Cajero: {session.cashierName}
        </p>
        <p>
          Apertura:{' '}
          {new Date(
            session.openedAt,
          ).toLocaleString('es-DO')}
        </p>
        <p>
          Cierre:{' '}
          {session.closedAt
            ? new Date(
                session.closedAt,
              ).toLocaleString(
                'es-DO',
              )
            : 'Caja abierta'}
        </p>
      </header>

      <section className="cash-print__section">
        <div className="cash-print__row">
          <span>Fondo inicial</span>
          <strong>
            RD${' '}
            {session.openingAmount.toFixed(
              2,
            )}
          </strong>
        </div>

        {report.payments.map(
          (payment) => (
            <div
              className="cash-print__row"
              key={payment.methodCode}
            >
              <span>
                {payment.methodName}
              </span>
              <strong>
                RD${' '}
                {payment.amount.toFixed(
                  2,
                )}
              </strong>
            </div>
          ),
        )}
      </section>

      <section className="cash-print__totals">
        <div className="cash-print__row">
          <span>Efectivo esperado</span>
          <strong>
            RD${' '}
            {session.expectedAmount.toFixed(
              2,
            )}
          </strong>
        </div>

        <div className="cash-print__row">
          <span>Efectivo contado</span>
          <strong>
            RD${' '}
            {(
              session.countedAmount ?? 0
            ).toFixed(2)}
          </strong>
        </div>

        <div className="cash-print__row cash-print__row--total">
          <span>Diferencia</span>
          <strong>
            RD${' '}
            {(
              session.difference ?? 0
            ).toFixed(2)}
          </strong>
        </div>
      </section>
    </main>
  );
}
