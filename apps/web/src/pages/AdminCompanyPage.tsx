import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'cactus.brand.logo';

export function AdminCompanyPage() {
  const navigate = useNavigate();
  const [logo, setLogo] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  );

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const value =
        typeof reader.result === 'string' ? reader.result : '';

      localStorage.setItem(STORAGE_KEY, value);
      setLogo(value);
    };

    reader.readAsDataURL(file);
  }

  function clearLogo() {
    localStorage.removeItem(STORAGE_KEY);
    setLogo('');
  }

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>Administración de empresa</h1>
          <p>
            Identidad, información fiscal y opciones generales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
        >
          Volver al panel
        </button>
      </header>

      <section className="settings-card">
        <div>
          <p className="eyebrow">Identidad corporativa</p>
          <h2>Logo de la empresa</h2>
        </div>

        <div className="logo-preview">
          {logo ? (
            <img src={logo} alt="Logo configurado" />
          ) : (
            <span>Sin logo configurado</span>
          )}
        </div>

        <div className="settings-actions">
          <label className="file-button">
            Seleccionar logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogo}
            />
          </label>

          {logo ? (
            <button
              type="button"
              className="secondary-button"
              onClick={clearLogo}
            >
              Quitar logo
            </button>
          ) : null}
        </div>

        <p className="settings-note">
          La opción ya está separada de Recepción. La persistencia por
          empresa se conectará al módulo administrativo.
        </p>
      </section>
    </main>
  );
}
