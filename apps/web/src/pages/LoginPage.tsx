import {
  FormEvent,
  useState,
} from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import {
  clearAuthSession,
  saveAuthSession,
} from "../lib/authStorage";
import "./LoginPageV2.css";

export function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] =
    useState("admin");

  const [password, setPassword] =
    useState("admin123");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const normalizedUsername =
      username.trim();

    if (
      !normalizedUsername ||
      !password
    ) {
      setError(
        "Ingresa usuario y contraseña.",
      );
      return;
    }

    setSubmitting(true);
    setError("");
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
        "/dashboard",
        {
          replace: true,
        },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-v2-page">
      <div
        className="login-v2-dots"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <section className="login-v2-shell">
        <aside className="login-v2-brand">
          <div className="login-v2-logo-image-wrap">
            <div className="login-v2-real-brand">
              <div
                className="login-v2-real-cactus"
                aria-hidden="true"
              >
                <img
                  src="/images/cactuspos.png"
                  alt=""
                />
              </div>

              <div className="login-v2-real-brand-text">
                <div className="login-v2-real-brand-name">
                  <span className="login-v2-real-cactus-name">
                    Cactus
                  </span>

                  <span className="login-v2-real-pos">
                    POS
                  </span>
                </div>

                <div className="login-v2-real-subtitle">
                  ERP · PUNTO DE VENTA
                </div>
              </div>
            </div>
          </div>

          <div className="login-v2-copy">
            <h1>
              Tu negocio
              <br />
              <strong>
                en buenas manos
              </strong>
            </h1>

            <p>
              Facturación, inventario,
              clientes y mucho más,
              <br />
              en una sola plataforma.
            </p>
          </div>

          <div
            className="login-v2-art login-v2-art--new"
            aria-hidden="true"
          >
            <div className="login-pos-scene">
              <div className="login-pos-orbit login-pos-orbit--one" />
              <div className="login-pos-orbit login-pos-orbit--two" />

              <div className="login-pos-terminal">
                <div className="login-pos-screen">
                  <div className="login-pos-screen-top">
                    <span />
                    <i />
                  </div>

                  <div className="login-pos-dashboard">
                    <div className="login-pos-dashboard-main">
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="login-pos-dashboard-side">
                      <strong />
                      <strong />
                    </div>
                  </div>

                  <div className="login-pos-total">
                    <span>TOTAL</span>
                    <strong>$1,250</strong>
                  </div>
                </div>

                <div className="login-pos-terminal-neck" />
                <div className="login-pos-terminal-base" />
              </div>

              <div className="login-pos-receipt">
                <div className="login-pos-receipt-head">
                  <span>C</span>
                </div>

                <i />
                <i />
                <i />
                <i />

                <strong />
              </div>

              <div className="login-pos-person">
                <div className="login-pos-person-hair" />
                <div className="login-pos-person-head" />

                <div className="login-pos-person-body">
                  <span>+</span>
                </div>

                <div className="login-pos-person-arm" />
              </div>

              <div className="login-pos-badge">
                <span>✓</span>

                <div>
                  <strong>Venta lista</strong>
                  <small>Proceso completado</small>
                </div>
              </div>
            </div>
          </div>

          <div className="login-v2-features">
            <div className="login-v2-feature">
              <ReceiptText
                size={25}
                strokeWidth={1.8}
              />

              <span>
                Facturación
                <strong>Rápida</strong>
              </span>
            </div>

            <div className="login-v2-feature">
              <Boxes
                size={25}
                strokeWidth={1.8}
              />

              <span>
                Inventario
                <strong>Inteligente</strong>
              </span>
            </div>

            <div className="login-v2-feature">
              <UsersRound
                size={25}
                strokeWidth={1.8}
              />

              <span>
                Clientes
                <strong>
                  Siempre Contigo
                </strong>
              </span>
            </div>

            <div className="login-v2-feature">
              <BarChart3
                size={25}
                strokeWidth={1.8}
              />

              <span>
                Reportes
                <strong>
                  en Tiempo Real
                </strong>
              </span>
            </div>
          </div>
        </aside>

        <section className="login-v2-auth">
          <div className="login-v2-version">
            <strong>Cactus POS</strong>
            <span>v1.9.1</span>
            <i />
          </div>

          <div className="login-v2-auth-inner">
            <header className="login-v2-header">
              <h2>
                Iniciar sesión
              </h2>

              <p>
                Ingresa tus credenciales
                para continuar.
              </p>
            </header>

            <form
              className="login-v2-form"
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              <label className="login-v2-label">
                <span>Usuario</span>

                <div className="login-v2-field">
                  <UserRound
                    size={21}
                    aria-hidden="true"
                  />

                  <input
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value,
                      )
                    }
                    autoComplete="username"
                    placeholder="Ingresa tu usuario"
                    disabled={submitting}
                    required
                  />
                </div>
              </label>

              <label className="login-v2-label">
                <span>Contraseña</span>

                <div className="login-v2-field login-v2-password">
                  <LockKeyhole
                    size={21}
                    aria-hidden="true"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
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
                    required
                  />

                  <button
                    type="button"
                    className="login-v2-eye"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    disabled={submitting}
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    title={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={21} />
                    ) : (
                      <Eye size={21} />
                    )}
                  </button>
                </div>
              </label>

              {error ? (
                <div
                  className="login-v2-error"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="login-v2-submit"
                disabled={submitting}
              >
                <span>
                  {submitting
                    ? "Validando acceso..."
                    : "Entrar al sistema"}
                </span>

                {!submitting ? (
                  <ArrowRight
                    size={23}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            </form>

            <div className="login-v2-divider">
              <span />
              <small>
                ACCESO SEGURO
              </small>
              <span />
            </div>

            <div className="login-v2-security">
              <ShieldCheck
                size={27}
                aria-hidden="true"
              />

              <p>
                Acceso autorizado únicamente
                <br />
                para usuarios registrados.
              </p>
            </div>
          </div>
        </section>
      </section>

      <footer className="login-v2-footer">
        <div>
          <strong>
            Cactus POS
          </strong>

          <span>
            ERP · PUNTO DE VENTA
          </span>
        </div>

        <div className="login-v2-footer-right">
          <p>
            Operación, control y gestión
            en una sola plataforma.
          </p>

          <small className="login-v2-copyright">
            Iasasoft 2026 · Todos los derechos reservados
          </small>
        </div>
      </footer>
    </main>
  );
}
