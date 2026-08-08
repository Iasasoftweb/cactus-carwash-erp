import { useNavigate } from 'react-router-dom';

export function CustomersPage() {
  const navigate = useNavigate();

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>Clientes</h1>
          <p>Gestión de clientes generales y clientes con crédito.</p>
        </div>
        <button type="button" onClick={() => navigate('/pos')}>Volver a recepción</button>
      </header>

      <section className="module-empty">
        <h2>Módulo preparado</h2>
        <p>La navegación ya funciona. El mantenimiento completo se implementará en el siguiente sprint.</p>
      </section>
    </main>
  );
}
