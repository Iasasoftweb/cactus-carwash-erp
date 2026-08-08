import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { CashCloseReportResponse } from '@cactus/shared';
import { api } from '../lib/api';

export function CashPrintPage() {
  const { id = '', document = 'summary' } = useParams();
  const [report, setReport] = useState<CashCloseReportResponse | null>(null);

  useEffect(() => {
    api.cashReport(id).then(async (result) => {
      setReport(result);
      await api.registerCashPrint(id, {
        documentType:
          document === 'detail' ? 'SALES_DETAIL' : 'CLOSING_SUMMARY',
        reprint: result.printCount > 0,
        printedBy: localStorage.getItem('cactus.user') ?? 'Usuario',
      });
      window.setTimeout(() => window.print(), 250);
    });
  }, [id, document]);

  if (!report) {
    return <main className="print-ticket">Cargando impresión...</main>;
  }

  const { session } = report;

  if (document === 'detail') {
    return (
      <main className="print-ticket">
        <h1>DETALLE DE VENTAS</h1>
        <p>{session.cashRegisterName}</p>
        <p>Cajero: {session.cashierName}</p>
        <hr />
        {report.sales.map((line) => (
          <div className="print-row" key={`${line.kind}-${line.description}`}>
            <span>
              {line.quantity} × {line.description}
            </span>
            <strong>RD$ {line.total.toFixed(2)}</strong>
          </div>
        ))}
        <hr />
        <div className="print-row">
          <span>Servicios</span>
          <strong>RD$ {report.totalServices.toFixed(2)}</strong>
        </div>
        <div className="print-row">
          <span>Productos</span>
          <strong>RD$ {report.totalProducts.toFixed(2)}</strong>
        </div>
      </main>
    );
  }

  return (
    <main className="print-ticket">
      <h1>CUADRE DE CAJA</h1>
      <p>{session.cashRegisterName}</p>
      <p>Cajero: {session.cashierName}</p>
      <p>Apertura: {new Date(session.openedAt).toLocaleString('es-DO')}</p>
      <p>
        Cierre:{' '}
        {session.closedAt
          ? new Date(session.closedAt).toLocaleString('es-DO')
          : 'Caja abierta'}
      </p>
      <hr />
      <div className="print-row">
        <span>Fondo inicial</span>
        <strong>RD$ {session.openingAmount.toFixed(2)}</strong>
      </div>
      {report.payments.map((payment) => (
        <div className="print-row" key={payment.methodCode}>
          <span>{payment.methodName}</span>
          <strong>RD$ {payment.amount.toFixed(2)}</strong>
        </div>
      ))}
      <div className="print-row">
        <span>Efectivo esperado</span>
        <strong>RD$ {session.expectedAmount.toFixed(2)}</strong>
      </div>
      <div className="print-row">
        <span>Efectivo contado</span>
        <strong>RD$ {(session.countedAmount ?? 0).toFixed(2)}</strong>
      </div>
      <div className="print-row">
        <span>Diferencia</span>
        <strong>RD$ {(session.difference ?? 0).toFixed(2)}</strong>
      </div>
    </main>
  );
}
