import { useNavigate } from 'react-router-dom';

const cards = [
  { label: 'Vehículos en espera', value: '3' },
  { label: 'En proceso', value: '8' },
  { label: 'Listos para entregar', value: '5' },
  { label: 'Ventas de hoy', value: 'RD$ 24,300.00' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const username = sessionStorage.getItem('cactus.user') ?? 'Usuario';

  function logout() {
    sessionStorage.clear();
    navigate('/login', { replace: true });
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="brand">CACTUS</span>
          <p>CarWash ERP</p>
        </div>

        <div className="topbar-actions">
          <span className="user-label">{username}</span>
          <button type="button" className="secondary-button" onClick={logout}>
            Salir
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/coffee-bar')}
          >
            Coffee Bar
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/cash')}
          >
            Caja
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/expenses')}
          >
            Gastos
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/employees')}
          >
            Empleados
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/company')}
          >
            Administración
          </button>
          <button type="button" onClick={() => navigate('/pos')}>
            Nueva orden
          </button>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">Panel operativo</p>
        <h1>Menos clics. Más control. Mejor servicio.</h1>
        <p>Vista inicial del centro de operaciones de Cactus-CarWash ERP.</p>
      </section>

      <section className="grid" aria-label="Indicadores principales">
        {cards.map((card) => (
          <article className="card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel dashboard-actions">
        <div>
          <p className="eyebrow">Acciones rápidas</p>
          <h2>Operación del día</h2>
        </div>
        <div className="quick-actions">
          <button type="button" onClick={() => navigate('/pos')}>
            Abrir recepción / POS
          </button>
          <button type="button" className="secondary-button">
            Ver órdenes
          </button>
          <button type="button" className="secondary-button">
            Abrir caja
          </button>
        </div>
      </section>
    </main>
  );
}
