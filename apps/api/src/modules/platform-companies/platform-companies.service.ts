import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  BusinessModuleType,
  PlatformCompanyResponse,
} from '@cactus/shared';
import { hash } from 'bcryptjs';
import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';

type PlatformActor = {
  userId: string;
  companyId: string;
  ipAddress: string | null;
};

const BUSINESS_MODULES: readonly BusinessModuleType[] = [
  'POS',
  'CAR_WASH',
  'INVENTORY',
  'PURCHASES',
  'ACCOUNTS_RECEIVABLE',
  'ACCOUNTS_PAYABLE',
  'EXPENSES',
];

const companyInclude = {
  branches: {
    select: {
      active: true,
    },
  },
  modules: {
    select: {
      module: true,
      enabled: true,
    },
    orderBy: {
      module: 'asc',
    },
  },
  _count: {
    select: {
      users: true,
    },
  },
} as const;

type CompanyRow = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  currencyCode: string;
  currencySymbol: string;
  logoUrl: string | null;
  branchLimit: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  branches: Array<{ active: boolean }>;
  modules: Array<{
    module: BusinessModuleType;
    enabled: boolean;
  }>;
  _count: { users: number };
};

@Injectable()
export class PlatformCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private response(row: CompanyRow): PlatformCompanyResponse {
    return {
      id: row.id,
      name: row.name,
      legalName: row.legalName,
      taxId: row.taxId,
      currencyCode: row.currencyCode,
      currencySymbol: row.currencySymbol,
      logoUrl: row.logoUrl,
      branchLimit: row.branchLimit,
      modules: row.modules
        .filter((module) => module.enabled)
        .map((module) => module.module),
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      branchCount: row.branches.length,
      activeBranchCount: row.branches.filter((branch) => branch.active).length,
      userCount: row._count.users,
    };
  }

  private companyValues(
    dto: CreatePlatformCompanyDto | UpdatePlatformCompanyDto,
  ) {
    const name = dto.name.trim();
    const currencyCode = dto.currencyCode.trim().toUpperCase();
    const currencySymbol = dto.currencySymbol.trim();

    if (!name || !currencySymbol) {
      throw new BadRequestException(
        'El nombre y el símbolo monetario son obligatorios.',
      );
    }

    return {
      name,
      legalName: dto.legalName?.trim() || null,
      taxId: dto.taxId?.trim() || null,
      currencyCode,
      currencySymbol,
      logoUrl: dto.logoUrl?.trim() || null,
      branchLimit: dto.branchLimit,
    };
  }

  private selectedModules(
    modules: BusinessModuleType[],
  ): BusinessModuleType[] {
    const selected = [...new Set(modules)];

    if (
      selected.length === 0 ||
      selected.some((module) => !BUSINESS_MODULES.includes(module))
    ) {
      throw new BadRequestException(
        'Debe seleccionar al menos un módulo válido.',
      );
    }

    return selected;
  }

  async list(): Promise<PlatformCompanyResponse[]> {
    const rows = await this.prisma.company.findMany({
      include: companyInclude,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.response(row));
  }

  async create(
    dto: CreatePlatformCompanyDto,
    actor: PlatformActor,
  ): Promise<PlatformCompanyResponse> {
    const values = this.companyValues(dto);
    const selectedModules = this.selectedModules(dto.modules);
    const branchName = dto.branchName.trim();
    const branchCode = dto.branchCode.trim().toUpperCase();
    const adminFullName = dto.adminFullName.trim();
    const adminUsername = dto.adminUsername.trim();
    const adminEmail = dto.adminEmail?.trim() || null;

    if (!branchName || !branchCode) {
      throw new BadRequestException(
        'El nombre y el código de la sucursal principal son obligatorios.',
      );
    }

    if (!adminFullName || !adminUsername) {
      throw new BadRequestException(
        'El nombre completo y el usuario del administrador son obligatorios.',
      );
    }

    const passwordHash = await hash(dto.adminPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      const existingUsername = await tx.user.findFirst({
        where: { username: adminUsername },
        select: { id: true },
      });

      if (existingUsername) {
        throw new BadRequestException(
          'Ese nombre de usuario ya está utilizado en la plataforma.',
        );
      }

      const adminRole = await tx.role.findUnique({
        where: { code: 'ADMIN' },
        select: { id: true, active: true },
      });

      if (!adminRole?.active) {
        throw new BadRequestException(
          'El rol Administrador no existe o está inactivo.',
        );
      }

      const company = await tx.company.create({
        data: {
          ...values,
          active: dto.active ?? true,
          modules: {
            create: BUSINESS_MODULES.map((module) => ({
              module,
              enabled: selectedModules.includes(module),
            })),
          },
        },
      });

      const branch = await tx.branch.create({
        data: {
          companyId: company.id,
          name: branchName,
          code: branchCode,
          address: dto.branchAddress?.trim() || null,
          phone: dto.branchPhone?.trim() || null,
          active: true,
        },
      });

      await tx.branchModule.createMany({
        data: BUSINESS_MODULES.map((module) => ({
          companyId: company.id,
          branchId: branch.id,
          module,
          enabled: selectedModules.includes(module),
        })),
      });

      const administrator = await tx.user.create({
        data: {
          companyId: company.id,
          username: adminUsername,
          email: adminEmail,
          fullName: adminFullName,
          passwordHash,
          status: 'ACTIVE',
          branchAccessMode: 'ALL',
          userRoles: {
            create: { roleId: adminRole.id },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: company.id,
          userId: actor.userId,
          action: 'PLATFORM_CREATE_COMPANY',
          entityType: 'COMPANY',
          entityId: company.id,
          reason: null,
          newValues: {
            name: company.name,
            legalName: company.legalName,
            taxId: company.taxId,
            currencyCode: company.currencyCode,
            currencySymbol: company.currencySymbol,
            logoUrl: company.logoUrl,
            branchLimit: company.branchLimit,
            modules: selectedModules,
            active: company.active,
            primaryBranch: {
              id: branch.id,
              name: branch.name,
              code: branch.code,
            },
            administrator: {
              id: administrator.id,
              username: administrator.username,
              email: administrator.email,
              fullName: administrator.fullName,
              roleCode: 'ADMIN',
              branchAccessMode: administrator.branchAccessMode,
            },
          },
          ipAddress: actor.ipAddress,
        },
      });

      const row = await tx.company.findUniqueOrThrow({
        where: { id: company.id },
        include: companyInclude,
      });

      return this.response(row);
    });
  }

  async update(
    id: string,
    dto: UpdatePlatformCompanyDto,
    actor: PlatformActor,
  ): Promise<PlatformCompanyResponse> {
    const existing = await this.prisma.company.findUnique({
      where: { id },
      include: companyInclude,
    });

    if (!existing) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    if (id === actor.companyId && !dto.active) {
      throw new BadRequestException(
        'No puedes desactivar la empresa de tu sesión actual.',
      );
    }

    const activeBranchCount = existing.branches.filter(
      (branch) => branch.active,
    ).length;

    if (dto.branchLimit < activeBranchCount) {
      throw new BadRequestException(
        `La empresa tiene ${activeBranchCount} sucursales activas. ` +
          'Desactiva sucursales antes de reducir el límite.',
      );
    }

    const values = this.companyValues(dto);
    const selectedModules = this.selectedModules(dto.modules);
    const previousModules = existing.modules
      .filter((module) => module.enabled)
      .map((module) => module.module);

    return this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id },
        data: {
          ...values,
          active: dto.active,
        },
      });

      for (const module of BUSINESS_MODULES) {
        await tx.companyModule.upsert({
          where: {
            companyId_module: {
              companyId: id,
              module,
            },
          },
          create: {
            companyId: id,
            module,
            enabled: selectedModules.includes(module),
          },
          update: {
            enabled: selectedModules.includes(module),
          },
        });
      }

      await tx.branchModule.updateMany({
        where: {
          companyId: id,
          module: {
            notIn: selectedModules,
          },
        },
        data: {
          enabled: false,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: id,
          userId: actor.userId,
          action: 'PLATFORM_UPDATE_COMPANY',
          entityType: 'COMPANY',
          entityId: id,
          reason: null,
          oldValues: {
            name: existing.name,
            legalName: existing.legalName,
            taxId: existing.taxId,
            currencyCode: existing.currencyCode,
            currencySymbol: existing.currencySymbol,
            logoUrl: existing.logoUrl,
            branchLimit: existing.branchLimit,
            modules: previousModules,
            active: existing.active,
          },
          newValues: {
            ...values,
            modules: selectedModules,
            active: dto.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      const row = await tx.company.findUniqueOrThrow({
        where: { id },
        include: companyInclude,
      });

      return this.response(row);
    });
  }

  async updateLogo(
    id: string,
    file: Express.Multer.File,
    actor: PlatformActor,
  ): Promise<PlatformCompanyResponse> {
    if (!file) {
      throw new BadRequestException('Debes seleccionar una imagen.');
    }

    const existing = await this.prisma.company.findUnique({
      where: { id },
      include: companyInclude,
    });

    if (!existing) {
      await unlink(file.path).catch(() => undefined);
      throw new NotFoundException('Empresa no encontrada.');
    }

    const logoUrl = `/uploads/companies/${file.filename}`;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id },
        data: { logoUrl },
      });

      await tx.auditLog.create({
        data: {
          companyId: id,
          userId: actor.userId,
          action: 'PLATFORM_UPDATE_COMPANY_LOGO',
          entityType: 'COMPANY',
          entityId: id,
          reason: null,
          oldValues: {
            logoUrl: existing.logoUrl,
          },
          newValues: {
            logoUrl,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return tx.company.findUniqueOrThrow({
        where: { id },
        include: companyInclude,
      });
    });

    if (existing.logoUrl?.startsWith('/uploads/companies/')) {
      const previousFilename = basename(existing.logoUrl);

      if (previousFilename !== file.filename) {
        await unlink(
          join(process.cwd(), 'uploads', 'companies', previousFilename),
        ).catch(() => undefined);
      }
    }

    return this.response(row);
  }
}
