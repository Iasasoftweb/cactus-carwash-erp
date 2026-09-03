import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  LocationCashRegisterResponse,
  LocationPointOfSaleResponse,
  PosCapabilityResponse,
} from '@cactus/shared';

import { CreateLocationCashRegisterDto } from './dto/create-location-cash-register.dto';
import { CreateLocationPointDto } from './dto/create-location-point.dto';
import { UpdateLocationCashRegisterDto } from './dto/update-location-cash-register.dto';
import { UpdateLocationPointDto } from './dto/update-location-point.dto';

type LocationActor = {
  userId: string;
  companyId: string;
  ipAddress: string | null;
};

type PointRow = {
  id: string;
  companyId: string;
  branchId: string;
  branch: {
    name: string;
  };
  code: string;
  name: string;
  description: string | null;
  uiMode: 'TOUCH' | 'DESKTOP';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  capabilities: Array<{
    id: string;
    pointOfSaleId: string;
    capability: PosCapabilityResponse['capability'];
    enabled: boolean;
  }>;
};

type CashRegisterRow = {
  id: string;
  branchId: string;
  branch: {
    name: string;
  };
  operationalAreaId: string | null;
  operationalArea: {
    name: string;
  } | null;
  pointOfSaleId: string | null;
  pointOfSale: {
    name: string;
  } | null;
  code: string;
  name: string;
  active: boolean;
};

const pointSelect = {
  id: true,
  companyId: true,
  branchId: true,
  branch: {
    select: {
      name: true,
    },
  },
  code: true,
  name: true,
  description: true,
  uiMode: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  capabilities: {
    select: {
      id: true,
      pointOfSaleId: true,
      capability: true,
      enabled: true,
    },
    orderBy: {
      capability: 'asc',
    },
  },
} as const;

