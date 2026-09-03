import { Navigate, Outlet } from 'react-router-dom';
import { getAuthUser } from '../lib/authStorage';

type PermissionRouteGuardProps = {
  anyOf: readonly string[];
};

export function PermissionRouteGuard({
  anyOf,
}: PermissionRouteGuardProps) {
  const user = getAuthUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = anyOf.some((permission) =>
    user.permissions.includes(permission),
  );

  if (!allowed) {
    return (
      <main className="module-page">
        <section className="settings-card">
          <p className="eyebrow">ACCESO RESTRINGIDO</p>

          <h1>No tienes permisos para acceder</h1>

          <p className="settings-note">
            Solicita al administrador un rol con los permisos
            requeridos.
          </p>
        </section>
      </main>
    );
  }

  return <Outlet />;
}




