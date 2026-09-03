import {
  useEffect,
  useState,
} from 'react';
import {
  Navigate,
  Outlet,
} from 'react-router-dom';
import { api } from '../lib/api';
import {
  clearAuthSession,
  getAccessToken,
  updateAuthUser,
} from '../lib/authStorage';

export function ProtectedRoute() {
  const [checking, setChecking] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const token =
      getAccessToken();

    if (!token) {
      clearAuthSession();
      setAuthenticated(false);
      setChecking(false);
      return;
    }

    api
      .authMe()
      .then((user) => {
        if (cancelled) {
          return;
        }

        updateAuthUser(user);
        setAuthenticated(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        clearAuthSession();
        setAuthenticated(false);
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <main className="auth-shell">
        <section className="login-card">
          Validando sesión...
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}