const cashRegisterSelect = {
  id: true,
  branchId: true,
  branch: {
    select: {
      name: true,
    },
  },
  operationalAreaId: true,
  operationalArea: {
    select: {
      name: true,
    },
  },
  pointOfSaleId: true,
  pointOfSale: {
    select: {
      name: true,
    },
  },
  code: true,
  name: true,
  active: true,
} as const;

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private pointResponse(
    point: PointRow,
  ): LocationPointOfSaleResponse {
    return {
      id: point.id,
      companyId: point.companyId,
      branchId: point.branchId,
      branchName: point.branch.name,
      code: point.code,
      name: point.name,
      description: point.description,
      uiMode: point.uiMode,
      active: point.active,
      createdAt: point.createdAt.toISOString(),
      updatedAt: point.updatedAt.toISOString(),
      capabilities: point.capabilities.map(
        (capability) => ({
          id: capability.id,
          pointOfSaleId:
            capability.pointOfSaleId,
          capability:
            capability.capability,
          enabled: capability.enabled,
        }),
      ),
    };
  }

  private cashRegisterResponse(
    register: CashRegisterRow,
  ): LocationCashRegisterResponse {
    return {
      id: register.id,
      branchId: register.branchId,
      branchName: register.branch.name,
      operationalAreaId:
        register.operationalAreaId,
      operationalAreaName:
        register.operationalArea?.name ?? null,
      pointOfSaleId:
        register.pointOfSaleId,
      pointOfSaleName:
        register.pointOfSale?.name ?? null,
      code: register.code,
      name: register.name,
      active: register.active,
    };
  }

  async points(
    companyId: string,
    branchId?: string,
  ): Promise<LocationPointOfSaleResponse[]> {
    if (branchId) {
      await this.requireBranch(
        branchId,
        companyId,
        false,
      );
    }

    const rows =
      await this.prisma.pointOfSale.findMany({
        where: {
          companyId,
          ...(branchId ? { branchId } : {}),
        },
        select: pointSelect,
        orderBy: [
          { active: 'desc' },
          { name: 'asc' },
          { code: 'asc' },
        ],
      });

    return rows.map((row) =>
      this.pointResponse(row),
    );
  }

  async point(
    id: string,
    companyId: string,
  ): Promise<LocationPointOfSaleResponse> {
    const row =
      await this.prisma.pointOfSale.findFirst({
        where: {
          id,
          companyId,
        },
        select: pointSelect,
      });

    if (!row) {
      throw new NotFoundException(
        'Punto de venta no encontrado.',
      );
    }

    return this.pointResponse(row);
  }

  async createPoint(
    dto: CreateLocationPointDto,
    actor: LocationActor,
  ): Promise<LocationPointOfSaleResponse> {
    const name = dto.name.trim();
    const code = this.normalizeCode(dto.code);
    const description =
      dto.description?.trim() || null;

    if (!name || !code) {
      throw new BadRequestException(
        'El nombre y el código son obligatorios.',
      );
    }

    const branch = await this.requireBranch(
      dto.branchId,
      actor.companyId,
      true,
    );

    const duplicate =
      await this.prisma.pointOfSale.findFirst({
        where: {
          branchId: branch.id,
          code,
        },
        select: {
          id: true,
        },
      });

    if (duplicate) {
      throw new BadRequestException(
        'Ya existe un punto de venta con ese código en la sucursal.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const point =
          await tx.pointOfSale.create({
            data: {
              companyId: actor.companyId,
              branchId: branch.id,
              code,
              name,
              description,
              uiMode: dto.uiMode ?? 'TOUCH',
              active: dto.active ?? true,
            },
            select: pointSelect,
          });

        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.userId,
            action: 'CREATE_POINT_OF_SALE',
            entityType: 'POINT_OF_SALE',
            entityId: point.id,
            reason: null,
            newValues: {
              branchId: point.branchId,
              branchName: point.branch.name,
              code: point.code,
              name: point.name,
              description: point.description,
              uiMode: point.uiMode,
              active: point.active,
            },
            ipAddress: actor.ipAddress,
          },
        });

        return this.pointResponse(point);
      },
    );
  }

  async updatePoint(
    id: string,
    dto: UpdateLocationPointDto,
    actor: LocationActor,
  ): Promise<LocationPointOfSaleResponse> {
    const existing =
      await this.prisma.pointOfSale.findFirst({
        where: {
          id,
          companyId: actor.companyId,
        },
        select: pointSelect,
      });

    if (!existing) {
      throw new NotFoundException(
        'Punto de venta no encontrado.',
      );
    }

    const branchId =
      dto.branchId ?? existing.branchId;

    if (branchId !== existing.branchId) {
      await this.requireBranch(
        branchId,
        actor.companyId,
        true,
      );

      const usage =
        await this.prisma.pointOfSale.findUnique({
          where: {
            id,
          },
          select: {
            _count: {
              select: {
                products: true,
                orderItems: true,
                movements: true,
                cashRegisters: true,
                accounts: true,
                inventoryMovements: true,
                supplierInvoices: true,
                supplierPayments: true,
                kitchenTickets: true,
              },
            },
          },
        });

      const hasOperations =
        usage !== null &&
        Object.values(usage._count).some(
          (count) => count > 0,
        );

      if (hasOperations) {
        throw new BadRequestException(
          'No se puede cambiar la sucursal porque el punto de venta tiene operaciones o registros relacionados.',
        );
      }
    }

    const name =
      dto.name !== undefined
        ? dto.name.trim()
        : existing.name;

    const code =
      dto.code !== undefined
        ? this.normalizeCode(dto.code)
        : existing.code;

    const description =
      dto.description !== undefined
        ? dto.description?.trim() || null
        : existing.description;

    const uiMode =
      dto.uiMode ?? existing.uiMode;

    const active =
      dto.active ?? existing.active;

    if (!name || !code) {
      throw new BadRequestException(
        'El nombre y el código son obligatorios.',
      );
    }

    if (
      code !== existing.code ||
      branchId !== existing.branchId
    ) {
      const duplicate =
        await this.prisma.pointOfSale.findFirst({
          where: {
            branchId,
            code,
            id: {
              not: id,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicate) {
        throw new BadRequestException(
          'Ya existe un punto de venta con ese código en la sucursal.',
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const point =
          await tx.pointOfSale.update({
            where: {
              id,
            },
            data: {
              branchId,
              code,
              name,
              description,
              uiMode,
              active,
            },
            select: pointSelect,
          });

        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.userId,
            action: 'UPDATE_POINT_OF_SALE',
            entityType: 'POINT_OF_SALE',
            entityId: point.id,
            reason: null,
            oldValues: {
              branchId: existing.branchId,
              code: existing.code,
              name: existing.name,
              description:
                existing.description,
              uiMode: existing.uiMode,
              active: existing.active,
            },
            newValues: {
              branchId: point.branchId,
              code: point.code,
              name: point.name,
              description: point.description,
              uiMode: point.uiMode,
              active: point.active,
            },
            ipAddress: actor.ipAddress,
          },
        });

        return this.pointResponse(point);
      },
    );
  }

  async cashRegisters(
    companyId: string,
    branchId?: string,
  ): Promise<LocationCashRegisterResponse[]> {
    if (branchId) {
      await this.requireBranch(
        branchId,
        companyId,
        false,
      );
    }

    const rows =
      await this.prisma.cashRegister.findMany({
        where: {
          branch: {
            companyId,
          },
          ...(branchId ? { branchId } : {}),
        },
        select: cashRegisterSelect,
        orderBy: [
          { active: 'desc' },
          { name: 'asc' },
          { code: 'asc' },
        ],
      });

    return rows.map((row) =>
      this.cashRegisterResponse(row),
    );
  }

  async cashRegister(
    id: string,
    companyId: string,
  ): Promise<LocationCashRegisterResponse> {
    const row =
      await this.prisma.cashRegister.findFirst({
        where: {
          id,
          branch: {
            companyId,
          },
        },
        select: cashRegisterSelect,
      });

    if (!row) {
      throw new NotFoundException(
        'Caja registradora no encontrada.',
      );
    }

    return this.cashRegisterResponse(row);
  }

  async createCashRegister(
    dto: CreateLocationCashRegisterDto,
    actor: LocationActor,
  ): Promise<LocationCashRegisterResponse> {
    const name = dto.name.trim();
    const code = this.normalizeCode(dto.code);

    if (!name || !code) {
      throw new BadRequestException(
        'El nombre y el código son obligatorios.',
      );
    }

    const branch = await this.requireBranch(
      dto.branchId,
      actor.companyId,
      true,
    );

    await this.validateAssociations(
      branch.id,
      actor.companyId,
      dto.pointOfSaleId ?? null,
      dto.operationalAreaId ?? null,
      dto.active ?? true,
    );

    const duplicate =
      await this.prisma.cashRegister.findFirst({
        where: {
          branchId: branch.id,
          code,
        },
        select: {
          id: true,
        },
      });

    if (duplicate) {
      throw new BadRequestException(
        'Ya existe una caja con ese código en la sucursal.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const register =
          await tx.cashRegister.create({
            data: {
              branchId: branch.id,
              operationalAreaId:
                dto.operationalAreaId ?? null,
              pointOfSaleId:
                dto.pointOfSaleId ?? null,
              code,
              name,
              active: dto.active ?? true,
            },
            select: cashRegisterSelect,
          });

        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.userId,
            action: 'CREATE_CASH_REGISTER',
            entityType: 'CASH_REGISTER',
            entityId: register.id,
            reason: null,
            newValues: {
              branchId: register.branchId,
              branchName:
                register.branch.name,
              operationalAreaId:
                register.operationalAreaId,
              operationalAreaName:
                register.operationalArea
                  ?.name ?? null,
              pointOfSaleId:
                register.pointOfSaleId,
              pointOfSaleName:
                register.pointOfSale
                  ?.name ?? null,
              code: register.code,
              name: register.name,
              active: register.active,
            },
            ipAddress: actor.ipAddress,
          },
        });

        return this.cashRegisterResponse(
          register,
        );
      },
    );
  }

  async updateCashRegister(
    id: string,
    dto: UpdateLocationCashRegisterDto,
    actor: LocationActor,
  ): Promise<LocationCashRegisterResponse> {
    const existing =
      await this.prisma.cashRegister.findFirst({
        where: {
          id,
          branch: {
            companyId: actor.companyId,
          },
        },
        select: cashRegisterSelect,
      });

    if (!existing) {
      throw new NotFoundException(
        'Caja registradora no encontrada.',
      );
    }

    const name =
      dto.name !== undefined
        ? dto.name.trim()
        : existing.name;

    const code =
      dto.code !== undefined
        ? this.normalizeCode(dto.code)
        : existing.code;

    const operationalAreaId =
      dto.operationalAreaId !== undefined
        ? dto.operationalAreaId
        : existing.operationalAreaId;

    const pointOfSaleId =
      dto.pointOfSaleId !== undefined
        ? dto.pointOfSaleId
        : existing.pointOfSaleId;

    const active =
      dto.active ?? existing.active;

    if (!name || !code) {
      throw new BadRequestException(
        'El nombre y el código son obligatorios.',
      );
    }

    await this.validateAssociations(
      existing.branchId,
      actor.companyId,
      pointOfSaleId,
      operationalAreaId,
      active,
    );

    if (code !== existing.code) {
      const duplicate =
        await this.prisma.cashRegister.findFirst({
          where: {
            branchId: existing.branchId,
            code,
            id: {
              not: id,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicate) {
        throw new BadRequestException(
          'Ya existe una caja con ese código en la sucursal.',
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const register =
          await tx.cashRegister.update({
            where: {
              id,
            },
            data: {
              operationalAreaId,
              pointOfSaleId,
              code,
              name,
              active,
            },
            select: cashRegisterSelect,
          });

        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.userId,
            action: 'UPDATE_CASH_REGISTER',
            entityType: 'CASH_REGISTER',
            entityId: register.id,
            reason: null,
            oldValues: {
              branchId: existing.branchId,
              operationalAreaId:
                existing.operationalAreaId,
              pointOfSaleId:
                existing.pointOfSaleId,
              code: existing.code,
              name: existing.name,
              active: existing.active,
            },
            newValues: {
              branchId: register.branchId,
              operationalAreaId:
                register.operationalAreaId,
              pointOfSaleId:
                register.pointOfSaleId,
              code: register.code,
              name: register.name,
              active: register.active,
            },
            ipAddress: actor.ipAddress,
          },
        });

        return this.cashRegisterResponse(
          register,
        );
      },
    );
  }

  private async requireBranch(
    branchId: string,
    companyId: string,
    requireActive: boolean,
  ): Promise<{
    id: string;
    name: string;
  }> {
    const branch =
      await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          companyId,
          ...(requireActive
            ? { active: true }
            : {}),
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!branch) {
      throw new BadRequestException(
        'La sucursal seleccionada no está disponible.',
      );
    }

    return branch;
  }

  private async validateAssociations(
    branchId: string,
    companyId: string,
    pointOfSaleId: string | null,
    operationalAreaId: string | null,
    requireActive: boolean,
  ): Promise<void> {
    if (pointOfSaleId) {
      const point =
        await this.prisma.pointOfSale.findFirst({
          where: {
            id: pointOfSaleId,
            branchId,
            companyId,
            ...(requireActive
              ? { active: true }
              : {}),
          },
          select: {
            id: true,
          },
        });

      if (!point) {
        throw new BadRequestException(
          'El punto de venta no pertenece a la sucursal o no está disponible.',
        );
      }
    }

    if (operationalAreaId) {
      const area =
        await this.prisma.operationalArea.findFirst({
          where: {
            id: operationalAreaId,
            branchId,
            companyId,
            ...(requireActive
              ? { active: true }
              : {}),
          },
          select: {
            id: true,
          },
        });

      if (!area) {
        throw new BadRequestException(
          'El área operativa no pertenece a la sucursal o no está disponible.',
        );
      }
    }
  }
}
