import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type {
  BranchModuleResponse,
  BusinessModuleType,
  CompanyModuleResponse,
  PointOfSaleResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

type ModuleRouteGuardProps = {
  module: BusinessModuleType;
};

export function ModuleRouteGuard({ module }: ModuleRouteGuardProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateModule(): Promise<void> {
      try {
        setLoading(true);
        const points: PointOfSaleResponse[] = await api.posPoints();
        const point = points[0];

        if (!point) {
          if (!cancelled) setAllowed(false);
          return;
        }

        const [companyRows, branchRows]: [
          CompanyModuleResponse[],
          BranchModuleResponse[],
        ] = await Promise.all([
          api.companyModules(point.companyId),
          api.branchModules(point.companyId, point.branchId),
        ]);

        if (cancelled) return;

        const companyModule = companyRows.find(
          (row) => row.module === module,
        );
        const branchModule = branchRows.find(
          (row) => row.module === module,
        );

        setAllowed(
          Boolean(companyModule?.enabled && branchModule?.enabled),
        );
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void validateModule();
    return () => {
      cancelled = true;
    };
  }, [module]);

  if (loading) {
    return (
      <main className="module-page">
        <section className="settings-card">
          <p>Validando acceso al módulo...</p>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
