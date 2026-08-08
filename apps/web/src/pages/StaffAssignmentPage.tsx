import { useNavigate } from 'react-router-dom';

export function StaffAssignmentPage() {
  const navigate = useNavigate();

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>Asignar personal</h1>
          <p>Distribución operativa de lavadores y mecánicos.</p>
        </div>
        <button type="button" onClick={() => navigate('/pos')}>Volver a recepción</button>
      </header>

      <section className="module-empty">
        <h2>Módulo preparado</h2>
        <p>La navegación ya funciona. La cola operativa se conectará posteriormente.</p>
      </section>
    </main>
  );
}
