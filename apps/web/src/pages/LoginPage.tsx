import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Ingresa usuario y contraseña.');
      return;
    }

    localStorage.setItem('cactus.authenticated', 'true');
    localStorage.setItem('cactus.user', username.trim());
    navigate('/dashboard', { replace: true });
  }

  return (
    <main className="auth-shell">
      <section className="login-card">
        <div className="brand-block">
          <span className="brand">CACTUS</span>
          <p>CarWash ERP</p>
        </div>

        <div>
          <p className="eyebrow">Acceso al sistema</p>
          <h1>Bienvenido</h1>
          <p className="muted">Ingresa con tus credenciales para continuar.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="error-message">{error}</p> : null}
          <button type="submit">Entrar</button>
        </form>

        <p className="demo-note">Acceso temporal: admin / admin123</p>
      </section>
    </main>
  );
}
