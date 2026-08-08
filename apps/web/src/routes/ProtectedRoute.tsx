import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  const authenticated =
    localStorage.getItem('cactus.authenticated') === 'true';

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
