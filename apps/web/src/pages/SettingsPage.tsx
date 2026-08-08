import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'cactus.brand.logo';

export function SettingsPage() {
  const navigate = useNavigate();
  const [logo, setLogo] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
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
          <h1>Configuración de marca</h1>
          <p>Carga el logo que aparecerá en la cabecera del sistema.</p>
        </div>
        <button type="button" onClick={() => navigate('/pos')}>Volver</button>
      </header>

      <section className="settings-card">
        <div className="logo-preview">
          {logo ? <img src={logo} alt="Logo configurado" /> : <span>Sin logo</span>}
        </div>

        <div className="settings-actions">
          <label className="file-button">
            Seleccionar logo
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogo} />
          </label>
          {logo ? <button type="button" className="secondary-button" onClick={clearLogo}>Quitar logo</button> : null}
        </div>

        <p className="settings-note">
          En esta fase se guarda en el navegador. En la versión administrativa quedará persistido por empresa.
        </p>
      </section>
    </main>
  );
}
