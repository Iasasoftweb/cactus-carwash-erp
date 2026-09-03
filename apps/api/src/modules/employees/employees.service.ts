import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  CashierEmployeeResponse,
  EmployeeBranchResponse,
  EmployeeResponse,
} from '@cactus/shared';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

type EmployeeBranchAccessContext = {
  companyId: string;
  branchAccessMode: 'ALL' | 'ASSIGNED';
  branchIds: string[];
};

type EmployeeActor = EmployeeBranchAccessContext & {
  userId: string;
  username: string;
  ipAddress: string | null;
};

const employeeSelect = {
  id: true,
  branchId: true,
  branch: { select: { name: true } },
  employeeNo: true,
  fullName: true,
  phone: true,
  jobPosition: true,
  canOperateCash: true,
  active: true,
} as const;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  private branchFilter(access: EmployeeBranchAccessContext) {
    return access.branchAccessMode === 'ASSIGNED'
      ? { branchId: { in: access.branchIds } }
      : {};
  }

  private branchIdFilter(access: EmployeeBranchAccessContext) {
    return access.branchAccessMode === 'ASSIGNED'
      ? { id: { in: access.branchIds } }
      : {};
  }

  private assertBranchAccess(
    access: EmployeeBranchAccessContext,
    branchId: string,
  ): void {
    if (
      access.branchAccessMode === 'ASSIGNED' &&
      !access.branchIds.includes(branchId)
    ) {
      throw new BadRequestException(
        'La sucursal seleccionada no está disponible.',
      );
    }
  }

  private map(row: {
    id: string;
    branchId: string;
    branch: { name: string };
    employeeNo: string;
    fullName: string;
    phone: string | null;
    jobPosition: string | null;
    canOperateCash: boolean;
    active: boolean;
  }): EmployeeResponse {
    return {
      id: row.id,
      branchId: row.branchId,
      branchName: row.branch.name,
      employeeNo: row.employeeNo,
      fullName: row.fullName,
      phone: row.phone,
      jobPosition: row.jobPosition,
      canOperateCash: row.canOperateCash,
      active: row.active,
    };
  }

  async branches(
    access: EmployeeBranchAccessContext,
  ): Promise<EmployeeBranchResponse[]> {
    return this.prisma.branch.findMany({
      where: {
        companyId: access.companyId,
        active: true,
        ...this.branchIdFilter(access),
      },
      select: { id: true, code: true, name: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async list(
    access: EmployeeBranchAccessContext,
  ): Promise<EmployeeResponse[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        companyId: access.companyId,
        ...this.branchFilter(access),
      },
      select: employeeSelect,
      orderBy: { fullName: 'asc' },
    });

    return rows.map((row) => this.map(row));
  }

  async cashiers(
    access: EmployeeBranchAccessContext,
  ): Promise<CashierEmployeeResponse[]> {
    return this.prisma.employee.findMany({
      where: {
        companyId: access.companyId,
        active: true,
        canOperateCash: true,
        ...this.branchFilter(access),
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        jobPosition: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(
    dto: CreateEmployeeDto,
    actor: EmployeeActor,
  ): Promise<EmployeeResponse> {
    this.assertBranchAccess(actor, dto.branchId);

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: dto.branchId,
        companyId: actor.companyId,
        active: true,
      },
      select: { id: true, name: true },
    });

    if (!branch) {
      throw new BadRequestException(
        'La sucursal seleccionada no está disponible.',
      );
    }

    const employeeNo = dto.employeeNo.trim();
    const fullName = dto.fullName.trim();

    if (!employeeNo || !fullName) {
      throw new BadRequestException(
        'Número y nombre del empleado son obligatorios.',
      );
    }

    const exists = await this.prisma.employee.findFirst({
      where: { companyId: actor.companyId, employeeNo },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('El número de empleado ya existe.');
    }

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          companyId: actor.companyId,
          branchId: branch.id,
          employeeNo,
          fullName,
          phone: dto.phone?.trim() || null,
          jobPosition: dto.jobPosition?.trim() || null,
          canOperateCash: dto.canOperateCash,
        },
        select: employeeSelect,
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: 'CREATE_EMPLOYEE',
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          reason: null,
          newValues: {
            branchId: employee.branchId,
            branchName: employee.branch.name,
            employeeNo: employee.employeeNo,
            fullName: employee.fullName,
            phone: employee.phone,
            jobPosition: employee.jobPosition,
            canOperateCash: employee.canOperateCash,
            active: employee.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.map(employee);
    });
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    actor: EmployeeActor,
  ): Promise<EmployeeResponse> {
    const existing = await this.prisma.employee.findFirst({
      where: {
        id,
        companyId: actor.companyId,
        ...this.branchFilter(actor),
      },
      select: {
        id: true,
        branchId: true,
        employeeNo: true,
        fullName: true,
        phone: true,
        jobPosition: true,
        canOperateCash: true,
        active: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Empleado no encontrado.');
    }

    this.assertBranchAccess(actor, dto.branchId);

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: dto.branchId,
        companyId: actor.companyId,
        active: true,
      },
      select: { id: true, name: true },
    });

    if (!branch) {
      throw new BadRequestException(
        'La sucursal seleccionada no está disponible.',
      );
    }

    const employeeNo = dto.employeeNo.trim();
    const fullName = dto.fullName.trim();

    if (!employeeNo || !fullName) {
      throw new BadRequestException(
        'Número y nombre del empleado son obligatorios.',
      );
    }

    const duplicate = await this.prisma.employee.findFirst({
      where: {
        companyId: actor.companyId,
        employeeNo,
        id: { not: id },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('El número de empleado ya existe.');
    }

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          branchId: branch.id,
          employeeNo,
          fullName,
          phone: dto.phone?.trim() || null,
          jobPosition: dto.jobPosition?.trim() || null,
          canOperateCash: dto.canOperateCash,
          active: dto.active,
        },
        select: employeeSelect,
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: 'UPDATE_EMPLOYEE',
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          reason: null,
          oldValues: {
            branchId: existing.branchId,
            employeeNo: existing.employeeNo,
            fullName: existing.fullName,
            phone: existing.phone,
            jobPosition: existing.jobPosition,
            canOperateCash: existing.canOperateCash,
            active: existing.active,
          },
          newValues: {
            branchId: employee.branchId,
            branchName: employee.branch.name,
            employeeNo: employee.employeeNo,
            fullName: employee.fullName,
            phone: employee.phone,
            jobPosition: employee.jobPosition,
            canOperateCash: employee.canOperateCash,
            active: employee.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.map(employee);
    });
  }
}