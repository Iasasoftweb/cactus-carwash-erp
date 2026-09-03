import {
  Construction,
  UsersRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function StaffAssignmentPage() {
  const navigate = useNavigate();

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <UsersRound
              size={22}
              strokeWidth={1.8}
            />
          </div>

          <div className="maintenance-header__text">
            <h1>Asignar personal</h1>
            <p>
              Distribución operativa de lavadores
              y mecánicos.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/pos')}
        >
          Volver a recepción
        </button>
      </header>

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div className="maintenance-toolbar__heading">
            <div>
              <p className="eyebrow">
                OPERACIONES
              </p>

              <h2>
                Distribución de personal
              </h2>
            </div>

            <span className="maintenance-badge maintenance-badge--warning">
              Pendiente de integración
            </span>
          </div>
        </div>

        <div className="maintenance-placeholder">
          <div className="maintenance-placeholder__icon">
            <Construction
              size={26}
              strokeWidth={1.6}
            />
          </div>

          <div className="maintenance-placeholder__content">
            <h3>Módulo preparado</h3>

            <p>
              La navegación ya está disponible.
              La cola operativa y la asignación
              de personal se conectarán
              posteriormente.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
