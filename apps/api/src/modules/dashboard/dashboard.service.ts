import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  DashboardContextResponse,
  DashboardFinancialSummaryResponse,
} from '@cactus/shared';

type DashboardAccess = {
  companyId: string;
  branchAccessMode: 'ALL' | 'ASSIGNED';
  branchIds: string[];
  permissions: string[];
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private hasPermission(access: DashboardAccess, permission: string): boolean {
    return access.permissions.includes(permission);
  }

  async context(access: DashboardAccess): Promise<DashboardContextResponse> {
    const canViewFinancialDashboard = this.hasPermission(
      access,
      ERP_PERMISSIONS.financialDashboardView,
    );
    const canViewAllBranchesFinancial = this.hasPermission(
      access,
      ERP_PERMISSIONS.financialDashboardAllBranches,
    );

    const company = await this.prisma.company.findFirst({
      where: {
        id: access.companyId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        logoUrl: true,
        currencyCode: true,
        currencySymbol: true,
        branches: {
          where: {
            active: true,
            ...(
              access.branchAccessMode === 'ASSIGNED' &&
              !canViewAllBranchesFinancial
                ? { id: { in: access.branchIds } }
                : {}
            ),
          },
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            phone: true,
          },
          orderBy: [
            { name: 'asc' },
            { code: 'asc' },
          ],
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    return {
      companyId: company.id,
      companyName: company.name,
      companyTaxId: company.taxId,
      companyLogoUrl: company.logoUrl,
      currencyCode: company.currencyCode,
      currencySymbol: company.currencySymbol,
      branches: company.branches,
      canViewFinancialDashboard,
      canViewAllBranchesFinancial,
    };
  }

  async financialSummary(
    access: DashboardAccess,
    branchId?: string,
  ): Promise<DashboardFinancialSummaryResponse> {
    if (
      !this.hasPermission(
        access,
        ERP_PERMISSIONS.financialDashboardView,
      )
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar información financiera.',
      );
    }

    const canViewAllBranches = this.hasPermission(
      access,
      ERP_PERMISSIONS.financialDashboardAllBranches,
    );

    if (!branchId && !canViewAllBranches) {
      throw new ForbiddenException(
        'Debe seleccionar una sucursal autorizada.',
      );
    }

    let branch: { id: string; name: string } | null = null;

    if (branchId) {
      if (
        !canViewAllBranches &&
        access.branchAccessMode === 'ASSIGNED' &&
        !access.branchIds.includes(branchId)
      ) {
        throw new NotFoundException('Sucursal no encontrada.');
      }

      branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          companyId: access.companyId,
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!branch) {
        throw new NotFoundException('Sucursal no encontrada.');
      }
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const branchFilter = branchId
      ? { branchId }
      : {};

    const [
      sales,
      expenses,
      receivables,
      overdueReceivables,
      payables,
      overduePayables,
    ] = await Promise.all([
      this.prisma.posMovement.aggregate({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
          pointOfSale: {
            companyId: access.companyId,
            ...branchFilter,
          },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId: access.companyId,
          ...branchFilter,
          status: 'ISSUED',
          issuedAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          balance: { gt: 0 },
          status: {
            in: ['ISSUED', 'PARTIALLY_PAID', 'CREDIT'],
          },
          order: {
            branch: { companyId: access.companyId },
            ...branchFilter,
          },
        },
        _sum: { balance: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          balance: { gt: 0 },
          status: {
            in: ['ISSUED', 'PARTIALLY_PAID', 'CREDIT'],
          },
          dueDate: { lt: startOfToday },
          order: {
            branch: { companyId: access.companyId },
            ...branchFilter,
          },
        },
        _sum: { balance: true },
        _count: { _all: true },
      }),
      this.prisma.supplierInvoice.aggregate({
        where: {
          companyId: access.companyId,
          ...branchFilter,
          status: {
            in: ['PENDING', 'PARTIALLY_PAID'],
          },
          balance: { gt: 0 },
        },
        _sum: { balance: true },
      }),
      this.prisma.supplierInvoice.aggregate({
        where: {
          companyId: access.companyId,
          ...branchFilter,
          status: {
            in: ['PENDING', 'PARTIALLY_PAID'],
          },
          balance: { gt: 0 },
          dueDate: { lt: startOfToday },
        },
        _sum: { balance: true },
        _count: { _all: true },
      }),
    ]);

    const salesToday = Number(sales._sum.total ?? 0);
    const expensesToday = Number(expenses._sum.amount ?? 0);

    return {
      scope: branch ? 'BRANCH' : 'COMPANY',
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? null,
      generatedAt: new Date().toISOString(),
      salesToday,
      salesTransactionsToday: sales._count._all,
      expensesToday,
      expensesIssuedToday: expenses._count._all,
      operatingNetToday: salesToday - expensesToday,
      accountsReceivableBalance: Number(receivables._sum.balance ?? 0),
      overdueReceivableBalance: Number(
        overdueReceivables._sum.balance ?? 0,
      ),
      overdueReceivableInvoices: overdueReceivables._count._all,
      accountsPayableBalance: Number(payables._sum.balance ?? 0),
      overduePayableBalance: Number(overduePayables._sum.balance ?? 0),
      overduePayableInvoices: overduePayables._count._all,
    };
  }
}
