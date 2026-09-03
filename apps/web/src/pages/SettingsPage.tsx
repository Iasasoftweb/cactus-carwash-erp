import {
  FileImage,
  Palette,
  Trash2,
} from 'lucide-react';
import {
  ChangeEvent,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'cactus.brand.logo';

export function SettingsPage() {
  const navigate = useNavigate();

  const [logo, setLogo] =
    useState(
      () =>
        localStorage.getItem(
          STORAGE_KEY,
        ) ?? '',
    );

  function handleLogo(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const value =
        typeof reader.result === 'string'
          ? reader.result
          : '';

      localStorage.setItem(
        STORAGE_KEY,
        value,
      );

      setLogo(value);
    };

    reader.readAsDataURL(file);
  }

  function clearLogo(): void {
    localStorage.removeItem(
      STORAGE_KEY,
    );

    setLogo('');
  }

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Palette
              size={22}
              strokeWidth={1.8}
            />
          </div>

          <div className="maintenance-header__text">
            <h1>
              Configuración de marca
            </h1>

            <p>
              Define el logo que aparecerá
              en la cabecera del sistema.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate('/pos')
          }
        >
          Volver
        </button>
      </header>

      <section className="settings-card maintenance-card">
        <div className="maintenance-toolbar">
          <div className="maintenance-toolbar__heading">
            <div>
              <p className="eyebrow">
                IDENTIDAD
              </p>

              <h2>
                Marca del sistema
              </h2>
            </div>
          </div>
        </div>

        <section className="maintenance-company-panel">
          <div className="maintenance-company-panel__copy">
            <div className="maintenance-company-panel__icon">
              <FileImage
                size={20}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <h3>
                Logo principal
              </h3>

              <p>
                Este logo se utiliza como
                identidad visual en la cabecera
                del sistema.
              </p>
            </div>
          </div>

          <div className="maintenance-logo-card">
            <div className="maintenance-logo-preview">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo configurado"
                />
              ) : (
                <div className="maintenance-logo-empty">
                  <FileImage
                    size={28}
                    strokeWidth={1.6}
                  />

                  <span>
                    Sin logo configurado
                  </span>
                </div>
              )}
            </div>

            <div className="maintenance-logo-actions">
              <label className="maintenance-file-button">
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
                  <Trash2 size={16} />
                  Quitar logo
                </button>
              ) : null}
            </div>

            <p className="maintenance-company-note">
              En esta fase la configuración se
              guarda en el navegador. En la
              versión administrativa quedará
              persistida por empresa.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
