type Status = 'waiting' | 'in_progress' | 'ready' | 'paid' | 'cancelled';

const labels: Record<Status, string> = {
  waiting: 'En espera',
  in_progress: 'En proceso',
  ready: 'Listo',
  paid: 'Pagado',
  cancelled: 'Cancelado'
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`cui-status cui-status--${status}`}>{labels[status]}</span>;
}
