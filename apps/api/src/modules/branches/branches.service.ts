import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type { BranchAdminResponse } from '@cactus/shared';

import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

type BranchActor = {
  userId: string;
  companyId: string;
  ipAddress: string | null;
};

type BranchRow = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const branchSelect = {
  id: true,
  companyId: true,
  name: true,
  code: true,
  address: true,
  phone: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  private response(branch: BranchRow): BranchAdminResponse {
    return {
      id: branch.id,
      companyId: branch.companyId,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      active: branch.active,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    };
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  async list(companyId: string): Promise<BranchAdminResponse[]> {
    const branches = await this.prisma.branch.findMany({
      where: { companyId },
      select: branchSelect,
      orderBy: [
        { active: 'desc' },
        { name: 'asc' },
        { code: 'asc' },
      ],
    });

    return branches.map((branch) => this.response(branch));
  }

  async findOne(
    id: string,
    companyId: string,
  ): Promise<BranchAdminResponse> {
    const branch = await this.prisma.branch.findFirst({
      where: { id, companyId },
      select: branchSelect,
    });

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada.');
    }

    return this.response(branch);
  }

  async create(
    dto: CreateBranchDto,
    actor: BranchActor,
  ): Promise<BranchAdminResponse> {
    const name = dto.name.trim();
    const code = this.normalizeCode(dto.code);
    const address = dto.address?.trim() || null;
    const phone = dto.phone?.trim() || null;
    const active = dto.active ?? true;

    if (!name || !code) {
      throw new BadRequestException(
        'El nombre y el código son obligatorios.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: {
          id: actor.companyId,
          active: true,
        },
        select: {
          branchLimit: true,
          modules: {
            where: { enabled: true },
            select: { module: true },
          },
        },
      });

      if (!company) {
        throw new NotFoundException('Empresa no encontrada.');
      }

      const duplicate = await tx.branch.findFirst({
        where: {
          companyId: actor.companyId,
          code,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException(
          'Ya existe una sucursal con ese código.',
        );
      }

      if (active) {
        const activeCount = await tx.branch.count({
          where: {
            companyId: actor.companyId,
            active: true,
          },
        });

        if (activeCount >= company.branchLimit) {
          throw new BadRequestException(
            `La empresa alcanzó el límite de ${company.branchLimit} ` +
              'sucursales activas contratado.',
          );
        }
      }

      const branch = await tx.branch.create({
        data: {
          companyId: actor.companyId,
          name,
          code,
          address,
          phone,
          active,
        },
        select: branchSelect,
      });

      if (company.modules.length > 0) {
        await tx.branchModule.createMany({
          data: company.modules.map(({ module }) => ({
            companyId: actor.companyId,
            branchId: branch.id,
            module,
            enabled: true,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: 'CREATE_BRANCH',
          entityType: 'BRANCH',
          entityId: branch.id,
          reason: null,
          newValues: {
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone,
            active: branch.active,
            inheritedModules: company.modules.map(({ module }) => module),
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.response(branch);
    });
  }

  async update(
    id: string,
    dto: UpdateBranchDto,
    actor: BranchActor,
  ): Promise<BranchAdminResponse> {
    const existing = await this.prisma.branch.findFirst({
      where: {
        id,
        companyId: actor.companyId,
      },
      select: branchSelect,
    });

    if (!existing) {
      throw new NotFoundException('Sucursal no encontrada.');
    }

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    const code =
      dto.code !== undefined
        ? this.normalizeCode(dto.code)
        : existing.code;

    if (!name || !code) {
      throw new BadRequestException(
        'El nombre y el código son obligatorios.',
      );
    }

    const address =
      dto.address !== undefined
        ? dto.address?.trim() || null
        : existing.address;
    const phone =
      dto.phone !== undefined
        ? dto.phone?.trim() || null
        : existing.phone;
    const active = dto.active ?? existing.active;

    return this.prisma.$transaction(async (tx) => {
      if (code !== existing.code) {
        const duplicate = await tx.branch.findFirst({
          where: {
            companyId: actor.companyId,
            code,
            id: { not: id },
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new BadRequestException(
            'Ya existe una sucursal con ese código.',
          );
        }
      }

      if (!existing.active && active) {
        const company = await tx.company.findUnique({
          where: { id: actor.companyId },
          select: { branchLimit: true, active: true },
        });

        if (!company?.active) {
          throw new NotFoundException('Empresa no encontrada.');
        }

        const activeCount = await tx.branch.count({
          where: {
            companyId: actor.companyId,
            active: true,
          },
        });

        if (activeCount >= company.branchLimit) {
          throw new BadRequestException(
            `La empresa alcanzó el límite de ${company.branchLimit} ` +
              'sucursales activas contratado.',
          );
        }
      }

      const branch = await tx.branch.update({
        where: { id },
        data: {
          name,
          code,
          address,
          phone,
          active,
        },
        select: branchSelect,
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: 'UPDATE_BRANCH',
          entityType: 'BRANCH',
          entityId: branch.id,
          reason: null,
          oldValues: {
            name: existing.name,
            code: existing.code,
            address: existing.address,
            phone: existing.phone,
            active: existing.active,
          },
          newValues: {
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone,
            active: branch.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.response(branch);
    });
  }
}
