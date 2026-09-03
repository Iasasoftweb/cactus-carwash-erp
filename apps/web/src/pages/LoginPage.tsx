import {
  FormEvent,
  useState,
} from 'react';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  clearAuthSession,
  saveAuthSession,
} from '../lib/authStorage';

export function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] =
    useState('admin');

  const [password, setPassword] =
    useState('admin123');

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedUsername =
      username.trim();

    if (
      !normalizedUsername ||
      !password
    ) {
      setError(
        'Ingresa usuario y contraseña.',
      );
      return;
    }

    setSubmitting(true);
    setError('');
    clearAuthSession();

    try {
      const session =
        await api.login({
          username:
            normalizedUsername,
          password,
        });

      saveAuthSession(session);

      navigate(
        '/dashboard',
        {
          replace: true,
        },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible iniciar sesión.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell auth-shell--modern">
      <section className="login-card login-card--modern">
        <div className="login-brand-panel">
          <img
            src="/images/cactuspos.png"
            alt="Cactus POS"
            className="login-brand-logo"
          />

          <div className="login-brand-caption">
            <span>ERP · Punto de Venta</span>
            <small>
              Operación, control y gestión en una sola plataforma.
            </small>
          </div>
        </div>

        <div className="login-content">
          <header className="login-heading">
            <div>
              <p className="eyebrow">
                ACCESO SEGURO
              </p>

              <h1>Bienvenido</h1>

              <p className="muted">
                Ingresa tus credenciales para continuar.
              </p>
            </div>

            <span className="login-status">
              Sistema disponible
            </span>
          </header>

          <form
            className="login-form"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <label className="login-field">
              <span>Usuario</span>

              <div className="login-input-wrap">
                <UserRound
                  size={18}
                  aria-hidden="true"
                />

                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value,
                    )
                  }
                  autoComplete="username"
                  placeholder="Ingresa tu usuario"
                  disabled={submitting}
                />
              </div>
            </label>

            <label className="login-field">
              <span>Contraseña</span>

              <div className="login-input-wrap">
                <LockKeyhole
                  size={18}
                  aria-hidden="true"
                />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                  title={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </label>

            {error ? (
              <div
                className="login-error"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="login-submit"
              disabled={submitting}
            >
              {submitting
                ? 'Validando acceso...'
                : 'Entrar al sistema'}
            </button>
          </form>

          <footer className="login-footer">
            <span>
              Cactus POS
            </span>

            <small>
              Acceso autorizado únicamente para usuarios registrados.
            </small>
          </footer>
        </div>
      </section>
    </main>
  );
}
