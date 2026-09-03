import { Navigate, Outlet } from 'react-router-dom';
import { getAuthUser } from '../lib/authStorage';

export function PlatformAdminRouteGuard() {
  if (!getAuthUser()?.isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
