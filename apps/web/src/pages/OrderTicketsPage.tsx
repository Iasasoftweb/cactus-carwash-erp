import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { OperationalTicketResponse } from '@cactus/shared';
import { api } from '../lib/api';

export function OrderTicketsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<OperationalTicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const autoPrint = searchParams.get('autoprint') === '1';

  useEffect(() => {
    if (!id) return;

    api.orderTickets(id)
      .then(async (rows) => {
        setTickets(rows);

        if (autoPrint) {
          await Promise.all(
            rows.map((ticket) =>
              api.registerTicketPrint(id, ticket.area.code, false),
            ),
          );

          setTimeout(() => window.print(), 250);
        }
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [id, autoPrint]);

  async function printAll() {
    try {
      await Promise.all(
        tickets.map((ticket) =>
          api.registerTicketPrint(id, ticket.area.code, true),
        ),
      );
      window.print();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible registrar la reimpresión.',
      );
    }
  }

  if (loading) {
    return <main className="ticket-loading">Preparando tickets...</main>;
  }

  return (
    <main className="ticket-screen">
      <header className="ticket-screen__toolbar no-print">
        <button type="button" className="secondary-button" onClick={() => navigate(`/orders/${id}`)}>
          Volver a la orden
        </button>
        <button type="button" onClick={printAll}>
          <Printer size={18} />
          Reimprimir todos
        </button>
      </header>

      {error ? <div className="operations-error no-print">{error}</div> : null}

      {tickets.length === 0 ? (
        <div className="operations-empty">La orden no tiene servicios vinculados a un área operativa.</div>
      ) : null}

      <section className="ticket-pages">
        {tickets.map((ticket) => (
          <article className="work-ticket" key={ticket.area.id}>
            <div className="work-ticket__area">{ticket.area.name.toUpperCase()}</div>
            <h1>TICKET DE {ticket.area.name.toUpperCase()}</h1>
            <strong className="work-ticket__code">{ticket.ticketCode}</strong>

            <div className="work-ticket__meta">
              <div><span>Orden</span><strong>{ticket.orderNumber}</strong></div>
              <div><span>Fecha</span><strong>{new Date(ticket.createdAt).toLocaleString('es-DO')}</strong></div>
              <div><span>Cliente</span><strong>{ticket.customerAlias}</strong></div>
              <div><span>Vehículo</span><strong>{ticket.vehicleDescription}</strong></div>
              <div><span>Tipo</span><strong>{ticket.vehicleType}</strong></div>
              <div><span>Placa</span><strong>{ticket.plate ?? 'Sin placa'}</strong></div>
            </div>

            <div className="work-ticket__services">
              <h2>Servicios</h2>
              {ticket.lines.map((line) => (
                <div className="work-ticket__line" key={line.id}>
                  <div>
                    <strong>{line.quantity} × {line.serviceName}</strong>
                    <span>Empleado: {line.employeeName ?? 'Sin asignar'}</span>
                  </div>
                  <strong>RD$ {line.lineTotal.toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div className="work-ticket__total">
              <span>Total del área</span>
              <strong>RD$ {ticket.total.toFixed(2)}</strong>
            </div>

            <footer>
              <p>Conserve el ticket para identificar la orden.</p>
              <small>{ticket.orderNumber} · {ticket.area.code}</small>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
