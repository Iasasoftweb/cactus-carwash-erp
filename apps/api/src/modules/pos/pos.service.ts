import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Prisma, PrismaService } from "@cactus/database";
import { ERP_PERMISSIONS } from "@cactus/shared";
import type {
  BranchModuleResponse,
  BusinessModuleType,
  CashRegisterResponse,
  CompanyModuleResponse,
  CreatePosMovementResponse,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PosAccountResponse,
  PosCapabilityResponse,
  PosCapabilityType,
  PosFinancialConfigurationResponse,
  PosDailySalesReportResponse,
  PosSalesTransactionsReportResponse,
  PosIssuedSalesDocumentDetailResponse,
  PosIssuedSalesDocumentListResponse,
  PosIssuedSalesDocumentSource,
  PosIssuedSalesDocumentVoidResponse,
  PosSalesComparisonResponse,
  PosSalesTrendResponse,
  PosProfitabilityReportResponse,
  PosProfitabilityTrendResponse,
  PosProfitabilityPolicyResponse,
  PosProfitabilityEvaluationResponse,
  PosProfitabilityAlertResponse,
  PosOperationalProfitabilityReportResponse,
  PosProfitabilityByPointReportResponse,
  PreparationStationResponse,
  ProductCategoryResponse,
  ProductResponse,
} from "@cactus/shared";
import { AddPosAccountItemsDto } from "./dto/add-pos-account-items.dto";
import { AssignProductToPointDto } from "./dto/assign-product-to-point.dto";
import { BulkAssignProductsToPointDto } from "./dto/bulk-assign-products-to-point.dto";
import { CreateDirectPosPaymentDto } from "./dto/create-direct-pos-payment.dto";
import { CreatePosMovementDto } from "./dto/create-pos-movement.dto";
import { OpenPosAccountDto } from "./dto/open-pos-account.dto";
import { PayPosAccountDto } from "./dto/pay-pos-account.dto";
import { UpdatePosAccountDto } from "./dto/update-pos-account.dto";
import { UpdatePosFinancialConfigurationDto } from "./dto/update-pos-financial-configuration.dto";
import { UpdatePosProfitabilityPolicyDto } from "./dto/update-pos-profitability-policy.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { CreatePreparationStationDto } from "./dto/create-preparation-station.dto";
import { UpdatePreparationStationDto } from "./dto/update-preparation-station.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import type {
  InventoryMovementResponse,
  InventoryKardexEntryResponse,
  InventoryTransferResponse,
  InventoryOverviewProductResponse,
} from "@cactus/shared";

import { CreateInventoryMovementDto } from "./dto/create-inventory-movement.dto";
import { CreateInventoryTransferDto } from "./dto/create-inventory-transfer.dto";

import type { Express } from "express";
import { randomUUID } from "node:crypto";

import { SendToKitchenDto } from "./dto/send-to-kitchen.dto";
import { UpdateKitchenTicketStatusDto } from "./dto/update-kitchen-ticket-status.dto";
import { UpdateKitchenTicketItemStatusDto } from "./dto/update-kitchen-ticket-item-status.dto";
import { CancelKitchenTicketItemDto } from "./dto/cancel-kitchen-ticket-item.dto";
import { CancelKitchenTicketDto } from "./dto/cancel-kitchen-ticket.dto";
import type {
  KitchenHistoryResponse,
  KitchenHistorySeriesPoint,
  KitchenHistoryStationResponse,
  KitchenMetricsResponse,
  KitchenStationMetricsResponse,
  KitchenTicketResponse,
  KitchenTicketStatusValue,
} from "./kitchen-ticket.types";

const accountInclude = {
  pointOfSale: true,
  cashRegister: true,
  paymentMethod: true,
  order: { select: { orderNumber: true } },
  items: {
    include: { product: true },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.PosAccountInclude;

type AccountWithRelations = Prisma.PosAccountGetPayload<{
  include: typeof accountInclude;
}>;

const kitchenTicketInclude = {
  pointOfSale: true,
  account: true,
  items: {
    include: {
      accountItem: {
        include: {
          product: {
            include: {
              preparationStation: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} satisfies Prisma.KitchenTicketInclude;

type KitchenTicketWithRelations = Prisma.KitchenTicketGetPayload<{
  include: typeof kitchenTicketInclude;
}>;

type PosBranchAccessActor = {
  userId: string;
  companyId: string;
  username: string;
  branchAccessMode: "ALL" | "ASSIGNED";
  branchIds: string[];
  permissions?: string[];
  ipAddress: string | null;
};

type PosBranchAccessContext = {
  companyId: string;
  branchAccessMode: "ALL" | "ASSIGNED";
  branchIds: string[];
  permissions?: string[];
};

const KITCHEN_TICKET_STATUSES = [
  "PENDING",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

const KITCHEN_TICKET_TRANSITIONS: Record<
  KitchenTicketStatusValue,
  readonly KitchenTicketStatusValue[]
> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const KITCHEN_TICKET_ITEM_TRANSITIONS: Record<
  KitchenTicketStatusValue,
  readonly KitchenTicketStatusValue[]
> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const KITCHEN_ACTIVE_STATUSES: KitchenTicketStatusValue[] = [
  "PENDING",
  "PREPARING",
  "READY",
];

const KITCHEN_METRICS_HISTORY_HOURS = 24;
const KITCHEN_OVERDUE_MINUTES = 20;

function durationMinutes(from: Date | null, to: Date | null): number | null {
  if (!from || !to) {
    return null;
  }

  return Math.max(0, (to.getTime() - from.getTime()) / 60_000);
}

function averageMinutes(values: Array<number | null>): number {
  const valid = values.filter((value): value is number => value !== null);

  if (valid.length === 0) {
    return 0;
  }

  const average = valid.reduce((sum, value) => sum + value, 0) / valid.length;

  return Math.round(average * 10) / 10;
}

function percentileMinutes(
  values: Array<number | null>,
  percentile: number,
): number {
  const valid = values
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (valid.length === 0) return 0;

  const index = Math.ceil(percentile * valid.length) - 1;
  const value = valid[Math.max(0, Math.min(index, valid.length - 1))];

  return Math.round(value * 10) / 10;
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

type PosSaleModeValue = "DINE_IN" | "TAKEAWAY" | "DIRECT";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function serviceChargeApplies(
  configuration: {
    serviceChargeEnabled: boolean;
    serviceChargeDineIn: boolean;
    serviceChargeTakeaway: boolean;
    serviceChargeDirect: boolean;
  } | null,
  saleMode: PosSaleModeValue,
): boolean {
  if (!configuration?.serviceChargeEnabled) {
    return false;
  }

  if (saleMode === "DINE_IN") {
    return configuration.serviceChargeDineIn;
  }

  if (saleMode === "TAKEAWAY") {
    return configuration.serviceChargeTakeaway;
  }

  return configuration.serviceChargeDirect;
}

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveSalePricing(
    tx: Prisma.TransactionClient,
    companyId: string,
    customerId?: string,
  ): Promise<{
    customerId: string | null;
    customerName: string | null;
    priceLevelId: string | null;
    priceLevelCode: string | null;
    priceLevelName: string | null;
  }> {
    const customer = customerId
      ? await tx.customer.findFirst({
          where: { id: customerId, companyId, active: true },
          select: {
            id: true,
            displayName: true,
            priceLevel: {
              select: { id: true, code: true, name: true, active: true },
            },
          },
        })
      : null;

    if (customerId && !customer) {
      throw new BadRequestException(
        "El cliente seleccionado no está disponible.",
      );
    }

    const assignedLevel =
      customer?.priceLevel?.active === true ? customer.priceLevel : null;
    const defaultLevel = assignedLevel
      ? null
      : await tx.priceLevel.findFirst({
          where: { companyId, isDefault: true, active: true },
          select: { id: true, code: true, name: true },
        });
    const level = assignedLevel ?? defaultLevel;

    return {
      customerId: customer?.id ?? null,
      customerName: customer?.displayName ?? null,
      priceLevelId: level?.id ?? null,
      priceLevelCode: level?.code ?? null,
      priceLevelName: level?.name ?? null,
    };
  }

  private branchWhere(access: PosBranchAccessContext): Prisma.BranchWhereInput {
    return {
      companyId: access.companyId,
      ...(access.branchAccessMode === "ASSIGNED"
        ? {
            id: {
              in: access.branchIds,
            },
          }
        : {}),
    };
  }

  private canManageAllCompanyBranches(
    access: PosBranchAccessContext,
  ): boolean {
    return (
      access.permissions?.includes(ERP_PERMISSIONS.companyManage) === true ||
      access.permissions?.includes(
        ERP_PERMISSIONS.businessConfigurationManage,
      ) === true
    );
  }

  private pointWhere(
    access: PosBranchAccessContext,
  ): Prisma.PointOfSaleWhereInput {
    return {
      companyId: access.companyId,
      ...(access.branchAccessMode === "ASSIGNED"
        ? {
            branchId: {
              in: access.branchIds,
            },
          }
        : {}),
    };
  }

  private assertBranchAccess(
    access: PosBranchAccessContext,
    branchId: string,
    message = "Recurso no encontrado.",
  ): void {
    if (
      access.branchAccessMode === "ASSIGNED" &&
      !access.branchIds.includes(branchId)
    ) {
      throw new NotFoundException(message);
    }
  }

  async companyModules(companyId: string): Promise<CompanyModuleResponse[]> {
    if (!companyId) {
      throw new BadRequestException("Debe indicar la empresa.");
    }

    const company = await this.prisma.company.findUnique({
      where: {
        id: companyId,
        active: true,
      },
    });

    if (!company) {
      throw new NotFoundException("Empresa no encontrada.");
    }

    const rows = await this.prisma.companyModule.findMany({
      where: { companyId },
      orderBy: { module: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      module: row.module,
      enabled: row.enabled,
    }));
  }

  async updateCompanyModule(
    companyId: string,
    module: BusinessModuleType,
    enabled: boolean,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<CompanyModuleResponse> {
    throw new ForbiddenException(
      "Los módulos contratados solo pueden modificarse desde la administración de la plataforma.",
    );

    /* istanbul ignore next -- compatibilidad temporal de firma */
    if (!companyId || companyId !== actor.companyId) {
      throw new NotFoundException("Empresa no encontrada.");
    }

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: {
          id: companyId,
          active: true,
        },
      });

      if (!company) {
        throw new NotFoundException("Empresa no encontrada.");
      }

      const previous = await tx.companyModule.findUnique({
        where: {
          companyId_module: {
            companyId,
            module,
          },
        },
      });

      const row = await tx.companyModule.upsert({
        where: {
          companyId_module: {
            companyId,
            module,
          },
        },
        create: {
          companyId,
          module,
          enabled,
        },
        update: {
          enabled,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_COMPANY_MODULE",
          entityType: "COMPANY_MODULE",
          entityId: row.id,
          reason: null,
          oldValues: previous
            ? {
                module: previous.module,
                enabled: previous.enabled,
              }
            : undefined,
          newValues: {
            module: row.module,
            enabled: row.enabled,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: row.id,
        companyId: row.companyId,
        module: row.module,
        enabled: row.enabled,
      };
    });
  }

  async branchModules(
    companyId: string,
    branchId?: string,
  ): Promise<BranchModuleResponse[]> {
    if (!companyId) {
      throw new BadRequestException("Debe indicar la empresa.");
    }

    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          companyId,
        },
        select: {
          id: true,
        },
      });

      if (!branch) {
        throw new NotFoundException("Sucursal no encontrada.");
      }
    }

    const rows = await this.prisma.branchModule.findMany({
      where: {
        companyId,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: [{ branchId: "asc" }, { module: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      branchId: row.branchId,
      module: row.module,
      enabled: row.enabled,
    }));
  }

  async updateBranchModule(
    branchId: string,
    module: BusinessModuleType,
    enabled: boolean,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<BranchModuleResponse> {
    if (!branchId) {
      throw new BadRequestException("Debe indicar la sucursal.");
    }

    if (
      ![
        "POS",
        "CAR_WASH",
        "INVENTORY",
        "PURCHASES",
        "ACCOUNTS_RECEIVABLE",
        "ACCOUNTS_PAYABLE",
        "EXPENSES",
      ].includes(module)
    ) {
      throw new BadRequestException("Módulo empresarial no válido.");
    }

    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: {
          id: branchId,
          companyId: actor.companyId,
          ...(enabled ? { active: true } : {}),
        },
      });

      if (!branch) {
        throw new NotFoundException(
          enabled
            ? "La sucursal no existe o está inactiva."
            : "Sucursal no encontrada.",
        );
      }

      if (enabled) {
        const companyModule = await tx.companyModule.findUnique({
          where: {
            companyId_module: {
              companyId: actor.companyId,
              module,
            },
          },
          select: {
            enabled: true,
          },
        });

        if (!companyModule?.enabled) {
          throw new BadRequestException(
            `El módulo ${module} no está habilitado para la empresa.`,
          );
        }
      }

      const previous = await tx.branchModule.findUnique({
        where: {
          branchId_module: {
            branchId,
            module,
          },
        },
      });

      const row = await tx.branchModule.upsert({
        where: {
          branchId_module: {
            branchId,
            module,
          },
        },
        create: {
          companyId: actor.companyId,
          branchId,
          module,
          enabled,
        },
        update: {
          enabled,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_BRANCH_MODULE",
          entityType: "BRANCH_MODULE",
          entityId: row.id,
          reason: null,
          oldValues: previous
            ? {
                module: previous.module,
                enabled: previous.enabled,
              }
            : undefined,
          newValues: {
            branchId,
            module: row.module,
            enabled: row.enabled,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: row.id,
        companyId: row.companyId,
        branchId: row.branchId,
        module: row.module,
        enabled: row.enabled,
      };
    });
  }

  async posCapabilities(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
  ): Promise<PosCapabilityResponse[]> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const canConfigureAllBranches =
      access.permissions?.includes(ERP_PERMISSIONS.companyManage) === true ||
      access.permissions?.includes(
        ERP_PERMISSIONS.businessConfigurationManage,
      ) === true;

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId: access.companyId,
        ...(!canConfigureAllBranches &&
        access.branchAccessMode === "ASSIGNED"
          ? {
              branchId: {
                in: access.branchIds,
              },
            }
          : {}),
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const rows = await this.prisma.posCapability.findMany({
      where: { pointOfSaleId },
      orderBy: { capability: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      pointOfSaleId: row.pointOfSaleId,
      capability: row.capability,
      enabled: row.enabled,
    }));
  }

  async updatePosCapability(
    pointOfSaleId: string,
    capability: PosCapabilityType,
    enabled: boolean,
    actor: PosBranchAccessActor,
  ): Promise<PosCapabilityResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    return this.prisma.$transaction(async (tx) => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: pointOfSaleId,
          companyId: actor.companyId,
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const previous = await tx.posCapability.findUnique({
        where: {
          pointOfSaleId_capability: {
            pointOfSaleId,
            capability,
          },
        },
      });

      const row = await tx.posCapability.upsert({
        where: {
          pointOfSaleId_capability: {
            pointOfSaleId,
            capability,
          },
        },
        create: {
          pointOfSaleId,
          capability,
          enabled,
        },
        update: {
          enabled,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_POS_CAPABILITY",
          entityType: "POS_CAPABILITY",
          entityId: row.id,
          reason: null,
          oldValues: previous
            ? {
                capability: previous.capability,
                enabled: previous.enabled,
              }
            : undefined,
          newValues: {
            pointOfSaleId,
            capability: row.capability,
            enabled: row.enabled,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: row.id,
        pointOfSaleId: row.pointOfSaleId,
        capability: row.capability,
        enabled: row.enabled,
      };
    });
  }

  async posProfitabilityPolicy(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
  ): Promise<PosProfitabilityPolicyResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const row = await this.prisma.posProfitabilityPolicy.findUnique({
      where: { pointOfSaleId },
    });

    if (!row) {
      return {
        id: null,
        pointOfSaleId,
        enabled: true,
        minimumGrossMarginPercent: 20,
        minimumCostCoveragePercent: 95,
        alertLowMarginEnabled: true,
        alertIncompleteCostEnabled: true,
      };
    }

    return {
      id: row.id,
      pointOfSaleId: row.pointOfSaleId,
      enabled: row.enabled,
      minimumGrossMarginPercent: Number(row.minimumGrossMarginPercent),
      minimumCostCoveragePercent: Number(row.minimumCostCoveragePercent),
      alertLowMarginEnabled: row.alertLowMarginEnabled,
      alertIncompleteCostEnabled: row.alertIncompleteCostEnabled,
    };
  }

  async updatePosProfitabilityPolicy(
    pointOfSaleId: string,
    dto: UpdatePosProfitabilityPolicyDto,
    actor: PosBranchAccessActor,
  ): Promise<PosProfitabilityPolicyResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    if (
      dto.minimumGrossMarginPercent < 0 ||
      dto.minimumGrossMarginPercent > 100
    ) {
      throw new BadRequestException(
        "El margen mínimo debe estar entre 0 y 100.",
      );
    }

    if (
      dto.minimumCostCoveragePercent < 0 ||
      dto.minimumCostCoveragePercent > 100
    ) {
      throw new BadRequestException(
        "La cobertura mínima de costo debe estar entre 0 y 100.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: pointOfSaleId,
          ...this.pointWhere(actor),
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const previous = await tx.posProfitabilityPolicy.findUnique({
        where: { pointOfSaleId },
      });

      const row = await tx.posProfitabilityPolicy.upsert({
        where: { pointOfSaleId },
        create: {
          pointOfSaleId,
          enabled: dto.enabled,
          minimumGrossMarginPercent: dto.minimumGrossMarginPercent,
          minimumCostCoveragePercent: dto.minimumCostCoveragePercent,
          alertLowMarginEnabled: dto.alertLowMarginEnabled,
          alertIncompleteCostEnabled: dto.alertIncompleteCostEnabled,
        },
        update: {
          enabled: dto.enabled,
          minimumGrossMarginPercent: dto.minimumGrossMarginPercent,
          minimumCostCoveragePercent: dto.minimumCostCoveragePercent,
          alertLowMarginEnabled: dto.alertLowMarginEnabled,
          alertIncompleteCostEnabled: dto.alertIncompleteCostEnabled,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_POS_PROFITABILITY_POLICY",
          entityType: "POS_PROFITABILITY_POLICY",
          entityId: row.id,
          reason: null,
          oldValues: previous
            ? {
                enabled: previous.enabled,
                minimumGrossMarginPercent: Number(
                  previous.minimumGrossMarginPercent,
                ),
                minimumCostCoveragePercent: Number(
                  previous.minimumCostCoveragePercent,
                ),
                alertLowMarginEnabled: previous.alertLowMarginEnabled,
                alertIncompleteCostEnabled: previous.alertIncompleteCostEnabled,
              }
            : undefined,
          newValues: {
            pointOfSaleId,
            enabled: row.enabled,
            minimumGrossMarginPercent: Number(row.minimumGrossMarginPercent),
            minimumCostCoveragePercent: Number(row.minimumCostCoveragePercent),
            alertLowMarginEnabled: row.alertLowMarginEnabled,
            alertIncompleteCostEnabled: row.alertIncompleteCostEnabled,
            updatedBy: actor.username,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: row.id,
        pointOfSaleId: row.pointOfSaleId,
        enabled: row.enabled,
        minimumGrossMarginPercent: Number(row.minimumGrossMarginPercent),
        minimumCostCoveragePercent: Number(row.minimumCostCoveragePercent),
        alertLowMarginEnabled: row.alertLowMarginEnabled,
        alertIncompleteCostEnabled: row.alertIncompleteCostEnabled,
      };
    });
  }

  async posFinancialConfiguration(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
  ): Promise<PosFinancialConfigurationResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const row = await this.prisma.posFinancialConfiguration.findUnique({
      where: { pointOfSaleId },
    });

    if (!row) {
      return {
        id: null,
        pointOfSaleId,
        taxesEnabled: false,
        serviceChargeEnabled: false,
        serviceChargeRate: 0,
        serviceChargeDineIn: true,
        serviceChargeTakeaway: false,
        serviceChargeDirect: false,
        ticketPrintMode: "PREVIEW" as const,
      };
    }

    return {
      id: row.id,
      pointOfSaleId: row.pointOfSaleId,
      taxesEnabled: row.taxesEnabled,
      serviceChargeEnabled: row.serviceChargeEnabled,
      serviceChargeRate: Number(row.serviceChargeRate),
      serviceChargeDineIn: row.serviceChargeDineIn,
      serviceChargeTakeaway: row.serviceChargeTakeaway,
      serviceChargeDirect: row.serviceChargeDirect,
      ticketPrintMode: row.ticketPrintMode as "DIRECT" | "PREVIEW",
    };
  }

  async updatePosFinancialConfiguration(
    pointOfSaleId: string,
    dto: UpdatePosFinancialConfigurationDto,
    actor: PosBranchAccessActor,
  ): Promise<PosFinancialConfigurationResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    if (dto.serviceChargeEnabled && dto.serviceChargeRate <= 0) {
      throw new BadRequestException(
        "El cargo por servicio habilitado debe tener una tasa mayor que cero.",
      );
    }

    if (
      dto.serviceChargeEnabled &&
      !dto.serviceChargeDineIn &&
      !dto.serviceChargeTakeaway &&
      !dto.serviceChargeDirect
    ) {
      throw new BadRequestException(
        "Selecciona al menos una modalidad para aplicar el cargo por servicio.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: pointOfSaleId,
          ...this.pointWhere(actor),
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const previous = await tx.posFinancialConfiguration.findUnique({
        where: { pointOfSaleId },
      });

      const row = await tx.posFinancialConfiguration.upsert({
        where: { pointOfSaleId },
        create: {
          pointOfSaleId,
          taxesEnabled: dto.taxesEnabled,
          serviceChargeEnabled: dto.serviceChargeEnabled,
          serviceChargeRate: dto.serviceChargeRate,
          serviceChargeDineIn: dto.serviceChargeDineIn,
          serviceChargeTakeaway: dto.serviceChargeTakeaway,
          serviceChargeDirect: dto.serviceChargeDirect,
          ticketPrintMode: dto.ticketPrintMode,
        },
        update: {
          taxesEnabled: dto.taxesEnabled,
          serviceChargeEnabled: dto.serviceChargeEnabled,
          serviceChargeRate: dto.serviceChargeRate,
          serviceChargeDineIn: dto.serviceChargeDineIn,
          serviceChargeTakeaway: dto.serviceChargeTakeaway,
          serviceChargeDirect: dto.serviceChargeDirect,
          ticketPrintMode: dto.ticketPrintMode,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_POS_FINANCIAL_CONFIGURATION",
          entityType: "POS_FINANCIAL_CONFIGURATION",
          entityId: row.id,
          reason: null,
          oldValues: previous
            ? {
                taxesEnabled: previous.taxesEnabled,
                serviceChargeEnabled: previous.serviceChargeEnabled,
                serviceChargeRate: Number(previous.serviceChargeRate),
                serviceChargeDineIn: previous.serviceChargeDineIn,
                serviceChargeTakeaway: previous.serviceChargeTakeaway,
                serviceChargeDirect: previous.serviceChargeDirect,
                ticketPrintMode: previous.ticketPrintMode,
              }
            : undefined,
          newValues: {
            pointOfSaleId,
            taxesEnabled: row.taxesEnabled,
            serviceChargeEnabled: row.serviceChargeEnabled,
            serviceChargeRate: Number(row.serviceChargeRate),
            serviceChargeDineIn: row.serviceChargeDineIn,
            serviceChargeTakeaway: row.serviceChargeTakeaway,
            serviceChargeDirect: row.serviceChargeDirect,
            ticketPrintMode: row.ticketPrintMode,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: row.id,
        pointOfSaleId: row.pointOfSaleId,
        taxesEnabled: row.taxesEnabled,
        serviceChargeEnabled: row.serviceChargeEnabled,
        serviceChargeRate: Number(row.serviceChargeRate),
        serviceChargeDineIn: row.serviceChargeDineIn,
        serviceChargeTakeaway: row.serviceChargeTakeaway,
        serviceChargeDirect: row.serviceChargeDirect,
        ticketPrintMode: row.ticketPrintMode as "DIRECT" | "PREVIEW",
      };
    });
  }

  async profitabilityByPoint(
    pointOfSaleIds: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosProfitabilityByPointReportResponse> {
    const ids = [
      ...new Set(
        (pointOfSaleIds ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];

    if (ids.length === 0) {
      throw new BadRequestException("Debe indicar al menos un punto de venta.");
    }

    if (ids.length > 50) {
      throw new BadRequestException(
        "La comparación admite un máximo de 50 puntos de venta.",
      );
    }

    const points = await this.prisma.pointOfSale.findMany({
      where: {
        ...this.pointWhere(access),
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (points.length !== ids.length) {
      throw new NotFoundException(
        "Uno o más puntos de venta no fueron encontrados.",
      );
    }

    const reports = await Promise.all(
      points.map((point) =>
        this.profitabilityReport(point.id, access, dateFrom, dateTo),
      ),
    );

    const salesReports = await Promise.all(
      points.map((point) =>
        this.dailySalesReport(point.id, access, dateFrom, dateTo),
      ),
    );

    const salesByPoint = new Map(
      salesReports.map((report) => [report.pointOfSaleId, report]),
    );

    const byPoint = reports
      .map((report) => {
        const sales = salesByPoint.get(report.pointOfSaleId);

        const salesCount = sales?.salesCount ?? 0;

        return {
          pointOfSaleId: report.pointOfSaleId,
          pointOfSaleName: report.pointOfSaleName,
          salesCount,
          averageTicket:
            salesCount > 0
              ? roundMoney(report.summary.netRevenue / salesCount)
              : 0,
          ...report.summary,
        };
      })
      .sort(
        (a, b) =>
          b.grossMargin - a.grossMargin ||
          b.netRevenue - a.netRevenue ||
          a.pointOfSaleName.localeCompare(b.pointOfSaleName),
      );

    const summaryRows = byPoint.map((row) => ({
      netRevenue: row.netRevenue,
      marginBasisRevenue: row.marginBasisRevenue,
      costOfGoodsSold: row.costOfGoodsSold,
      grossMargin: row.grossMargin,
      unknownCostRevenue: row.unknownCostRevenue,
      knownCostLines: row.knownCostLines,
      unknownCostLines: row.unknownCostLines,
      salesCount: row.salesCount,
    }));

    const netRevenue = roundMoney(
      summaryRows.reduce((sum, row) => sum + row.netRevenue, 0),
    );

    const marginBasisRevenue = roundMoney(
      summaryRows.reduce((sum, row) => sum + row.marginBasisRevenue, 0),
    );

    const costOfGoodsSold = roundMoney(
      summaryRows.reduce((sum, row) => sum + row.costOfGoodsSold, 0),
    );

    const grossMargin = roundMoney(marginBasisRevenue - costOfGoodsSold);

    const unknownCostRevenue = roundMoney(
      summaryRows.reduce((sum, row) => sum + row.unknownCostRevenue, 0),
    );

    const knownCostLines = summaryRows.reduce(
      (sum, row) => sum + row.knownCostLines,
      0,
    );

    const unknownCostLines = summaryRows.reduce(
      (sum, row) => sum + row.unknownCostLines,
      0,
    );

    const salesCount = summaryRows.reduce(
      (sum, row) => sum + row.salesCount,
      0,
    );

    const grossMarginPercent =
      marginBasisRevenue > 0
        ? Math.round((grossMargin / marginBasisRevenue) * 1000) / 10
        : null;

    const costCoveragePercent =
      netRevenue > 0
        ? Math.round((marginBasisRevenue / netRevenue) * 1000) / 10
        : 100;

    const costCoverageStatus =
      netRevenue === 0 || unknownCostLines === 0
        ? ("COMPLETE" as const)
        : knownCostLines === 0
          ? ("NO_COST_DATA" as const)
          : ("PARTIAL" as const);

    const firstReport = reports[0];

    return {
      dateFrom: firstReport.dateFrom,
      dateTo: firstReport.dateTo,
      generatedAt: new Date().toISOString(),
      pointsCount: byPoint.length,
      summary: {
        salesCount,
        averageTicket: salesCount > 0 ? roundMoney(netRevenue / salesCount) : 0,
        netRevenue,
        marginBasisRevenue,
        costOfGoodsSold,
        grossMargin,
        grossMarginPercent,
        unknownCostRevenue,
        knownCostLines,
        unknownCostLines,
        costCoveragePercent,
        costCoverageStatus,
      },
      byPoint,
    };
  }

  async operationalProfitability(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosOperationalProfitabilityReportResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const parseDate = (value: string | undefined, endOfDay: boolean): Date => {
      if (!value) {
        const now = new Date();
        now.setHours(
          endOfDay ? 23 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 999 : 0,
        );
        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const result = new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const formatDate = (value: Date): string =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(value.getDate()).padStart(2, "0")}`;

    const from = parseDate(dateFrom, false);
    const to = parseDate(dateTo ?? dateFrom, true);

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const [directSales, accountSales] = await Promise.all([
      this.prisma.posMovement.findMany({
        where: {
          pointOfSaleId,
          type: "DIRECT_SALE",
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              unitPrice: true,
              unitCost: true,
              costTotal: true,
              product: {
                select: {
                  sku: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.posAccount.findMany({
        where: {
          pointOfSaleId,
          status: "PAID",
          paidAt: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              unitPrice: true,
              unitCost: true,
              costTotal: true,
              product: {
                select: {
                  sku: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const saleVoids = await this.prisma.posSaleVoid.findMany({
      where: {
        companyId: access.companyId,
        pointOfSaleId,
        OR: [
          ...(directSales.length > 0
            ? [
                {
                  sourceType: "POS_DIRECT",
                  sourceId: {
                    in: directSales.map((sale) => sale.id),
                  },
                },
              ]
            : []),
          ...(accountSales.length > 0
            ? [
                {
                  sourceType: "POS_ACCOUNT",
                  sourceId: {
                    in: accountSales.map((sale) => sale.id),
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        sourceType: true,
        sourceId: true,
      },
    });

    const voidedSourceKeys = new Set(
      saleVoids.map(
        (saleVoid) =>
          `${saleVoid.sourceType}:${saleVoid.sourceId}`,
      ),
    );

    const validDirectSales = directSales.filter(
      (sale) =>
        !voidedSourceKeys.has(`POS_DIRECT:${sale.id}`),
    );

    const validAccountSales = accountSales.filter(
      (sale) =>
        !voidedSourceKeys.has(`POS_ACCOUNT:${sale.id}`),
    );

    const directIds = validDirectSales.map((sale) => sale.id);
    const accountIds = validAccountSales.map((sale) => sale.id);

    const paymentOr: Prisma.PaymentWhereInput[] = [];

    if (directIds.length > 0) {
      paymentOr.push({
        sourceType: "POS_DIRECT",
        sourceId: {
          in: directIds,
        },
      });
    }

    if (accountIds.length > 0) {
      paymentOr.push({
        sourceType: "POS_ACCOUNT",
        sourceId: {
          in: accountIds,
        },
      });
    }

    const payments =
      paymentOr.length > 0
        ? await this.prisma.payment.findMany({
            where: {
              OR: paymentOr,
            },
            select: {
              sourceType: true,
              sourceId: true,
              cashSessionId: true,
            },
          })
        : [];

    const cashSessionIds = [
      ...new Set(
        payments
          .map((payment) => payment.cashSessionId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const sessions =
      cashSessionIds.length > 0
        ? await this.prisma.cashSession.findMany({
            where: {
              id: {
                in: cashSessionIds,
              },
            },
            select: {
              id: true,
              cashRegisterId: true,
              employeeId: true,
              status: true,
              openedAt: true,
              closedAt: true,
            },
          })
        : [];

    const employeeIds = [
      ...new Set(sessions.map((session) => session.employeeId)),
    ];

    const registerIds = [
      ...new Set(sessions.map((session) => session.cashRegisterId)),
    ];

    const [employees, registers] = await Promise.all([
      employeeIds.length > 0
        ? this.prisma.employee.findMany({
            where: {
              id: {
                in: employeeIds,
              },
            },
            select: {
              id: true,
              employeeNo: true,
              fullName: true,
            },
          })
        : [],

      registerIds.length > 0
        ? this.prisma.cashRegister.findMany({
            where: {
              id: {
                in: registerIds,
              },
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [],
    ]);

    const employeeMap = new Map(
      employees.map((employee) => [employee.id, employee]),
    );

    const registerMap = new Map(
      registers.map((register) => [register.id, register]),
    );

    const sessionMap = new Map(
      sessions.map((session) => [session.id, session]),
    );

    const sourceSessionMap = new Map<string, string>();

    for (const payment of payments) {
      if (!payment.sourceType || !payment.sourceId || !payment.cashSessionId) {
        continue;
      }

      const key = `${payment.sourceType}:${payment.sourceId}`;

      if (!sourceSessionMap.has(key)) {
        sourceSessionMap.set(key, payment.cashSessionId);
      }
    }

    type Line = {
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      netRevenue: number;
      costTotal: number | null;
    };

    type Sale = {
      sourceKey: string;
      lines: Line[];
    };

    const sales: Sale[] = [
      ...validDirectSales.map((sale) => ({
        sourceKey: `POS_DIRECT:${sale.id}`,
        lines: sale.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: Number(item.quantity),
          netRevenue: roundMoney(
            Number(item.quantity) * Number(item.unitPrice),
          ),
          costTotal:
            item.unitCost === null || item.costTotal === null
              ? null
              : Number(item.costTotal),
        })),
      })),

      ...validAccountSales.map((sale) => ({
        sourceKey: `POS_ACCOUNT:${sale.id}`,
        lines: sale.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: Number(item.quantity),
          netRevenue: roundMoney(
            Number(item.quantity) * Number(item.unitPrice),
          ),
          costTotal:
            item.unitCost === null || item.costTotal === null
              ? null
              : Number(item.costTotal),
        })),
      })),
    ];

    const buildMetrics = (groupedSales: Sale[]) => {
      const rows = groupedSales.flatMap((sale) => sale.lines);

      const knownRows = rows.filter((row) => row.costTotal !== null);

      const unknownRows = rows.filter((row) => row.costTotal === null);

      const netRevenue = roundMoney(
        rows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const marginBasisRevenue = roundMoney(
        knownRows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const costOfGoodsSold = roundMoney(
        knownRows.reduce((sum, row) => sum + (row.costTotal ?? 0), 0),
      );

      const grossMargin = roundMoney(marginBasisRevenue - costOfGoodsSold);

      const unknownCostRevenue = roundMoney(
        unknownRows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const grossMarginPercent =
        marginBasisRevenue > 0
          ? Math.round((grossMargin / marginBasisRevenue) * 1000) / 10
          : null;

      const costCoveragePercent =
        netRevenue > 0
          ? Math.round((marginBasisRevenue / netRevenue) * 1000) / 10
          : 100;

      const costCoverageStatus =
        rows.length === 0 || unknownRows.length === 0
          ? ("COMPLETE" as const)
          : knownRows.length === 0
            ? ("NO_COST_DATA" as const)
            : ("PARTIAL" as const);

      return {
        salesCount: groupedSales.length,
        netRevenue,
        marginBasisRevenue,
        costOfGoodsSold,
        grossMargin,
        grossMarginPercent,
        unknownCostRevenue,
        knownCostLines: knownRows.length,
        unknownCostLines: unknownRows.length,
        costCoveragePercent,
        costCoverageStatus,
      };
    };

    const buildProductMetrics = (groupedSales: Sale[]) => {
      const productMap = new Map<
        string,
        {
          productId: string;
          productName: string;
          sku: string;
          quantity: number;
          netRevenue: number;
          costOfGoodsSold: number;
          hasUnknownCost: boolean;
        }
      >();

      for (const sale of groupedSales) {
        for (const line of sale.lines) {
          const current = productMap.get(line.productId);

          if (current) {
            current.quantity += line.quantity;
            current.netRevenue += line.netRevenue;

            if (line.costTotal === null) {
              current.hasUnknownCost = true;
            } else {
              current.costOfGoodsSold += line.costTotal;
            }
          } else {
            productMap.set(line.productId, {
              productId: line.productId,
              productName: line.productName,
              sku: line.sku,
              quantity: line.quantity,
              netRevenue: line.netRevenue,
              costOfGoodsSold: line.costTotal ?? 0,
              hasUnknownCost: line.costTotal === null,
            });
          }
        }
      }

      return [...productMap.values()]
        .map((row) => {
          const netRevenue = roundMoney(row.netRevenue);
          const costOfGoodsSold = roundMoney(row.costOfGoodsSold);
          const grossMargin = row.hasUnknownCost
            ? null
            : roundMoney(netRevenue - costOfGoodsSold);

          return {
            productId: row.productId,
            productName: row.productName,
            sku: row.sku,
            quantity: Math.round(row.quantity * 1000) / 1000,
            netRevenue,
            costOfGoodsSold: row.hasUnknownCost ? null : costOfGoodsSold,
            grossMargin,
            grossMarginPercent:
              grossMargin !== null && netRevenue > 0
                ? Math.round((grossMargin / netRevenue) * 1000) / 10
                : null,
          };
        })
        .sort(
          (a, b) =>
            b.netRevenue - a.netRevenue ||
            a.productName.localeCompare(b.productName),
        );
    };

    const salesBySession = new Map<string, Sale[]>();

    let unattributedSalesCount = 0;

    for (const sale of sales) {
      const cashSessionId = sourceSessionMap.get(sale.sourceKey);

      if (!cashSessionId) {
        unattributedSalesCount += 1;
        continue;
      }

      const current = salesBySession.get(cashSessionId);

      if (current) {
        current.push(sale);
      } else {
        salesBySession.set(cashSessionId, [sale]);
      }
    }

    const byShift = [...salesBySession.entries()]
      .map(([cashSessionId, groupedSales]) => {
        const session = sessionMap.get(cashSessionId);

        if (!session) {
          return null;
        }

        const employee = employeeMap.get(session.employeeId);

        const register = registerMap.get(session.cashRegisterId);

        if (!employee || !register) {
          return null;
        }

        return {
          cashSessionId,
          cashRegisterId: session.cashRegisterId,
          cashRegisterName: register.name,
          employeeId: employee.id,
          employeeNo: employee.employeeNo,
          employeeName: employee.fullName,
          openedAt: session.openedAt.toISOString(),
          closedAt: session.closedAt?.toISOString() ?? null,
          status: session.status,
          items: buildProductMetrics(groupedSales),
          ...buildMetrics(groupedSales),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(
        (a, b) => b.grossMargin - a.grossMargin || b.netRevenue - a.netRevenue,
      );

    const employeeSessionMap = new Map<
      string,
      {
        employeeId: string;
        employeeNo: string;
        employeeName: string;
        sessionIds: Set<string>;
        sales: Sale[];
      }
    >();

    for (const [cashSessionId, groupedSales] of salesBySession.entries()) {
      const session = sessionMap.get(cashSessionId);

      if (!session) {
        continue;
      }

      const employee = employeeMap.get(session.employeeId);

      if (!employee) {
        continue;
      }

      const current = employeeSessionMap.get(employee.id);

      if (current) {
        current.sessionIds.add(cashSessionId);
        current.sales.push(...groupedSales);
      } else {
        employeeSessionMap.set(employee.id, {
          employeeId: employee.id,
          employeeNo: employee.employeeNo,
          employeeName: employee.fullName,
          sessionIds: new Set([cashSessionId]),
          sales: [...groupedSales],
        });
      }
    }

    const byEmployee = [...employeeSessionMap.values()]
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeNo: employee.employeeNo,
        employeeName: employee.employeeName,
        sessionsCount: employee.sessionIds.size,
        ...buildMetrics(employee.sales),
      }))
      .sort(
        (a, b) =>
          b.grossMargin - a.grossMargin ||
          b.netRevenue - a.netRevenue ||
          a.employeeName.localeCompare(b.employeeName),
      );

    return {
      pointOfSaleId: point.id,
      pointOfSaleName: point.name,
      dateFrom: formatDate(from),
      dateTo: formatDate(to),
      generatedAt: new Date().toISOString(),
      attributionBasis: "PAYMENT_CASH_SESSION",
      unattributedSalesCount,
      byEmployee,
      byShift,
    };
  }

  async profitabilityEvaluation(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosProfitabilityEvaluationResponse> {
    const [policy, profitability, trend] = await Promise.all([
      this.posProfitabilityPolicy(pointOfSaleId, access),
      this.profitabilityReport(pointOfSaleId, access, dateFrom, dateTo),
      this.profitabilityTrend(pointOfSaleId, access, dateFrom, dateTo),
    ]);

    const alerts: PosProfitabilityAlertResponse[] = [];

    if (!policy.enabled) {
      return {
        pointOfSaleId: profitability.pointOfSaleId,
        pointOfSaleName: profitability.pointOfSaleName,
        dateFrom: profitability.dateFrom,
        dateTo: profitability.dateTo,
        generatedAt: new Date().toISOString(),
        policy,
        alerts,
        summary: {
          totalAlerts: 0,
          lowMarginAlerts: 0,
          incompleteCostAlerts: 0,
          affectedProducts: 0,
          affectedCategories: 0,
          affectedDays: 0,
        },
      };
    }

    const addLowMarginAlert = (
      scope: "SUMMARY" | "PRODUCT" | "CATEGORY" | "DAY",
      entityId: string | null,
      entityName: string,
      date: string | null,
      grossMarginPercent: number | null,
      marginBasisRevenue: number,
    ): void => {
      if (
        !policy.alertLowMarginEnabled ||
        grossMarginPercent === null ||
        marginBasisRevenue <= 0 ||
        grossMarginPercent >= policy.minimumGrossMarginPercent
      ) {
        return;
      }

      alerts.push({
        type: "LOW_MARGIN",
        scope,
        entityId,
        entityName,
        date,
        actualValue: grossMarginPercent,
        thresholdValue: policy.minimumGrossMarginPercent,
        message:
          `Margen ${grossMarginPercent.toFixed(1)}% por debajo del mínimo ` +
          `${policy.minimumGrossMarginPercent.toFixed(1)}%.`,
      });
    };

    const addIncompleteCostAlert = (
      scope: "SUMMARY" | "PRODUCT" | "CATEGORY" | "DAY",
      entityId: string | null,
      entityName: string,
      date: string | null,
      costCoveragePercent: number,
      netRevenue: number,
    ): void => {
      if (
        !policy.alertIncompleteCostEnabled ||
        netRevenue <= 0 ||
        costCoveragePercent >= policy.minimumCostCoveragePercent
      ) {
        return;
      }

      alerts.push({
        type: "INCOMPLETE_COST",
        scope,
        entityId,
        entityName,
        date,
        actualValue: costCoveragePercent,
        thresholdValue: policy.minimumCostCoveragePercent,
        message:
          `Cobertura ${costCoveragePercent.toFixed(1)}% por debajo del mínimo ` +
          `${policy.minimumCostCoveragePercent.toFixed(1)}%.`,
      });
    };

    addLowMarginAlert(
      "SUMMARY",
      null,
      "Período",
      null,
      profitability.summary.grossMarginPercent,
      profitability.summary.marginBasisRevenue,
    );

    addIncompleteCostAlert(
      "SUMMARY",
      null,
      "Período",
      null,
      profitability.summary.costCoveragePercent,
      profitability.summary.netRevenue,
    );

    for (const product of profitability.byProduct) {
      addLowMarginAlert(
        "PRODUCT",
        product.productId,
        product.productName,
        null,
        product.grossMarginPercent,
        product.marginBasisRevenue,
      );

      addIncompleteCostAlert(
        "PRODUCT",
        product.productId,
        product.productName,
        null,
        product.costCoveragePercent,
        product.netRevenue,
      );
    }

    for (const category of profitability.byCategory) {
      addLowMarginAlert(
        "CATEGORY",
        category.categoryId,
        category.categoryName,
        null,
        category.grossMarginPercent,
        category.marginBasisRevenue,
      );

      addIncompleteCostAlert(
        "CATEGORY",
        category.categoryId,
        category.categoryName,
        null,
        category.costCoveragePercent,
        category.netRevenue,
      );
    }

    for (const day of trend.byDay) {
      addLowMarginAlert(
        "DAY",
        null,
        day.date,
        day.date,
        day.grossMarginPercent,
        day.marginBasisRevenue,
      );

      addIncompleteCostAlert(
        "DAY",
        null,
        day.date,
        day.date,
        day.costCoveragePercent,
        day.netRevenue,
      );
    }

    const productIds = new Set(
      alerts
        .filter((alert) => alert.scope === "PRODUCT" && alert.entityId)
        .map((alert) => alert.entityId as string),
    );

    const categoryIds = new Set(
      alerts
        .filter((alert) => alert.scope === "CATEGORY" && alert.entityId)
        .map((alert) => alert.entityId as string),
    );

    const affectedDays = new Set(
      alerts
        .filter((alert) => alert.scope === "DAY" && alert.date)
        .map((alert) => alert.date as string),
    );

    alerts.sort((a, b) => {
      const scopeOrder = {
        SUMMARY: 0,
        DAY: 1,
        CATEGORY: 2,
        PRODUCT: 3,
      };

      const typeOrder = {
        INCOMPLETE_COST: 0,
        LOW_MARGIN: 1,
      };

      return (
        scopeOrder[a.scope] - scopeOrder[b.scope] ||
        typeOrder[a.type] - typeOrder[b.type] ||
        a.entityName.localeCompare(b.entityName)
      );
    });

    return {
      pointOfSaleId: profitability.pointOfSaleId,
      pointOfSaleName: profitability.pointOfSaleName,
      dateFrom: profitability.dateFrom,
      dateTo: profitability.dateTo,
      generatedAt: new Date().toISOString(),
      policy,
      alerts,
      summary: {
        totalAlerts: alerts.length,
        lowMarginAlerts: alerts.filter((alert) => alert.type === "LOW_MARGIN")
          .length,
        incompleteCostAlerts: alerts.filter(
          (alert) => alert.type === "INCOMPLETE_COST",
        ).length,
        affectedProducts: productIds.size,
        affectedCategories: categoryIds.size,
        affectedDays: affectedDays.size,
      },
    };
  }

  async profitabilityTrend(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosProfitabilityTrendResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const parseDate = (value: string | undefined, endOfDay: boolean): Date => {
      if (!value) {
        const now = new Date();

        now.setHours(
          endOfDay ? 23 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 999 : 0,
        );

        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const result = new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const formatDate = (value: Date): string =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(value.getDate()).padStart(2, "0")}`;

    const from = parseDate(dateFrom, false);
    const to = parseDate(dateTo ?? dateFrom, true);

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const dates: string[] = [];
    const cursor = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
    );

    const endCursor = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    while (cursor <= endCursor) {
      dates.push(formatDate(cursor));

      if (dates.length > 366) {
        throw new BadRequestException(
          "La tendencia de rentabilidad admite un máximo de 366 días.",
        );
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    const saleVoids = await this.prisma.posSaleVoid.findMany({
      where: {
        companyId: access.companyId,
        pointOfSaleId,
        OR: [
          {
            sourceType: "POS_DIRECT",
          },
          {
            sourceType: "POS_ACCOUNT",
          },
        ],
      },
      select: {
        sourceType: true,
        sourceId: true,
      },
    });

    const voidedDirectIds = saleVoids
      .filter((saleVoid) => saleVoid.sourceType === "POS_DIRECT")
      .map((saleVoid) => saleVoid.sourceId);

    const voidedAccountIds = saleVoids
      .filter((saleVoid) => saleVoid.sourceType === "POS_ACCOUNT")
      .map((saleVoid) => saleVoid.sourceId);

    const [directItems, accountItems] = await Promise.all([
      this.prisma.posMovementItem.findMany({
        where: {
          movement: {
            pointOfSaleId,
            type: "DIRECT_SALE",
            ...(voidedDirectIds.length > 0
              ? {
                  id: {
                    notIn: voidedDirectIds,
                  },
                }
              : {}),
            createdAt: {
              gte: from,
              lte: to,
            },
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          unitCost: true,
          costTotal: true,
          movement: {
            select: {
              createdAt: true,
            },
          },
        },
      }),

      this.prisma.posAccountItem.findMany({
        where: {
          account: {
            pointOfSaleId,
            status: "PAID",
            ...(voidedAccountIds.length > 0
              ? {
                  id: {
                    notIn: voidedAccountIds,
                  },
                }
              : {}),
            paidAt: {
              gte: from,
              lte: to,
            },
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          unitCost: true,
          costTotal: true,
          account: {
            select: {
              paidAt: true,
            },
          },
        },
      }),
    ]);

    type TrendLine = {
      date: string;
      netRevenue: number;
      costTotal: number | null;
    };

    const lines: TrendLine[] = [
      ...directItems.map((item) => ({
        date: formatDate(item.movement.createdAt),
        netRevenue: roundMoney(Number(item.quantity) * Number(item.unitPrice)),
        costTotal:
          item.unitCost === null || item.costTotal === null
            ? null
            : Number(item.costTotal),
      })),

      ...accountItems.map((item) => {
        if (!item.account.paidAt) {
          throw new InternalServerErrorException(
            "Se encontró una cuenta pagada sin fecha de pago.",
          );
        }

        return {
          date: formatDate(item.account.paidAt),
          netRevenue: roundMoney(
            Number(item.quantity) * Number(item.unitPrice),
          ),
          costTotal:
            item.unitCost === null || item.costTotal === null
              ? null
              : Number(item.costTotal),
        };
      }),
    ];

    const rowsByDate = new Map<string, TrendLine[]>();

    for (const line of lines) {
      const current = rowsByDate.get(line.date);

      if (current) {
        current.push(line);
      } else {
        rowsByDate.set(line.date, [line]);
      }
    }

    const byDay = dates.map((date) => {
      const rows = rowsByDate.get(date) ?? [];

      const knownRows = rows.filter((row) => row.costTotal !== null);

      const unknownRows = rows.filter((row) => row.costTotal === null);

      const netRevenue = roundMoney(
        rows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const marginBasisRevenue = roundMoney(
        knownRows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const costOfGoodsSold = roundMoney(
        knownRows.reduce((sum, row) => sum + (row.costTotal ?? 0), 0),
      );

      const grossMargin = roundMoney(marginBasisRevenue - costOfGoodsSold);

      const unknownCostRevenue = roundMoney(
        unknownRows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const grossMarginPercent =
        marginBasisRevenue > 0
          ? Math.round((grossMargin / marginBasisRevenue) * 1000) / 10
          : null;

      const costCoveragePercent =
        netRevenue > 0
          ? Math.round((marginBasisRevenue / netRevenue) * 1000) / 10
          : 100;

      const costCoverageStatus =
        rows.length === 0 || unknownRows.length === 0
          ? ("COMPLETE" as const)
          : knownRows.length === 0
            ? ("NO_COST_DATA" as const)
            : ("PARTIAL" as const);

      return {
        date,
        netRevenue,
        marginBasisRevenue,
        costOfGoodsSold,
        grossMargin,
        grossMarginPercent,
        unknownCostRevenue,
        knownCostLines: knownRows.length,
        unknownCostLines: unknownRows.length,
        costCoveragePercent,
        costCoverageStatus,
      };
    });

    return {
      pointOfSaleId: point.id,
      pointOfSaleName: point.name,
      dateFrom: formatDate(from),
      dateTo: formatDate(to),
      generatedAt: new Date().toISOString(),
      byDay,
    };
  }

  async profitabilityReport(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosProfitabilityReportResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const parseDate = (value: string | undefined, endOfDay: boolean): Date => {
      if (!value) {
        const now = new Date();

        now.setHours(
          endOfDay ? 23 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 999 : 0,
        );

        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const result = new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const formatDate = (value: Date): string =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(value.getDate()).padStart(2, "0")}`;

    const from = parseDate(dateFrom, false);
    const to = parseDate(dateTo ?? dateFrom, true);

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const saleVoids = await this.prisma.posSaleVoid.findMany({
      where: {
        companyId: access.companyId,
        pointOfSaleId,
        OR: [
          {
            sourceType: "POS_DIRECT",
          },
          {
            sourceType: "POS_ACCOUNT",
          },
        ],
      },
      select: {
        sourceType: true,
        sourceId: true,
      },
    });

    const voidedDirectIds = saleVoids
      .filter((saleVoid) => saleVoid.sourceType === "POS_DIRECT")
      .map((saleVoid) => saleVoid.sourceId);

    const voidedAccountIds = saleVoids
      .filter((saleVoid) => saleVoid.sourceType === "POS_ACCOUNT")
      .map((saleVoid) => saleVoid.sourceId);

    const [directItems, accountItems] = await Promise.all([
      this.prisma.posMovementItem.findMany({
        where: {
          movement: {
            pointOfSaleId,
            type: "DIRECT_SALE",
            ...(voidedDirectIds.length > 0
              ? {
                  id: {
                    notIn: voidedDirectIds,
                  },
                }
              : {}),
            createdAt: {
              gte: from,
              lte: to,
            },
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          unitCost: true,
          costTotal: true,
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              saleUnit: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.posAccountItem.findMany({
        where: {
          account: {
            pointOfSaleId,
            status: "PAID",
            ...(voidedAccountIds.length > 0
              ? {
                  id: {
                    notIn: voidedAccountIds,
                  },
                }
              : {}),
            paidAt: {
              gte: from,
              lte: to,
            },
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          unitCost: true,
          costTotal: true,
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              saleUnit: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    type ProfitabilityLine = {
      productId: string;
      productName: string;
      sku: string;
      saleUnit: "UNIT" | "WEIGHT" | "VOLUME" | "SERVICE";
      categoryId: string;
      categoryName: string;
      quantity: number;
      netRevenue: number;
      costTotal: number | null;
    };

    const lines: ProfitabilityLine[] = [...directItems, ...accountItems].map(
      (item) => {
        const quantity = Number(item.quantity);

        const netRevenue = roundMoney(quantity * Number(item.unitPrice));

        return {
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          saleUnit: item.product.saleUnit,
          categoryId: item.product.categoryId,
          categoryName: item.product.category.name,
          quantity,
          netRevenue,
          costTotal:
            item.unitCost === null || item.costTotal === null
              ? null
              : Number(item.costTotal),
        };
      },
    );

    const buildSummary = (
      rows: Array<{
        netRevenue: number;
        costTotal: number | null;
      }>,
    ) => {
      const netRevenue = roundMoney(
        rows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const knownRows = rows.filter((row) => row.costTotal !== null);

      const unknownRows = rows.filter((row) => row.costTotal === null);

      const marginBasisRevenue = roundMoney(
        knownRows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const costOfGoodsSold = roundMoney(
        knownRows.reduce((sum, row) => sum + (row.costTotal ?? 0), 0),
      );

      const grossMargin = roundMoney(marginBasisRevenue - costOfGoodsSold);

      const unknownCostRevenue = roundMoney(
        unknownRows.reduce((sum, row) => sum + row.netRevenue, 0),
      );

      const grossMarginPercent =
        marginBasisRevenue > 0
          ? Math.round((grossMargin / marginBasisRevenue) * 1000) / 10
          : null;

      const costCoveragePercent =
        netRevenue > 0
          ? Math.round((marginBasisRevenue / netRevenue) * 1000) / 10
          : 100;

      const costCoverageStatus =
        rows.length === 0 || unknownRows.length === 0
          ? ("COMPLETE" as const)
          : knownRows.length === 0
            ? ("NO_COST_DATA" as const)
            : ("PARTIAL" as const);

      return {
        netRevenue,
        marginBasisRevenue,
        costOfGoodsSold,
        grossMargin,
        grossMarginPercent,
        unknownCostRevenue,
        knownCostLines: knownRows.length,
        unknownCostLines: unknownRows.length,
        costCoveragePercent,
        costCoverageStatus,
      };
    };

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        saleUnit: "UNIT" | "WEIGHT" | "VOLUME" | "SERVICE";
        quantity: number;
        categoryId: string;
        categoryName: string;
        rows: Array<{
          netRevenue: number;
          costTotal: number | null;
        }>;
      }
    >();

    for (const line of lines) {
      const current = productMap.get(line.productId);

      if (current) {
        current.quantity += line.quantity;

        current.rows.push({
          netRevenue: line.netRevenue,
          costTotal: line.costTotal,
        });

        continue;
      }

      productMap.set(line.productId, {
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        saleUnit: line.saleUnit,
        quantity: line.quantity,
        categoryId: line.categoryId,
        categoryName: line.categoryName,
        rows: [
          {
            netRevenue: line.netRevenue,
            costTotal: line.costTotal,
          },
        ],
      });
    }

    const byProduct = [...productMap.values()]
      .map((product) => ({
        productId: product.productId,
        productName: product.productName,
        sku: product.sku,
        saleUnit: product.saleUnit,
        quantity: Math.round(product.quantity * 1000) / 1000,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        ...buildSummary(product.rows),
      }))
      .sort(
        (a, b) =>
          b.grossMargin - a.grossMargin ||
          b.netRevenue - a.netRevenue ||
          a.productName.localeCompare(b.productName),
      );

    const categoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        productIds: Set<string>;
        rows: Array<{
          netRevenue: number;
          costTotal: number | null;
        }>;
      }
    >();

    for (const line of lines) {
      const current = categoryMap.get(line.categoryId);

      if (current) {
        current.productIds.add(line.productId);

        current.rows.push({
          netRevenue: line.netRevenue,
          costTotal: line.costTotal,
        });

        continue;
      }

      categoryMap.set(line.categoryId, {
        categoryId: line.categoryId,
        categoryName: line.categoryName,
        productIds: new Set([line.productId]),
        rows: [
          {
            netRevenue: line.netRevenue,
            costTotal: line.costTotal,
          },
        ],
      });
    }

    const byCategory = [...categoryMap.values()]
      .map((category) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        productsCount: category.productIds.size,
        ...buildSummary(category.rows),
      }))
      .sort(
        (a, b) =>
          b.grossMargin - a.grossMargin ||
          b.netRevenue - a.netRevenue ||
          a.categoryName.localeCompare(b.categoryName),
      );

    return {
      pointOfSaleId: point.id,
      pointOfSaleName: point.name,
      dateFrom: formatDate(from),
      dateTo: formatDate(to),
      generatedAt: new Date().toISOString(),
      classificationBasis: "CURRENT_PRODUCT_CATALOG",
      summary: buildSummary(lines),
      byProduct,
      byCategory,
    };
  }

  async salesTrend(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosSalesTrendResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
      select: { id: true, name: true },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const parseDate = (value?: string): Date => {
      if (!value) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const result = new Date(year, month - 1, day);

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const formatDate = (value: Date): string =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(value.getDate()).padStart(2, "0")}`;

    const from = parseDate(dateFrom);
    const to = parseDate(dateTo ?? dateFrom);

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const dates: string[] = [];
    const cursor = new Date(from);

    while (cursor <= to) {
      dates.push(formatDate(cursor));

      if (dates.length > 366) {
        throw new BadRequestException(
          "El reporte de tendencia admite un máximo de 366 días.",
        );
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    const reports = await Promise.all(
      dates.map((date) =>
        this.dailySalesReport(pointOfSaleId, access, date, date),
      ),
    );

    return {
      pointOfSaleId: point.id,
      pointOfSaleName: point.name,
      dateFrom: formatDate(from),
      dateTo: formatDate(to),
      generatedAt: new Date().toISOString(),
      byDay: reports.map((report) => ({
        date: report.dateFrom,
        salesCount: report.salesCount,
        subtotal: report.subtotal,
        taxAmount: report.taxAmount,
        serviceChargeAmount: report.serviceChargeAmount,
        total: report.total,
        averageTicket:
          report.salesCount > 0
            ? roundMoney(report.total / report.salesCount)
            : 0,
      })),
    };
  }

  async salesComparison(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosSalesComparisonResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const parseDate = (value: string | undefined): Date => {
      if (!value) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const result = new Date(year, month - 1, day, 0, 0, 0, 0);

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const formatDate = (value: Date): string =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(value.getDate()).padStart(2, "0")}`;

    const currentFrom = parseDate(dateFrom);
    const currentTo = parseDate(dateTo ?? dateFrom);

    if (currentFrom > currentTo) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const dayCount =
      Math.floor((currentTo.getTime() - currentFrom.getTime()) / dayMs) + 1;

    const previousTo = new Date(currentFrom.getTime() - dayMs);
    const previousFrom = new Date(
      previousTo.getTime() - (dayCount - 1) * dayMs,
    );

    const currentDateFrom = formatDate(currentFrom);
    const currentDateTo = formatDate(currentTo);
    const previousDateFrom = formatDate(previousFrom);
    const previousDateTo = formatDate(previousTo);

    const [currentReport, previousReport] = await Promise.all([
      this.dailySalesReport(
        pointOfSaleId,
        access,
        currentDateFrom,
        currentDateTo,
      ),
      this.dailySalesReport(
        pointOfSaleId,
        access,
        previousDateFrom,
        previousDateTo,
      ),
    ]);

    const averageTicket = (total: number, salesCount: number): number =>
      salesCount > 0 ? roundMoney(total / salesCount) : 0;

    const current = {
      salesCount: currentReport.salesCount,
      subtotal: currentReport.subtotal,
      taxAmount: currentReport.taxAmount,
      serviceChargeAmount: currentReport.serviceChargeAmount,
      total: currentReport.total,
      averageTicket: averageTicket(
        currentReport.total,
        currentReport.salesCount,
      ),
    };

    const previous = {
      salesCount: previousReport.salesCount,
      subtotal: previousReport.subtotal,
      taxAmount: previousReport.taxAmount,
      serviceChargeAmount: previousReport.serviceChargeAmount,
      total: previousReport.total,
      averageTicket: averageTicket(
        previousReport.total,
        previousReport.salesCount,
      ),
    };

    const percentChange = (
      currentValue: number,
      previousValue: number,
    ): number | null => {
      if (previousValue === 0) {
        return currentValue === 0 ? 0 : null;
      }

      return (
        Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10
      );
    };

    return {
      pointOfSaleId: currentReport.pointOfSaleId,
      pointOfSaleName: currentReport.pointOfSaleName,
      currentDateFrom,
      currentDateTo,
      previousDateFrom,
      previousDateTo,
      generatedAt: new Date().toISOString(),
      current,
      previous,
      delta: {
        salesCountPercent: percentChange(
          current.salesCount,
          previous.salesCount,
        ),
        subtotalPercent: percentChange(current.subtotal, previous.subtotal),
        taxAmountPercent: percentChange(current.taxAmount, previous.taxAmount),
        serviceChargeAmountPercent: percentChange(
          current.serviceChargeAmount,
          previous.serviceChargeAmount,
        ),
        totalPercent: percentChange(current.total, previous.total),
        averageTicketPercent: percentChange(
          current.averageTicket,
          previous.averageTicket,
        ),
      },
    };
  }

  async salesTransactionsReport(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosSalesTransactionsReportResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
      select: { id: true, name: true },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const parseDate = (value: string | undefined, endOfDay: boolean): Date => {
      if (!value) {
        const now = new Date();
        now.setHours(
          endOfDay ? 23 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 999 : 0,
        );
        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const result = new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const from = parseDate(dateFrom, false);
    const to = parseDate(dateTo ?? dateFrom, true);

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const formatDate = (value: Date): string =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
        value.getDate(),
      ).padStart(2, "0")}`;

    const [directSales, accountSales] = await Promise.all([
      this.prisma.posMovement.findMany({
        where: {
          pointOfSaleId,
          type: "DIRECT_SALE",
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          reference: true,
          customerAlias: true,
          saleMode: true,
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          total: true,
          createdAt: true,
        },
      }),
      this.prisma.posAccount.findMany({
        where: {
          pointOfSaleId,
          status: "PAID",
          paidAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          reference: true,
          customerAlias: true,
          saleMode: true,
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          total: true,
          paidAt: true,
        },
      }),
    ]);

    const sourceOr: Prisma.PaymentWhereInput[] = [];

    if (directSales.length > 0) {
      sourceOr.push({
        sourceType: "POS_DIRECT",
        sourceId: { in: directSales.map((sale) => sale.id) },
      });
    }

    if (accountSales.length > 0) {
      sourceOr.push({
        sourceType: "POS_ACCOUNT",
        sourceId: { in: accountSales.map((sale) => sale.id) },
      });
    }

    const saleVoids = await this.prisma.posSaleVoid.findMany({
      where: {
        companyId: access.companyId,
        OR: [
          ...(directSales.length > 0
            ? [
                {
                  sourceType: "POS_DIRECT",
                  sourceId: {
                    in: directSales.map((sale) => sale.id),
                  },
                },
              ]
            : []),
          ...(accountSales.length > 0
            ? [
                {
                  sourceType: "POS_ACCOUNT",
                  sourceId: {
                    in: accountSales.map((sale) => sale.id),
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        sourceType: true,
        sourceId: true,
        reason: true,
        voidedAt: true,
        voidedByUsername: true,
      },
    });

    const voidBySource = new Map(
      saleVoids.map((saleVoid) => [
        `${saleVoid.sourceType}:${saleVoid.sourceId}`,
        saleVoid,
      ]),
    );

    const validDirectSales = directSales.filter(
      (sale) =>
        !voidBySource.has(`POS_DIRECT:${sale.id}`),
    );

    const validAccountSales = accountSales.filter(
      (sale) =>
        !voidBySource.has(`POS_ACCOUNT:${sale.id}`),
    );

    sourceOr.length = 0;

    if (validDirectSales.length > 0) {
      sourceOr.push({
        sourceType: "POS_DIRECT",
        sourceId: {
          in: validDirectSales.map((sale) => sale.id),
        },
      });
    }

    if (validAccountSales.length > 0) {
      sourceOr.push({
        sourceType: "POS_ACCOUNT",
        sourceId: {
          in: validAccountSales.map((sale) => sale.id),
        },
      });
    }

    const payments =
      sourceOr.length > 0
        ? await this.prisma.payment.findMany({
            where: { OR: sourceOr },
            include: { method: true },
          })
        : [];

    const paymentBySource = new Map<
      string,
      { paymentMethodId: string; paymentMethodName: string }
    >();

    for (const payment of payments) {
      if (!payment.sourceType || !payment.sourceId) continue;

      paymentBySource.set(`${payment.sourceType}:${payment.sourceId}`, {
        paymentMethodId: payment.paymentMethodId,
        paymentMethodName: payment.method.name,
      });
    }

    const transactions = [
      ...validDirectSales.map((sale) => {
        const payment = paymentBySource.get(`POS_DIRECT:${sale.id}`);

        return {
          id: sale.id,
          transactionType: "DIRECT" as const,
          reference: sale.reference,
          pointOfSaleId: point.id,
          pointOfSaleName: point.name,
          saleMode: sale.saleMode,
          customerAlias: sale.customerAlias,
          paymentMethodId: payment?.paymentMethodId ?? null,
          paymentMethodName: payment?.paymentMethodName ?? null,
          subtotal: Number(sale.subtotal),
          taxAmount: Number(sale.taxAmount),
          serviceChargeAmount: Number(sale.serviceChargeAmount),
          total: Number(sale.total),
          paidAt: sale.createdAt.toISOString(),
        };
      }),
      ...validAccountSales.map((sale) => {
        const payment = paymentBySource.get(`POS_ACCOUNT:${sale.id}`);

        return {
          id: sale.id,
          transactionType: "ACCOUNT" as const,
          reference: sale.reference,
          pointOfSaleId: point.id,
          pointOfSaleName: point.name,
          saleMode: sale.saleMode,
          customerAlias: sale.customerAlias,
          paymentMethodId: payment?.paymentMethodId ?? null,
          paymentMethodName: payment?.paymentMethodName ?? null,
          subtotal: Number(sale.subtotal),
          taxAmount: Number(sale.taxAmount),
          serviceChargeAmount: Number(sale.serviceChargeAmount),
          total: Number(sale.total),
          paidAt: (() => {
            if (!sale.paidAt) {
              throw new InternalServerErrorException(
                `La cuenta pagada ${sale.reference} no tiene fecha de pago.`,
              );
            }

            return sale.paidAt.toISOString();
          })(),
        };
      }),
    ].sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );

    return {
      pointOfSaleId: point.id,
      pointOfSaleName: point.name,
      dateFrom: formatDate(from),
      dateTo: formatDate(to),
      generatedAt: new Date().toISOString(),
      transactions,
    };
  }

  async issuedSalesDocuments(
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
    pointOfSaleId?: string,
  ): Promise<PosIssuedSalesDocumentListResponse> {
    const parseDate = (value: string | undefined, endOfDay: boolean): Date => {
      if (!value) {
        const now = new Date();
        now.setHours(
          endOfDay ? 23 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 59 : 0,
          endOfDay ? 999 : 0,
        );
        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const result = new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const from = parseDate(dateFrom, false);
    const to = parseDate(dateTo ?? dateFrom, true);

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const formatDate = (value: Date): string =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(value.getDate()).padStart(2, "0")}`;

    const pointFilter: Prisma.PointOfSaleWhereInput = {
      ...this.pointWhere(access),
      ...(pointOfSaleId ? { id: pointOfSaleId } : {}),
    };

    const points = await this.prisma.pointOfSale.findMany({
      where: pointFilter,
      select: {
        id: true,
        name: true,
        branchId: true,
      },
    });

    if (pointOfSaleId && points.length === 0) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    if (points.length === 0) {
      return {
        dateFrom: formatDate(from),
        dateTo: formatDate(to),
        generatedAt: new Date().toISOString(),
        documents: [],
      };
    }

    const pointIds = points.map((point) => point.id);
    const pointById = new Map(
      points.map((point) => [point.id, point] as const),
    );

    const [directSales, accountSales] = await Promise.all([
      this.prisma.posMovement.findMany({
        where: {
          pointOfSaleId: { in: pointIds },
          type: "DIRECT_SALE",
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          reference: true,
          pointOfSaleId: true,
          customerAlias: true,
          saleMode: true,
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          total: true,
          createdAt: true,
        },
      }),
      this.prisma.posAccount.findMany({
        where: {
          pointOfSaleId: { in: pointIds },
          status: "PAID",
          paidAt: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          reference: true,
          pointOfSaleId: true,
          customerAlias: true,
          saleMode: true,
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          total: true,
          paidAt: true,
        },
      }),
    ]);

    const invalidPaidAccount = accountSales.find(
      (sale) => sale.paidAt === null,
    );

    if (invalidPaidAccount) {
      throw new InternalServerErrorException(
        `La cuenta pagada ${invalidPaidAccount.reference} no tiene fecha de pago.`,
      );
    }

    const sourceOr: Prisma.PaymentWhereInput[] = [];

    if (directSales.length > 0) {
      sourceOr.push({
        sourceType: "POS_DIRECT",
        sourceId: {
          in: directSales.map((sale) => sale.id),
        },
      });
    }

    if (accountSales.length > 0) {
      sourceOr.push({
        sourceType: "POS_ACCOUNT",
        sourceId: {
          in: accountSales.map((sale) => sale.id),
        },
      });
    }

    const saleVoids =
      sourceOr.length > 0
        ? await this.prisma.posSaleVoid.findMany({
            where: {
              companyId: access.companyId,
              OR: [
                ...(directSales.length > 0
                  ? [
                      {
                        sourceType: "POS_DIRECT",
                        sourceId: {
                          in: directSales.map((sale) => sale.id),
                        },
                      },
                    ]
                  : []),
                ...(accountSales.length > 0
                  ? [
                      {
                        sourceType: "POS_ACCOUNT",
                        sourceId: {
                          in: accountSales.map((sale) => sale.id),
                        },
                      },
                    ]
                  : []),
              ],
            },
            select: {
              sourceType: true,
              sourceId: true,
              reason: true,
              voidedAt: true,
              voidedByUsername: true,
            },
          })
        : [];

    const voidBySource = new Map(
      saleVoids.map((saleVoid) => [
        `${saleVoid.sourceType}:${saleVoid.sourceId}`,
        saleVoid,
      ]),
    );

    const payments =
      sourceOr.length > 0
        ? await this.prisma.payment.findMany({
            where: {
              OR: sourceOr,
            },
            select: {
              paymentMethodId: true,
              sourceType: true,
              sourceId: true,
              method: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: {
              receivedAt: "asc",
            },
          })
        : [];

    const paymentBySource = new Map<
      string,
      {
        paymentMethodId: string;
        paymentMethodName: string;
      }
    >();

    for (const payment of payments) {
      if (!payment.sourceType || !payment.sourceId) {
        continue;
      }

      const key = `${payment.sourceType}:${payment.sourceId}`;

      if (!paymentBySource.has(key)) {
        paymentBySource.set(key, {
          paymentMethodId: payment.paymentMethodId,
          paymentMethodName: payment.method.name,
        });
      }
    }

    const documents: PosIssuedSalesDocumentListResponse["documents"] = [
      ...directSales.map((sale) => {
        const point = pointById.get(sale.pointOfSaleId);

        if (!point) {
          throw new InternalServerErrorException(
            "El documento tiene un punto de venta inválido.",
          );
        }

        const payment = paymentBySource.get(
          `POS_DIRECT:${sale.id}`,
        );

        const saleVoid = voidBySource.get(
          `POS_DIRECT:${sale.id}`,
        );

        return {
          status: saleVoid ? "VOIDED" as const : "ISSUED" as const,
          voidedAt: saleVoid?.voidedAt.toISOString() ?? null,
          voidReason: saleVoid?.reason ?? null,
          voidedByUsername: saleVoid?.voidedByUsername ?? null,
          id: sale.id,
          source: "POS_DIRECT" as const,
          reference: sale.reference,
          pointOfSaleId: point.id,
          branchId: point.branchId,
          pointOfSaleName: point.name,
          customerAlias: sale.customerAlias,
          saleMode: sale.saleMode,
          paymentMethodId: payment?.paymentMethodId ?? null,
          paymentMethodName: payment?.paymentMethodName ?? null,
          subtotal: Number(sale.subtotal),
          taxAmount: Number(sale.taxAmount),
          serviceChargeAmount: Number(sale.serviceChargeAmount),
          total: Number(sale.total),
          issuedAt: sale.createdAt.toISOString(),
        };
      }),
      ...accountSales.map((sale) => {
        const point = pointById.get(sale.pointOfSaleId);

        if (!point) {
          throw new InternalServerErrorException(
            "El documento tiene un punto de venta inválido.",
          );
        }

        if (!sale.paidAt) {
          throw new InternalServerErrorException(
            `La cuenta pagada ${sale.reference} no tiene fecha de pago.`,
          );
        }

        const payment = paymentBySource.get(
          `POS_ACCOUNT:${sale.id}`,
        );

        const saleVoid = voidBySource.get(
          `POS_ACCOUNT:${sale.id}`,
        );

        return {
          status: saleVoid ? "VOIDED" as const : "ISSUED" as const,
          voidedAt: saleVoid?.voidedAt.toISOString() ?? null,
          voidReason: saleVoid?.reason ?? null,
          voidedByUsername: saleVoid?.voidedByUsername ?? null,
          id: sale.id,
          source: "POS_ACCOUNT" as const,
          reference: sale.reference,
          pointOfSaleId: point.id,
          branchId: point.branchId,
          pointOfSaleName: point.name,
          customerAlias: sale.customerAlias,
          saleMode: sale.saleMode,
          paymentMethodId: payment?.paymentMethodId ?? null,
          paymentMethodName: payment?.paymentMethodName ?? null,
          subtotal: Number(sale.subtotal),
          taxAmount: Number(sale.taxAmount),
          serviceChargeAmount: Number(sale.serviceChargeAmount),
          total: Number(sale.total),
          issuedAt: sale.paidAt.toISOString(),
        };
      }),
    ].sort(
      (a, b) =>
        new Date(b.issuedAt).getTime() -
        new Date(a.issuedAt).getTime(),
    );

    return {
      dateFrom: formatDate(from),
      dateTo: formatDate(to),
      generatedAt: new Date().toISOString(),
      documents,
    };
  }

  async issuedSalesDocument(
    source: PosIssuedSalesDocumentSource,
    id: string,
    access: PosBranchAccessContext,
  ): Promise<PosIssuedSalesDocumentDetailResponse> {
    if (!id) {
      throw new BadRequestException("Debe indicar el documento.");
    }

    if (source !== "POS_DIRECT" && source !== "POS_ACCOUNT") {
      throw new BadRequestException(
        "El origen del documento no es válido.",
      );
    }

    if (source === "POS_DIRECT") {
      const sale = await this.prisma.posMovement.findFirst({
        where: {
          id,
          type: "DIRECT_SALE",
          pointOfSale: this.pointWhere(access),
        },
        select: {
          id: true,
          reference: true,
          customerAlias: true,
          saleMode: true,
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          total: true,
          createdAt: true,
          pointOfSale: {
            select: {
              id: true,
              name: true,
              branchId: true,
            },
          },
          items: {
            orderBy: {
              id: "asc",
            },
            select: {
              id: true,
              productId: true,
              quantity: true,
              unitPrice: true,
              taxAmount: true,
              lineTotal: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!sale) {
        throw new NotFoundException("Factura emitida no encontrada.");
      }

      const payments = await this.prisma.payment.findMany({
        where: {
          sourceType: "POS_DIRECT",
          sourceId: sale.id,
        },
        include: {
          method: true,
        },
        orderBy: {
          receivedAt: "asc",
        },
      });

      const saleVoid = await this.prisma.posSaleVoid.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: "POS_DIRECT",
            sourceId: sale.id,
          },
        },
        select: {
          reason: true,
          voidedAt: true,
          voidedByUsername: true,
        },
      });

      return {
        status: saleVoid ? "VOIDED" : "ISSUED",
        voidedAt: saleVoid?.voidedAt.toISOString() ?? null,
        voidReason: saleVoid?.reason ?? null,
        voidedByUsername: saleVoid?.voidedByUsername ?? null,
        id: sale.id,
        source: "POS_DIRECT",
        reference: sale.reference,
        pointOfSaleId: sale.pointOfSale.id,
        branchId: sale.pointOfSale.branchId,
        pointOfSaleName: sale.pointOfSale.name,
        customerAlias: sale.customerAlias,
        saleMode: sale.saleMode,
        subtotal: Number(sale.subtotal),
        taxAmount: Number(sale.taxAmount),
        serviceChargeAmount: Number(sale.serviceChargeAmount),
        total: Number(sale.total),
        issuedAt: sale.createdAt.toISOString(),
        items: sale.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineSubtotal: roundMoney(
            Number(item.lineTotal) - Number(item.taxAmount),
          ),
          lineTax: Number(item.taxAmount),
          lineTotal: Number(item.lineTotal),
        })),
        payments: payments.map((payment) => ({
          id: payment.id,
          paymentMethodId: payment.paymentMethodId,
          paymentMethodName: payment.method.name,
          amount: Number(payment.amount),
          reference: payment.reference,
          paidAt: payment.receivedAt.toISOString(),
        })),
      };
    }

    const account = await this.prisma.posAccount.findFirst({
      where: {
        id,
        status: "PAID",
        pointOfSale: this.pointWhere(access),
      },
      select: {
        id: true,
        reference: true,
        customerAlias: true,
        saleMode: true,
        subtotal: true,
        taxAmount: true,
        serviceChargeAmount: true,
        total: true,
        paidAt: true,
        pointOfSale: {
          select: {
            id: true,
            name: true,
            branchId: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            taxAmount: true,
            lineTotal: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException("Factura emitida no encontrada.");
    }

    if (!account.paidAt) {
      throw new InternalServerErrorException(
        `La cuenta pagada ${account.reference} no tiene fecha de pago.`,
      );
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        sourceType: "POS_ACCOUNT",
        sourceId: account.id,
      },
      include: {
        method: true,
      },
      orderBy: {
        receivedAt: "asc",
      },
    });

    const saleVoid = await this.prisma.posSaleVoid.findUnique({
      where: {
        sourceType_sourceId: {
          sourceType: "POS_ACCOUNT",
          sourceId: account.id,
        },
      },
      select: {
        reason: true,
        voidedAt: true,
        voidedByUsername: true,
      },
    });

    return {
      status: saleVoid ? "VOIDED" : "ISSUED",
      voidedAt: saleVoid?.voidedAt.toISOString() ?? null,
      voidReason: saleVoid?.reason ?? null,
      voidedByUsername: saleVoid?.voidedByUsername ?? null,
      id: account.id,
      source: "POS_ACCOUNT",
      reference: account.reference,
      pointOfSaleId: account.pointOfSale.id,
      branchId: account.pointOfSale.branchId,
      pointOfSaleName: account.pointOfSale.name,
      customerAlias: account.customerAlias,
      saleMode: account.saleMode,
      subtotal: Number(account.subtotal),
      taxAmount: Number(account.taxAmount),
      serviceChargeAmount: Number(account.serviceChargeAmount),
      total: Number(account.total),
      issuedAt: account.paidAt.toISOString(),
      items: account.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineSubtotal: roundMoney(
          Number(item.lineTotal) - Number(item.taxAmount),
        ),
        lineTax: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        paymentMethodId: payment.paymentMethodId,
        paymentMethodName: payment.method.name,
        amount: Number(payment.amount),
        reference: payment.reference,
        paidAt: payment.receivedAt.toISOString(),
      })),
    };
  }


  async voidIssuedSalesDocument(
    source: PosIssuedSalesDocumentSource,
    id: string,
    reason: string,
    actor: PosBranchAccessActor,
  ): Promise<PosIssuedSalesDocumentVoidResponse> {
    if (!id) {
      throw new BadRequestException("Debe indicar el documento.");
    }

    if (source !== "POS_DIRECT" && source !== "POS_ACCOUNT") {
      throw new BadRequestException(
        "El origen del documento no es válido.",
      );
    }

    const normalizedReason = reason?.trim();

    if (!normalizedReason || normalizedReason.length < 3) {
      throw new BadRequestException(
        "Debe indicar un motivo de anulación válido.",
      );
    }

    if (normalizedReason.length > 255) {
      throw new BadRequestException(
        "El motivo de anulación no puede exceder 255 caracteres.",
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const sale =
          source === "POS_DIRECT"
            ? await tx.posMovement.findFirst({
                where: {
                  id,
                  type: "DIRECT_SALE",
                  pointOfSale: this.pointWhere(actor),
                },
                select: {
                  id: true,
                  reference: true,
                  total: true,
                  pointOfSaleId: true,
                  pointOfSale: {
                    select: {
                      branchId: true,
                    },
                  },
                },
              })
            : await tx.posAccount.findFirst({
                where: {
                  id,
                  status: "PAID",
                  pointOfSale: this.pointWhere(actor),
                },
                select: {
                  id: true,
                  reference: true,
                  total: true,
                  pointOfSaleId: true,
                  pointOfSale: {
                    select: {
                      branchId: true,
                    },
                  },
                },
              });

        if (!sale) {
          throw new NotFoundException(
            "Factura emitida no encontrada.",
          );
        }

        const existingVoid = await tx.posSaleVoid.findUnique({
          where: {
            sourceType_sourceId: {
              sourceType: source,
              sourceId: sale.id,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingVoid) {
          throw new ConflictException(
            "La factura ya se encuentra anulada.",
          );
        }

        const payments = await tx.payment.findMany({
          where: {
            sourceType: source,
            sourceId: sale.id,
          },
          select: {
            id: true,
            amount: true,
            cashSessionId: true,
            method: {
              select: {
                type: true,
              },
            },
            cashSession: {
              select: {
                id: true,
                status: true,
                cashRegisterId: true,
                cashRegister: {
                  select: {
                    branchId: true,
                  },
                },
              },
            },
          },
          orderBy: {
            receivedAt: "asc",
          },
        });

        const cashPayments = payments.filter(
          (payment) => payment.method.type === "CASH",
        );

        /*
         * Validamos toda la topología de caja antes de ejecutar
         * cualquier efecto compensatorio.
         */
        const cashByRegister = new Map<
          string,
          {
            amount: Prisma.Decimal;
            originalSessionIds: Set<string>;
          }
        >();

        for (const payment of cashPayments) {
          if (!payment.cashSessionId || !payment.cashSession) {
            throw new InternalServerErrorException(
              "El pago en efectivo no tiene una sesión de caja asociada.",
            );
          }

          if (
            payment.cashSession.cashRegister.branchId !==
            sale.pointOfSale.branchId
          ) {
            throw new InternalServerErrorException(
              "La caja del pago no corresponde a la sucursal de la venta.",
            );
          }

          const cashRegisterId =
            payment.cashSession.cashRegisterId;

          const current = cashByRegister.get(cashRegisterId);

          if (current) {
            current.amount = current.amount.plus(payment.amount);
            current.originalSessionIds.add(
              payment.cashSessionId,
            );
          } else {
            cashByRegister.set(cashRegisterId, {
              amount: new Prisma.Decimal(payment.amount),
              originalSessionIds: new Set([
                payment.cashSessionId,
              ]),
            });
          }
        }

        /*
         * Una misma venta POS normalmente tiene un solo pago.
         * Si los datos históricos muestran efectivo distribuido entre
         * varias sesiones de la misma caja, no inferimos cómo devolverlo.
         */
        for (const cashGroup of cashByRegister.values()) {
          if (cashGroup.originalSessionIds.size !== 1) {
            throw new InternalServerErrorException(
              "La venta tiene pagos en efectivo asociados a múltiples sesiones de la misma caja.",
            );
          }
        }

        /*
         * Primero determinamos y bloqueamos las sesiones que recibirán
         * la devolución. Si la sesión histórica ya cerró, la devolución
         * debe ir a una sesión OPEN de la MISMA caja.
         */
        const cashReversalTargets: Array<{
          cashRegisterId: string;
          cashSessionId: string;
          amount: Prisma.Decimal;
        }> = [];

        const sortedCashGroups = [...cashByRegister.entries()].sort(
          ([left], [right]) => left.localeCompare(right),
        );

        for (const [cashRegisterId, cashGroup] of sortedCashGroups) {
          const originalSessionId = [
            ...cashGroup.originalSessionIds,
          ][0];

          if (!originalSessionId) {
            throw new InternalServerErrorException(
              "No se pudo determinar la sesión de caja original.",
            );
          }

          await tx.$queryRaw`
            SELECT id
            FROM cash_sessions
            WHERE id = ${originalSessionId}
            FOR UPDATE
          `;

          const originalSession =
            await tx.cashSession.findUnique({
              where: {
                id: originalSessionId,
              },
              select: {
                id: true,
                status: true,
                cashRegisterId: true,
              },
            });

          if (
            !originalSession ||
            originalSession.cashRegisterId !== cashRegisterId
          ) {
            throw new InternalServerErrorException(
              "La sesión de caja original no es válida.",
            );
          }

          let targetSessionId: string;

          if (originalSession.status === "OPEN") {
            targetSessionId = originalSession.id;
          } else {
            const openSession =
              await tx.cashSession.findFirst({
                where: {
                  cashRegisterId,
                  status: "OPEN",
                },
                select: {
                  id: true,
                },
                orderBy: {
                  openedAt: "desc",
                },
              });

            if (!openSession) {
              throw new BadRequestException(
                "Debe abrir la caja correspondiente para registrar la devolución en efectivo.",
              );
            }

            await tx.$queryRaw`
              SELECT id
              FROM cash_sessions
              WHERE id = ${openSession.id}
              FOR UPDATE
            `;

            const lockedOpenSession =
              await tx.cashSession.findUnique({
                where: {
                  id: openSession.id,
                },
                select: {
                  id: true,
                  status: true,
                  cashRegisterId: true,
                },
              });

            if (
              !lockedOpenSession ||
              lockedOpenSession.status !== "OPEN" ||
              lockedOpenSession.cashRegisterId !== cashRegisterId
            ) {
              throw new BadRequestException(
                "Debe abrir la caja correspondiente para registrar la devolución en efectivo.",
              );
            }

            targetSessionId = lockedOpenSession.id;
          }

          cashReversalTargets.push({
            cashRegisterId,
            cashSessionId: targetSessionId,
            amount: cashGroup.amount,
          });
        }

        /*
         * El UNIQUE(source_type, source_id) funciona además como la
         * barrera final contra doble anulación concurrente.
         */
        const saleVoid = await tx.posSaleVoid.create({
          data: {
            companyId: actor.companyId,
            branchId: sale.pointOfSale.branchId,
            pointOfSaleId: sale.pointOfSaleId,
            sourceType: source,
            sourceId: sale.id,
            reference: sale.reference,
            reason: normalizedReason,
            total: sale.total,
            voidedByUserId: actor.userId,
            voidedByUsername: actor.username,
          },
        });

        /*
         * Restauramos inventario desde los movimientos SALE originales,
         * no desde los items agregados de la cuenta.
         */
        const inventorySales =
          await tx.inventoryMovement.findMany({
            where: {
              companyId: actor.companyId,
              branchId: sale.pointOfSale.branchId,
              pointOfSaleId: sale.pointOfSaleId,
              type: "SALE",
              referenceType: source,
              referenceId: sale.id,
            },
            select: {
              id: true,
              productId: true,
              quantity: true,
              unitCost: true,
              movementValue: true,
              createdAt: true,
            },
            orderBy: [
              {
                createdAt: "asc",
              },
              {
                id: "asc",
              },
            ],
          });

        const inventoryProductIds = [
          ...new Set(
            inventorySales.map(
              (movement) => movement.productId,
            ),
          ),
        ].sort();

        /*
         * Bloqueo estable por producto para que dos anulaciones
         * concurrentes no pierdan incrementos de existencia.
         */
        for (const productId of inventoryProductIds) {
          const lockedRows = await tx.$queryRaw<
            Array<{ id: string }>
          >`
            SELECT id
            FROM product_branches
            WHERE company_id = ${actor.companyId}
              AND branch_id = ${sale.pointOfSale.branchId}
              AND product_id = ${productId}
            FOR UPDATE
          `;

          if (lockedRows.length !== 1) {
            throw new InternalServerErrorException(
              "No se encontró la configuración de inventario del producto en la sucursal.",
            );
          }
        }

        const productBranches =
          inventoryProductIds.length > 0
            ? await tx.productBranch.findMany({
                where: {
                  companyId: actor.companyId,
                  branchId: sale.pointOfSale.branchId,
                  productId: {
                    in: inventoryProductIds,
                  },
                },
                select: {
                  id: true,
                  productId: true,
                  stockQuantity: true,
                },
              })
            : [];

        const productBranchByProductId = new Map(
          productBranches.map((branchProduct) => [
            branchProduct.productId,
            {
              id: branchProduct.id,
              stockQuantity: new Prisma.Decimal(
                branchProduct.stockQuantity,
              ),
            },
          ]),
        );

        for (const originalMovement of inventorySales) {
          const branchProduct =
            productBranchByProductId.get(
              originalMovement.productId,
            );

          if (!branchProduct) {
            throw new InternalServerErrorException(
              "No se encontró la configuración de inventario necesaria para revertir la venta.",
            );
          }

          const previousStock =
            branchProduct.stockQuantity;

          const newStock = previousStock.plus(
            originalMovement.quantity,
          );

          await tx.productBranch.update({
            where: {
              id: branchProduct.id,
            },
            data: {
              stockQuantity: newStock,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              companyId: actor.companyId,
              branchId: sale.pointOfSale.branchId,
              pointOfSaleId: sale.pointOfSaleId,
              productId: originalMovement.productId,
              type: "RETURN_IN",
              quantity: originalMovement.quantity,
              previousStock,
              newStock,
              unitCost: originalMovement.unitCost,
              movementValue:
                originalMovement.movementValue,
              referenceType: "POS_VOID",
              referenceId: saleVoid.id,
              referenceNumber: sale.reference,
              note: `Anulación ${sale.reference}: ${normalizedReason}`.slice(0, 255),
              createdBy: actor.username,
            },
          });

          branchProduct.stockQuantity = newStock;
        }

        /*
         * Pago original y movimiento SALE se preservan.
         * La devolución de efectivo se registra como compensación
         * negativa sobre una sesión OPEN de la misma caja.
         */
        let cashReversed = new Prisma.Decimal(0);

        for (const reversal of cashReversalTargets) {
          if (reversal.amount.lte(0)) {
            continue;
          }

          await tx.cashMovement.create({
            data: {
              cashSessionId: reversal.cashSessionId,
              type: "ADJUSTMENT",
              amount: reversal.amount.negated(),
              description:
                `Anulación ${sale.reference}: devolución de efectivo.`,
              externalReference: sale.reference,
              referenceType: "POS_VOID",
              referenceId: saleVoid.id,
            },
          });

          cashReversed = cashReversed.plus(
            reversal.amount,
          );
        }

        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.userId,
            action: "VOID_POS_SALE",
            entityType:
              source === "POS_DIRECT"
                ? "POS_MOVEMENT"
                : "POS_ACCOUNT",
            entityId: sale.id,
            reason: normalizedReason,
            oldValues: {
              status: "ISSUED",
              total: Number(sale.total),
            },
            newValues: {
              status: "VOIDED",
              voidId: saleVoid.id,
              voidedAt: saleVoid.voidedAt.toISOString(),
              pointOfSaleId: sale.pointOfSaleId,
              inventoryMovementsRestored:
                inventorySales.length,
              cashReversed: Number(cashReversed),
            },
            ipAddress: actor.ipAddress,
          },
        });

        return {
          id: saleVoid.id,
          source,
          sourceId: sale.id,
          reference: sale.reference,
          status: "VOIDED",
          reason: saleVoid.reason,
          total: Number(saleVoid.total),
          voidedAt: saleVoid.voidedAt.toISOString(),
          voidedByUsername:
            saleVoid.voidedByUsername,
        };
      });
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "La factura ya se encuentra anulada.",
        );
      }

      throw error;
    }
  }


  async dailySalesReport(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PosDailySalesReportResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const parseDate = (value: string | undefined, endOfDay: boolean): Date => {
      if (!value) {
        const now = new Date();

        if (endOfDay) {
          now.setHours(23, 59, 59, 999);
        } else {
          now.setHours(0, 0, 0, 0);
        }

        return now;
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new BadRequestException(
          "Las fechas deben tener formato YYYY-MM-DD.",
        );
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const result = new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        throw new BadRequestException("La fecha indicada no es válida.");
      }

      return result;
    };

    const from = parseDate(dateFrom, false);
    const to = parseDate(dateTo ?? dateFrom, true);

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const normalizedDateFrom = `${from.getFullYear()}-${String(
      from.getMonth() + 1,
    ).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

    const normalizedDateTo = `${to.getFullYear()}-${String(
      to.getMonth() + 1,
    ).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;

    const [directSales, accountSales] = await Promise.all([
      this.prisma.posMovement.findMany({
        where: {
          pointOfSaleId,
          type: "DIRECT_SALE",
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          saleMode: true,
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          total: true,
        },
      }),

      this.prisma.posAccount.findMany({
        where: {
          pointOfSaleId,
          status: "PAID",
          paidAt: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          saleMode: true,
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          total: true,
        },
      }),
    ]);

    const saleVoids = await this.prisma.posSaleVoid.findMany({
      where: {
        companyId: access.companyId,
        pointOfSaleId,
        OR: [
          ...(directSales.length > 0
            ? [
                {
                  sourceType: "POS_DIRECT",
                  sourceId: {
                    in: directSales.map((sale) => sale.id),
                  },
                },
              ]
            : []),
          ...(accountSales.length > 0
            ? [
                {
                  sourceType: "POS_ACCOUNT",
                  sourceId: {
                    in: accountSales.map((sale) => sale.id),
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        sourceType: true,
        sourceId: true,
      },
    });

    const voidedSourceKeys = new Set(
      saleVoids.map(
        (saleVoid) =>
          `${saleVoid.sourceType}:${saleVoid.sourceId}`,
      ),
    );

    const validDirectSales = directSales.filter(
      (sale) =>
        !voidedSourceKeys.has(`POS_DIRECT:${sale.id}`),
    );

    const validAccountSales = accountSales.filter(
      (sale) =>
        !voidedSourceKeys.has(`POS_ACCOUNT:${sale.id}`),
    );

    const directIds = validDirectSales.map((sale) => sale.id);

    const accountIds = validAccountSales.map((sale) => sale.id);

    const paymentOr: Prisma.PaymentWhereInput[] = [];

    if (directIds.length > 0) {
      paymentOr.push({
        sourceType: "POS_DIRECT",
        sourceId: {
          in: directIds,
        },
      });
    }

    if (accountIds.length > 0) {
      paymentOr.push({
        sourceType: "POS_ACCOUNT",
        sourceId: {
          in: accountIds,
        },
      });
    }

    const payments =
      paymentOr.length > 0
        ? await this.prisma.payment.findMany({
            where: {
              OR: paymentOr,
            },
            include: {
              method: true,
            },
          })
        : [];

    type SaleRow = {
      saleMode: "DINE_IN" | "TAKEAWAY" | "DIRECT";
      subtotal: number;
      taxAmount: number;
      serviceChargeAmount: number;
      total: number;
    };

    const rows: SaleRow[] = [
      ...validDirectSales.map((sale) => ({
        saleMode: sale.saleMode,
        subtotal: Number(sale.subtotal),
        taxAmount: Number(sale.taxAmount),
        serviceChargeAmount: Number(sale.serviceChargeAmount),
        total: Number(sale.total),
      })),
      ...validAccountSales.map((sale) => ({
        saleMode: sale.saleMode,
        subtotal: Number(sale.subtotal),
        taxAmount: Number(sale.taxAmount),
        serviceChargeAmount: Number(sale.serviceChargeAmount),
        total: Number(sale.total),
      })),
    ];

    const totalMoney = (values: number[]): number =>
      roundMoney(values.reduce((sum, value) => sum + value, 0));

    const saleModes: SaleRow["saleMode"][] = ["DINE_IN", "TAKEAWAY", "DIRECT"];

    const bySaleMode = saleModes
      .map((saleMode) => {
        const modeRows = rows.filter((row) => row.saleMode === saleMode);

        return {
          saleMode,
          transactions: modeRows.length,
          subtotal: totalMoney(modeRows.map((row) => row.subtotal)),
          taxAmount: totalMoney(modeRows.map((row) => row.taxAmount)),
          serviceChargeAmount: totalMoney(
            modeRows.map((row) => row.serviceChargeAmount),
          ),
          total: totalMoney(modeRows.map((row) => row.total)),
        };
      })
      .filter((row) => row.transactions > 0);

    const paymentMap = new Map<
      string,
      {
        paymentMethodId: string;
        paymentMethodName: string;
        transactions: number;
        amount: number;
      }
    >();

    for (const payment of payments) {
      const current = paymentMap.get(payment.paymentMethodId);

      if (current) {
        current.transactions += 1;
        current.amount = roundMoney(current.amount + Number(payment.amount));
        continue;
      }

      paymentMap.set(payment.paymentMethodId, {
        paymentMethodId: payment.paymentMethodId,
        paymentMethodName: payment.method.name,
        transactions: 1,
        amount: roundMoney(Number(payment.amount)),
      });
    }

    const byPaymentMethod = [...paymentMap.values()].sort(
      (a, b) =>
        b.amount - a.amount ||
        a.paymentMethodName.localeCompare(b.paymentMethodName),
    );

    return {
      pointOfSaleId: point.id,
      pointOfSaleName: point.name,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      generatedAt: new Date().toISOString(),

      salesCount: rows.length,
      directSalesCount: validDirectSales.length,
      accountSalesCount: validAccountSales.length,

      subtotal: totalMoney(rows.map((row) => row.subtotal)),
      taxAmount: totalMoney(rows.map((row) => row.taxAmount)),
      serviceChargeAmount: totalMoney(
        rows.map((row) => row.serviceChargeAmount),
      ),
      total: totalMoney(rows.map((row) => row.total)),

      byPaymentMethod,
      bySaleMode,
    };
  }

  async paymentMethods(): Promise<PaymentMethodResponse[]> {
    const rows = await this.prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
    }));
  }

  async points(access: PosBranchAccessContext): Promise<PointOfSaleResponse[]> {
    const rows = await this.prisma.pointOfSale.findMany({
      where: {
        ...this.pointWhere(access),
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      branchId: row.branchId,
      branchName: row.branch.name,
      code: row.code,
      name: row.name,
      description: row.description,
      uiMode: row.uiMode,
    }));
  }

  async cashRegisters(
    companyId: string,
    pointOfSaleId?: string,
  ): Promise<CashRegisterResponse[]> {
    if (pointOfSaleId) {
      const pointOfSale = await this.prisma.pointOfSale.findFirst({
        where: {
          id: pointOfSaleId,
          companyId,
          active: true,
        },
        select: {
          id: true,
        },
      });

      if (!pointOfSale) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }
    }

    const rows = await this.prisma.cashRegister.findMany({
      where: {
        active: true,
        branch: {
          companyId,
        },
        ...(pointOfSaleId ? { pointOfSaleId } : {}),
      },
      include: {
        pointOfSale: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      pointOfSaleId: row.pointOfSaleId,
      pointOfSaleName: row.pointOfSale?.name ?? null,
      active: row.active,
    }));
  }

  async categories(
    access: PosBranchAccessContext,
    pointOfSaleId?: string,
  ): Promise<ProductCategoryResponse[]> {
    let pointBranchId: string | undefined;

    if (pointOfSaleId) {
      const point = await this.prisma.pointOfSale.findFirst({
        where: {
          id: pointOfSaleId,
          ...this.pointWhere(access),
          active: true,
        },
        select: {
          id: true,
          branchId: true,
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      pointBranchId = point.branchId;
    }

   const rows = await this.prisma.productCategory.findMany({
  where: {
    companyId: access.companyId,
    active: true,

    ...(pointBranchId
      ? {
          OR: [
            { branchId: pointBranchId },
            { branchId: null },
          ],
        }
      : access.branchAccessMode === "ASSIGNED"
        ? {
            OR: [
              {
                branchId: {
                  in: access.branchIds,
                },
              },
              { branchId: null },
            ],
          }
        : {}),

    ...(pointOfSaleId
      ? {
          products: {
            some: {
              pointOfSaleId,
              active: true,
            },
          },
        }
      : {}),
  },

  orderBy: [
    { sortOrder: "asc" },
    { name: "asc" },
  ],
});

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      iconCode: row.iconCode,
      sortOrder: row.sortOrder,
      active: row.active,
    }));
  }

  async products(
    access: PosBranchAccessContext,
    pointOfSaleId?: string,
    categoryId?: string,
  ): Promise<ProductResponse[]> {
    if (pointOfSaleId) {
      const point = await this.prisma.pointOfSale.findFirst({
        where: {
          id: pointOfSaleId,
          ...this.pointWhere(access),
          active: true,
        },
        select: {
          id: true,
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }
    }

    if (pointOfSaleId) {
      const assignments = await this.prisma.productPointOfSale.findMany({
        where: {
          pointOfSaleId,
          active: true,
          productBranch: {
            companyId: access.companyId,
            active: true,
            ...(access.branchAccessMode === "ASSIGNED"
              ? { branchId: { in: access.branchIds } }
              : {}),
            ...(categoryId ? { categoryId } : {}),
            product: { active: true },
          },
        },
        include: {
          preparationStation: true,
          productBranch: {
            include: {
              product: true,
              category: true,
            },
          },
        },
        orderBy: {
          productBranch: {
            product: { name: "asc" },
          },
        },
      });

      return assignments.map((assignment) => {
        const row = assignment.productBranch.product;
        const branch = assignment.productBranch;

        return {
          id: row.id,
          sku: row.sku,
          barcode: row.barcode,
          name: row.name,
          description: row.description,
          type: row.type,
          saleUnit: row.saleUnit,
          price: Number(branch.price),
          unitCost:
            branch.unitCost === null ? null : Number(branch.unitCost),
          taxRate: Number(row.taxRate),
          stockQuantity: Number(branch.stockQuantity),
          trackInventory: branch.trackInventory,
          pointOfSaleId: assignment.pointOfSaleId,
          categoryId: branch.categoryId,
          categoryName: branch.category.name,
          preparationStationId: assignment.preparationStationId,
          preparationStationName: assignment.preparationStation?.name ?? null,
          active: row.active && branch.active && assignment.active,
          imageUrl: row.imageUrl,
          minimumStock: Number(branch.minimumStock),
        };
      });
    }

    // Compatibilidad temporal para consultas administrativas sin POS.
    const rows = await this.prisma.product.findMany({
      where: {
        companyId: access.companyId,
        active: true,
        ...(access.branchAccessMode === "ASSIGNED"
          ? {
              branchId: {
                in: access.branchIds,
              },
            }
          : {}),
        ...(pointOfSaleId ? { pointOfSaleId } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: true,
        preparationStation: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      description: row.description,
      type: row.type,
      saleUnit: row.saleUnit,
      price: Number(row.price),
      unitCost: row.unitCost === null ? null : Number(row.unitCost),
      taxRate: Number(row.taxRate),
      stockQuantity: Number(row.stockQuantity),
      trackInventory: row.trackInventory,
      pointOfSaleId: row.pointOfSaleId,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      preparationStationId: row.preparationStationId,
      preparationStationName: row.preparationStation?.name ?? null,
      active: row.active,
      imageUrl: row.imageUrl,
      minimumStock: Number(row.minimumStock),
    }));
  }

  async adminProducts(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
  ): Promise<ProductResponse[]> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const canManageAllBranches =
      this.canManageAllCompanyBranches(access);

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId: access.companyId,
        ...(!canManageAllBranches &&
        access.branchAccessMode === "ASSIGNED"
          ? { branchId: { in: access.branchIds } }
          : {}),
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const assignments = await this.prisma.productPointOfSale.findMany({
      where: {
        pointOfSaleId,
        productBranch: {
          companyId: access.companyId,
          ...(!canManageAllBranches &&
          access.branchAccessMode === "ASSIGNED"
            ? { branchId: { in: access.branchIds } }
            : {}),
        },
      },
      include: {
        preparationStation: true,
        productBranch: {
          include: {
            product: true,
            category: true,
          },
        },
      },
      orderBy: [
        { active: "desc" },
        { productBranch: { product: { name: "asc" } } },
      ],
    });

    return assignments.map((assignment) => {
      const row = assignment.productBranch.product;
      const branch = assignment.productBranch;

      return {
        id: row.id,
        sku: row.sku,
        barcode: row.barcode,
        name: row.name,
        description: row.description,
        type: row.type,
        saleUnit: row.saleUnit,
        price: Number(branch.price),
        unitCost: branch.unitCost === null ? null : Number(branch.unitCost),
        taxRate: Number(row.taxRate),
        stockQuantity: Number(branch.stockQuantity),
        trackInventory: branch.trackInventory,
        pointOfSaleId: assignment.pointOfSaleId,
        categoryId: branch.categoryId,
        categoryName: branch.category.name,
        preparationStationId: assignment.preparationStationId,
        preparationStationName: assignment.preparationStation?.name ?? null,
        active: row.active && branch.active && assignment.active,
        imageUrl: row.imageUrl,
        minimumStock: Number(branch.minimumStock),
      };
    });
  }

  async catalogProducts(
    pointOfSaleId: string,
    access: PosBranchAccessContext,
  ): Promise<ProductResponse[]> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const canManageAllBranches =
      this.canManageAllCompanyBranches(access);

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId: access.companyId,
        ...(!canManageAllBranches &&
        access.branchAccessMode === "ASSIGNED"
          ? {
              branchId: {
                in: access.branchIds,
              },
            }
          : {}),
        active: true,
      },
      select: { id: true, branchId: true },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const rows = await this.prisma.product.findMany({
      where: {
        companyId: access.companyId,
        active: true,
        NOT: {
          branchConfigurations: {
            some: {
              pointOfSales: {
                some: {
                  pointOfSaleId,
                  active: true,
                },
              },
            },
          },
        },
      },
      include: {
        category: true,
        preparationStation: true,
        branchConfigurations: {
          where: { branchId: point.branchId },
          include: {
            category: true,
            pointOfSales: {
              where: { pointOfSaleId },
              include: { preparationStation: true },
            },
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return rows.map((product) => {
      const branch = product.branchConfigurations[0];

      return {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        type: product.type,
        saleUnit: product.saleUnit,
        price: Number(branch?.price ?? product.price),
        unitCost:
          (branch?.unitCost ?? product.unitCost) === null
            ? null
            : Number(branch?.unitCost ?? product.unitCost),
        taxRate: Number(product.taxRate),
        stockQuantity: Number(branch?.stockQuantity ?? 0),
        trackInventory: branch?.trackInventory ?? product.trackInventory,
        pointOfSaleId,
        categoryId: branch?.categoryId ?? "",
        categoryName: branch?.category.name ?? "Sin asignar",
        preparationStationId: null,
        preparationStationName: null,
        active: product.active,
        imageUrl: product.imageUrl,
        minimumStock: Number(branch?.minimumStock ?? product.minimumStock),
      };
    });
  }

async bulkAssignProductsToPoint(
  dto: BulkAssignProductsToPointDto,
  actor: PosBranchAccessActor,
): Promise<{
  requested: number;
  assigned: number;
  inventoryInitialized: number;
  failed: number;
  errors: Array<{ productId: string; message: string }>;
}> {
  const requestedProducts = new Map<string, number>();

  for (const item of dto.products) {
    if (!requestedProducts.has(item.productId)) {
      requestedProducts.set(
        item.productId,
        item.initialStock ?? 0,
      );
    }
  }

  const productIds = [...requestedProducts.keys()];

  if (productIds.length === 0) {
    throw new BadRequestException(
      "Debes seleccionar al menos un producto.",
    );
  }

  const point = await this.prisma.pointOfSale.findFirst({
    where: {
      id: dto.pointOfSaleId,
      companyId: actor.companyId,
      ...(!this.canManageAllCompanyBranches(actor) &&
      actor.branchAccessMode === "ASSIGNED"
        ? {
            branchId: {
              in: actor.branchIds,
            },
          }
        : {}),
      active: true,
    },
    select: {
      id: true,
      branchId: true,
    },
  });

  if (!point) {
    throw new NotFoundException(
      "Punto de venta no encontrado.",
    );
  }

  const products = await this.prisma.product.findMany({
    where: {
      id: { in: productIds },
      companyId: actor.companyId,
      active: true,
    },
    select: {
      id: true,
      price: true,
      unitCost: true,
      minimumStock: true,
      trackInventory: true,
      branchConfigurations: {
        where: {
          branchId: point.branchId,
        },
        select: {
          price: true,
          minimumPrice: true,
          unitCost: true,
          minimumStock: true,
          trackInventory: true,
        },
        take: 1,
      },
    },
  });

  const productMap = new Map(
    products.map((product) => [product.id, product]),
  );

  let assigned = 0;
  let inventoryInitialized = 0;

  const errors: Array<{
    productId: string;
    message: string;
  }> = [];

  for (const productId of productIds) {
    const product = productMap.get(productId);
    const initialStock =
      requestedProducts.get(productId) ?? 0;

    if (!product) {
      errors.push({
        productId,
        message:
          "Producto activo no encontrado en la empresa.",
      });
      continue;
    }

    const branch = product.branchConfigurations[0];

    const price = Number(
      branch?.price ?? product.price,
    );

    const minimumPrice = Number(
      branch?.minimumPrice ??
        branch?.price ??
        product.price,
    );

    const effectiveUnitCost =
      branch?.unitCost ?? product.unitCost;

    const unitCost =
      effectiveUnitCost === null
        ? null
        : Number(effectiveUnitCost);

    const trackInventory =
      branch?.trackInventory ??
      product.trackInventory;

    const minimumStock = trackInventory
      ? Number(
          branch?.minimumStock ??
            product.minimumStock,
        )
      : 0;

    try {
      await this.assignProductToPoint(
        productId,
        {
          pointOfSaleId: dto.pointOfSaleId,
          preparationStationId: null,
          price,
          minimumPrice,
          unitCost,
          stockQuantity: 0,
          minimumStock,
          trackInventory,
        },
        actor,
        {
          initialStock,
        },
      );

      assigned += 1;

      if (initialStock > 0) {
        inventoryInitialized += 1;
      }
    } catch (reason) {
      errors.push({
        productId,
        message:
          reason instanceof Error
            ? reason.message
            : "No fue posible asignar el producto.",
      });
    }
  }

  return {
    requested: productIds.length,
    assigned,
    inventoryInitialized,
    failed: errors.length,
    errors,
  };
}

async assignProductToPoint(
  productId: string,
  dto: AssignProductToPointDto,
  actor: PosBranchAccessActor,
  options?: {
    initialStock?: number;
  },
): Promise<ProductResponse> {
  if (dto.stockQuantity > 0) {
    throw new BadRequestException(
      "La asignación no puede crear existencia. Asigna el producto con existencia cero y utiliza una transferencia de inventario.",
    );
  }

  if (dto.price < dto.minimumPrice) {
    throw new BadRequestException(
      "El precio de venta no puede ser menor que el precio mínimo.",
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const point = await tx.pointOfSale.findFirst({
      where: {
        id: dto.pointOfSaleId,
        companyId: actor.companyId,
        ...(!this.canManageAllCompanyBranches(actor) &&
        actor.branchAccessMode === "ASSIGNED"
          ? {
              branchId: {
                in: actor.branchIds,
              },
            }
          : {}),
        active: true,
      },
      select: { id: true, branchId: true },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const product = await tx.product.findFirst({
      where: {
        id: productId,
        companyId: actor.companyId,
        active: true,
      },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException("Producto no encontrado.");
    }

    if (!product.category.active) {
      throw new BadRequestException(
        "La categoría empresarial del producto está inactiva.",
      );
    }

    let preparationStation = null;

    if (dto.preparationStationId) {
      preparationStation = await tx.preparationStation.findFirst({
        where: {
          id: dto.preparationStationId,
          pointOfSaleId: point.id,
          active: true,
        },
      });

      if (!preparationStation) {
        throw new BadRequestException(
          "La estación de preparación no pertenece al punto de venta.",
        );
      }
    }

    const previousBranch = await tx.productBranch.findUnique({
      where: {
        productId_branchId: {
          productId,
          branchId: point.branchId,
        },
      },
    });

    const branch = await tx.productBranch.upsert({
      where: {
        productId_branchId: {
          productId,
          branchId: point.branchId,
        },
      },
      create: {
        companyId: actor.companyId,
        branchId: point.branchId,
        productId,
        categoryId: product.categoryId,
        price: dto.price,
        minimumPrice: dto.minimumPrice,
        unitCost: dto.unitCost ?? null,
        stockQuantity: 0,
        minimumStock: dto.trackInventory ? dto.minimumStock : 0,
        trackInventory: dto.trackInventory,
        active: true,
      },
      update: {
        categoryId: product.categoryId,
        price: dto.price,
        minimumPrice: dto.minimumPrice,
        unitCost: dto.unitCost ?? null,
        minimumStock: dto.trackInventory ? dto.minimumStock : 0,
        trackInventory: dto.trackInventory,
        active: true,
      },
    });

    const defaultLevel = await tx.priceLevel.findFirst({
      where: {
        companyId: actor.companyId,
        isDefault: true,
        active: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    if (!defaultLevel) {
      throw new BadRequestException(
        "La empresa no tiene un nivel de precio predeterminado.",
      );
    }

    await tx.productBranchPrice.upsert({
      where: {
        productBranchId_priceLevelId: {
          productBranchId: branch.id,
          priceLevelId: defaultLevel.id,
        },
      },
      create: {
        companyId: actor.companyId,
        productBranchId: branch.id,
        priceLevelId: defaultLevel.id,
        price: dto.price,
        active: true,
      },
      update: {
        price: dto.price,
        active: true,
      },
    });

    const assignment = await tx.productPointOfSale.upsert({
      where: {
        productBranchId_pointOfSaleId: {
          productBranchId: branch.id,
          pointOfSaleId: point.id,
        },
      },
      create: {
        productBranchId: branch.id,
        pointOfSaleId: point.id,
        preparationStationId: preparationStation?.id ?? null,
        active: true,
      },
      update: {
        preparationStationId: preparationStation?.id ?? null,
        active: true,
      },
    });

    const initialStock =
      options?.initialStock ?? 0;

    if (
      !Number.isFinite(initialStock) ||
      initialStock < 0
    ) {
      throw new BadRequestException(
        "La existencia inicial no puede ser negativa.",
      );
    }

    if (initialStock > 0) {
      if (!branch.trackInventory) {
        throw new BadRequestException(
          "No puedes establecer existencia inicial para un producto que no controla inventario.",
        );
      }

      /*
       * Serializa la inicialización contra ventas,
       * ajustes, transferencias y otras escrituras
       * concurrentes sobre el mismo ProductBranch.
       */
      const lockedBranch = await tx.$queryRaw<
        Array<{
          id: string;
        }>
      >`
        SELECT id
        FROM product_branches
        WHERE id = ${branch.id}
          AND company_id = ${actor.companyId}
        FOR UPDATE
      `;

      if (lockedBranch.length === 0) {
        throw new NotFoundException(
          "Producto no encontrado en la sucursal.",
        );
      }

      const currentBranch =
        await tx.productBranch.findUniqueOrThrow({
          where: {
            id: branch.id,
          },
        });

      const previousStock = Number(
        currentBranch.stockQuantity,
      );

      if (previousStock !== 0) {
        throw new BadRequestException(
          "La existencia inicial solo puede establecerse cuando la existencia actual es cero.",
        );
      }

      const movementCount =
        await tx.inventoryMovement.count({
          where: {
            companyId: actor.companyId,
            branchId: point.branchId,
            productId: product.id,
          },
        });

      if (movementCount > 0) {
        throw new BadRequestException(
          "El producto ya tiene historial de inventario en esta sucursal. Utiliza una entrada, ajuste o transferencia.",
        );
      }

      await tx.productBranch.update({
        where: {
          id: currentBranch.id,
        },
        data: {
          stockQuantity: initialStock,
        },
      });

      const initialMovement =
        await tx.inventoryMovement.create({
          data: {
            companyId: actor.companyId,
            branchId: point.branchId,
            pointOfSaleId: point.id,
            productId: product.id,

            type: "INITIAL",

            quantity: initialStock,
            previousStock: 0,
            newStock: initialStock,

            unitCost: currentBranch.unitCost,

            movementValue:
              currentBranch.unitCost === null
                ? null
                : roundMoney(
                    initialStock *
                      Number(currentBranch.unitCost),
                  ),

            referenceType:
              "PRODUCT_BULK_ASSIGNMENT",

            referenceNumber: null,

            note:
              "Existencia inicial por asignación masiva de artículo.",

            createdBy: actor.username,
          },
        });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "INITIALIZE_PRODUCT_STOCK",
          entityType: "INVENTORY_MOVEMENT",
          entityId: initialMovement.id,
          reason:
            "Existencia inicial por asignación masiva de artículo.",
          oldValues: {
            productId: product.id,
            branchId: point.branchId,
            stockQuantity: 0,
          },
          newValues: {
            productId: product.id,
            branchId: point.branchId,
            pointOfSaleId: point.id,
            type: "INITIAL",
            quantity: initialStock,
            stockQuantity: initialStock,
          },
          ipAddress: actor.ipAddress,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "ASSIGN_PRODUCT_TO_POS",
        entityType: "PRODUCT_POINT_OF_SALE",
        entityId: assignment.id,
        reason: null,
        oldValues: previousBranch
          ? {
              branchId: previousBranch.branchId,
              active: previousBranch.active,
            }
          : undefined,
        newValues: {
          productId,
          categoryId: product.categoryId,
          branchId: point.branchId,
          pointOfSaleId: point.id,
          price: Number(branch.price),
          minimumPrice: Number(branch.minimumPrice ?? branch.price),
          active: assignment.active,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      type: product.type,
      saleUnit: product.saleUnit,
      price: Number(branch.price),
      minimumPrice: Number(branch.minimumPrice ?? branch.price),
      unitCost: branch.unitCost === null ? null : Number(branch.unitCost),
      taxRate: Number(product.taxRate),
      stockQuantity: Number(branch.stockQuantity),
      trackInventory: branch.trackInventory,
      pointOfSaleId: point.id,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      preparationStationId: assignment.preparationStationId,
      preparationStationName: preparationStation?.name ?? null,
      active: product.active && branch.active && assignment.active,
      imageUrl: product.imageUrl,
      minimumStock: Number(branch.minimumStock),
    };
  });
}


  async updateProductImage(
    id: string,
    file: Express.Multer.File,
    actor: PosBranchAccessActor,
  ): Promise<ProductResponse> {
    if (!file) {
      throw new BadRequestException("Debes seleccionar una imagen.");
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: {
          id,
          companyId: actor.companyId,
          ...(actor.branchAccessMode === "ASSIGNED"
            ? {
                branchConfigurations: {
                  some: {
                    branchId: { in: actor.branchIds },
                  },
                },
              }
            : {}),
        },
      });

      if (!existing) {
        throw new NotFoundException("Producto no encontrado.");
      }

      const imageUrl = `/uploads/products/${file.filename}`;

      const product = await tx.product.update({
        where: { id },
        data: {
          imageUrl,
        },
        include: {
          category: true,
          preparationStation: true,
        },
      });

      const assignment = await tx.productPointOfSale.findFirstOrThrow({
        where: {
          productBranch: {
            productId: product.id,
            companyId: actor.companyId,
            ...(actor.branchAccessMode === "ASSIGNED"
              ? { branchId: { in: actor.branchIds } }
              : {}),
          },
        },
        include: {
          preparationStation: true,
          productBranch: {
            include: { category: true },
          },
        },
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      });

      const branchProduct = assignment.productBranch;

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_PRODUCT_IMAGE",
          entityType: "PRODUCT",
          entityId: product.id,
          reason: null,
          oldValues: {
            imageUrl: existing.imageUrl,
          },
          newValues: {
            imageUrl: product.imageUrl,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        type: product.type,
        saleUnit: product.saleUnit,
        price: Number(branchProduct.price),
        unitCost:
          branchProduct.unitCost === null ? null : Number(branchProduct.unitCost),
        taxRate: Number(product.taxRate),
        stockQuantity: Number(branchProduct.stockQuantity),
        trackInventory: branchProduct.trackInventory,
        pointOfSaleId: assignment.pointOfSaleId,
        categoryId: branchProduct.categoryId,
        categoryName: branchProduct.category.name,
        preparationStationId: assignment.preparationStationId,
        preparationStationName: assignment.preparationStation?.name ?? null,
        active: product.active && branchProduct.active && assignment.active,
        imageUrl: product.imageUrl,
        minimumStock: Number(branchProduct.minimumStock),
      };
    });
  }

async adminCategories(
  pointOfSaleId: string,
  access: PosBranchAccessContext,
): Promise<ProductCategoryResponse[]> {
  if (pointOfSaleId) {
    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        ...this.pointWhere(access),
      },
      select: { id: true },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }
  }

  const rows = await this.prisma.productCategory.findMany({
    where: {
      companyId: access.companyId,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    iconCode: row.iconCode,
    sortOrder: row.sortOrder,
    active: row.active,
  }));
}

async createProductCategory(
  dto: CreateProductCategoryDto,
  actor: PosBranchAccessActor,
): Promise<ProductCategoryResponse> {
  return this.prisma.$transaction(async (tx) => {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    const iconCode = dto.iconCode.trim();

    if (!code || !name || !iconCode) {
      throw new BadRequestException(
        "Código, nombre e icono son obligatorios.",
      );
    }

    const duplicatedCode = await tx.productCategory.findFirst({
      where: {
        companyId: actor.companyId,
        code,
      },
      select: { id: true },
    });

    if (duplicatedCode) {
      throw new BadRequestException(
        "Ya existe una categoría empresarial con ese código.",
      );
    }

    const row = await tx.productCategory.create({
      data: {
        companyId: actor.companyId,
        branchId: null,
        code,
        name,
        iconCode,
        sortOrder: dto.sortOrder ?? 0,
        active: true,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "CREATE_PRODUCT_CATEGORY",
        entityType: "PRODUCT_CATEGORY",
        entityId: row.id,
        reason: null,
        newValues: {
          code: row.code,
          name: row.name,
          scope: "COMPANY",
          active: row.active,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      iconCode: row.iconCode,
      sortOrder: row.sortOrder,
      active: row.active,
    };
  });
}


async updateProductCategory(
  id: string,
  dto: UpdateProductCategoryDto,
  actor: PosBranchAccessActor,
): Promise<ProductCategoryResponse> {
  return this.prisma.$transaction(async (tx) => {
    const existing = await tx.productCategory.findFirst({
      where: {
        id,
        companyId: actor.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException("Categoría empresarial no encontrada.");
    }

    const code =
      dto.code !== undefined
        ? dto.code.trim().toUpperCase()
        : existing.code;

    if (!code) {
      throw new BadRequestException("El código no puede quedar vacío.");
    }

    if (code !== existing.code) {
      const duplicatedCode = await tx.productCategory.findFirst({
        where: {
          companyId: actor.companyId,
          code,
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicatedCode) {
        throw new BadRequestException(
          "Ya existe otra categoría empresarial con ese código.",
        );
      }
    }

    const row = await tx.productCategory.update({
      where: { id },
      data: {
        branchId: null,
        ...(dto.code !== undefined ? { code } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.iconCode !== undefined
          ? { iconCode: dto.iconCode.trim() }
          : {}),
        ...(dto.sortOrder !== undefined
          ? { sortOrder: dto.sortOrder }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "UPDATE_PRODUCT_CATEGORY",
        entityType: "PRODUCT_CATEGORY",
        entityId: row.id,
        reason: null,
        oldValues: {
          code: existing.code,
          name: existing.name,
          iconCode: existing.iconCode,
          sortOrder: existing.sortOrder,
          active: existing.active,
        },
        newValues: {
          code: row.code,
          name: row.name,
          iconCode: row.iconCode,
          sortOrder: row.sortOrder,
          active: row.active,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      iconCode: row.iconCode,
      sortOrder: row.sortOrder,
      active: row.active,
    };
  });
}
  async preparationStations(
    pointOfSaleId: string,
    companyId: string,
  ): Promise<PreparationStationResponse[]> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const rows = await this.prisma.preparationStation.findMany({
      where: {
        pointOfSaleId,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      pointOfSaleId: row.pointOfSaleId,
      code: row.code,
      name: row.name,
      active: row.active,
      sortOrder: row.sortOrder,
    }));
  }

  async createPreparationStation(
    dto: CreatePreparationStationDto,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<PreparationStationResponse> {
    return this.prisma.$transaction(async (tx) => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: dto.pointOfSaleId,
          companyId: actor.companyId,
          active: true,
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const code = dto.code.trim().toUpperCase();
      const name = dto.name.trim();

      if (!code || !name) {
        throw new BadRequestException(
          "Código y nombre de la estación son obligatorios.",
        );
      }

      const duplicate = await tx.preparationStation.findFirst({
        where: {
          pointOfSaleId: point.id,
          code,
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          "Ya existe una estación con ese código en este punto de venta.",
        );
      }

      const row = await tx.preparationStation.create({
        data: {
          pointOfSaleId: point.id,
          code,
          name,
          sortOrder: dto.sortOrder ?? 0,
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CREATE_PREPARATION_STATION",
          entityType: "PREPARATION_STATION",
          entityId: row.id,
          reason: null,
          newValues: {
            pointOfSaleId: row.pointOfSaleId,
            code: row.code,
            name: row.name,
            active: row.active,
            sortOrder: row.sortOrder,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: row.id,
        pointOfSaleId: row.pointOfSaleId,
        code: row.code,
        name: row.name,
        active: row.active,
        sortOrder: row.sortOrder,
      };
    });
  }

  async updatePreparationStation(
    id: string,
    dto: UpdatePreparationStationDto,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<PreparationStationResponse> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.preparationStation.findFirst({
        where: {
          id,
          pointOfSale: {
            companyId: actor.companyId,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Estación de preparación no encontrada.");
      }

      const code = dto.code.trim().toUpperCase();
      const name = dto.name.trim();

      if (!code || !name) {
        throw new BadRequestException(
          "Código y nombre de la estación son obligatorios.",
        );
      }

      const duplicate = await tx.preparationStation.findFirst({
        where: {
          pointOfSaleId: existing.pointOfSaleId,
          code,
          id: {
            not: id,
          },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          "Ya existe otra estación con ese código en este punto de venta.",
        );
      }

      const row = await tx.preparationStation.update({
        where: {
          id,
        },
        data: {
          code,
          name,
          sortOrder: dto.sortOrder,
          active: dto.active,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_PREPARATION_STATION",
          entityType: "PREPARATION_STATION",
          entityId: row.id,
          reason: null,
          oldValues: {
            code: existing.code,
            name: existing.name,
            sortOrder: existing.sortOrder,
            active: existing.active,
          },
          newValues: {
            code: row.code,
            name: row.name,
            sortOrder: row.sortOrder,
            active: row.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: row.id,
        pointOfSaleId: row.pointOfSaleId,
        code: row.code,
        name: row.name,
        active: row.active,
        sortOrder: row.sortOrder,
      };
    });
  }

  async accounts(
    access: PosBranchAccessContext,
    pointOfSaleId?: string,
  ): Promise<PosAccountResponse[]> {
    if (pointOfSaleId) {
      const point = await this.prisma.pointOfSale.findFirst({
        where: {
          id: pointOfSaleId,
          active: true,
          ...this.pointWhere(access),
        },
        select: {
          id: true,
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }
    }

    const rows = await this.prisma.posAccount.findMany({
      where: {
        status: "OPEN",
        pointOfSale: {
          active: true,
          ...this.pointWhere(access),
        },
        ...(pointOfSaleId ? { pointOfSaleId } : {}),
      },
      include: accountInclude,
      orderBy: {
        openedAt: "asc",
      },
    });

    return rows.map((row) => this.mapAccount(row));
  }

  async account(
    accountId: string,
    access: PosBranchAccessContext,
  ): Promise<PosAccountResponse> {
    const account = await this.prisma.posAccount.findFirst({
      where: {
        id: accountId,
        pointOfSale: {
          ...this.pointWhere(access),
        },
      },
      include: accountInclude,
    });

    if (!account) {
      throw new NotFoundException("Cuenta de alimentos y bebidas no encontrada.");
    }

    return this.mapAccount(account);
  }

  async openAccount(
    dto: OpenPosAccountDto,
    actor: PosBranchAccessActor,
  ): Promise<PosAccountResponse> {
    return this.prisma.$transaction(async (tx) => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: dto.pointOfSaleId,
          active: true,
          ...this.pointWhere(actor),
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      if (dto.cashRegisterId) {
        const register = await tx.cashRegister.findFirst({
          where: {
            id: dto.cashRegisterId,
            pointOfSaleId: point.id,
            branchId: point.branchId,
            active: true,
          },
        });

        if (!register) {
          throw new BadRequestException(
            "La caja seleccionada no pertenece a este punto de venta.",
          );
        }
      }

      const saleMode: PosSaleModeValue = dto.saleMode ?? "DIRECT";

      const financialConfiguration =
        await tx.posFinancialConfiguration.findUnique({
          where: {
            pointOfSaleId: point.id,
          },
        });

      const serviceChargeRate = serviceChargeApplies(
        financialConfiguration,
        saleMode,
      )
        ? Number(financialConfiguration?.serviceChargeRate ?? 0)
        : 0;

      const reference = `CB-${Date.now()}`;

      const pricing = await this.resolveSalePricing(
        tx,
        actor.companyId,
        dto.customerId,
      );
      const customerAlias = pricing.customerName ?? dto.customerAlias.trim();

      if (!customerAlias) {
        throw new BadRequestException(
          "El nombre o alias del cliente es obligatorio.",
        );
      }

      const account = await tx.posAccount.create({
        data: {
          pointOfSaleId: point.id,
          cashRegisterId: dto.cashRegisterId,
          orderId: dto.orderId,
          reference,
          customerId: pricing.customerId,
          priceLevelId: pricing.priceLevelId,
          priceLevelCode: pricing.priceLevelCode,
          priceLevelName: pricing.priceLevelName,
          customerAlias,
          tableReference: dto.tableReference?.trim() || null,
          saleMode,
          serviceChargeRate,
          serviceChargeAmount: 0,
        },
        include: accountInclude,
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "OPEN_POS_ACCOUNT",
          entityType: "POS_ACCOUNT",
          entityId: account.id,
          reason: null,
          newValues: {
            reference: account.reference,
            pointOfSaleId: account.pointOfSaleId,
            branchId: point.branchId,
            cashRegisterId: account.cashRegisterId,
            customerAlias: account.customerAlias,
            customerId: account.customerId,
            priceLevelId: account.priceLevelId,
            priceLevelCode: account.priceLevelCode,
            tableReference: account.tableReference,
            saleMode: account.saleMode,
            status: account.status,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.mapAccount(account);
    });
  }

  async updateAccount(
    accountId: string,
    dto: UpdatePosAccountDto,
    actor: PosBranchAccessActor,
  ): Promise<PosAccountResponse> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.posAccount.findFirst({
        where: {
          id: accountId,
          pointOfSale: {
            ...this.pointWhere(actor),
          },
        },
      });

      if (!account) {
        throw new NotFoundException("Cuenta de alimentos y bebidas no encontrada.");
      }

      if (account.status !== "OPEN") {
        throw new BadRequestException(
          "Solo se pueden modificar cuentas abiertas.",
        );
      }

      const customerAlias = dto.customerAlias.trim();

      if (!customerAlias) {
        throw new BadRequestException(
          "El nombre o alias del cliente es obligatorio.",
        );
      }

      const tableReference = dto.tableReference?.trim() || null;

      const updated = await tx.posAccount.update({
        where: {
          id: accountId,
        },
        data: {
          customerAlias,
          tableReference,
        },
        include: accountInclude,
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_POS_ACCOUNT",
          entityType: "POS_ACCOUNT",
          entityId: accountId,
          reason: null,
          oldValues: {
            customerAlias: account.customerAlias,
            tableReference: account.tableReference,
          },
          newValues: {
            customerAlias: updated.customerAlias,
            tableReference: updated.tableReference,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.mapAccount(updated);
    });
  }

  async addAccountItems(
    accountId: string,
    dto: AddPosAccountItemsDto,
    actor: PosBranchAccessActor,
  ): Promise<PosAccountResponse> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.posAccount.findFirst({
        where: {
          id: accountId,
          pointOfSale: {
            active: true,
            ...this.pointWhere(actor),
          },
        },
      });

      if (!account) {
        throw new NotFoundException("Cuenta de alimentos y bebidas no encontrada.");
      }

      if (account.status !== "OPEN") {
        throw new BadRequestException(
          "Solo se pueden agregar consumos a una cuenta abierta.",
        );
      }

      const financialConfiguration =
        await tx.posFinancialConfiguration.findUnique({
          where: {
            pointOfSaleId: account.pointOfSaleId,
          },
        });

      const taxesEnabled = financialConfiguration?.taxesEnabled ?? false;

      const serviceChargeRate = Number(account.serviceChargeRate);

      const ids = [...new Set(dto.items.map((item) => item.productId))];

      for (const productId of [...ids].sort()) {
        const lockedProduct = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT pb.id
            FROM product_branches pb
            INNER JOIN product_points_of_sale pps
              ON pps.product_branch_id = pb.id
            INNER JOIN products p
              ON p.id = pb.product_id
            WHERE p.id = ${productId}
              AND pps.point_of_sale_id = ${account.pointOfSaleId}
              AND pb.company_id = ${actor.companyId}
              AND p.active = TRUE
              AND pb.active = TRUE
              AND pps.active = TRUE
              ${
                actor.branchAccessMode === "ASSIGNED"
                  ? Prisma.sql`AND pb.branch_id IN (${Prisma.join(actor.branchIds)})`
                  : Prisma.empty
              }
            FOR UPDATE
          `;

        if (lockedProduct.length === 0) {
          throw new BadRequestException("Producto no disponible.");
        }
      }

      const assignments = await tx.productPointOfSale.findMany({
        where: {
          pointOfSaleId: account.pointOfSaleId,
          active: true,
          productBranch: {
            companyId: actor.companyId,
            active: true,
            productId: { in: ids },
            ...(actor.branchAccessMode === "ASSIGNED"
              ? { branchId: { in: actor.branchIds } }
              : {}),
            product: { active: true },
          },
        },
        include: {
          productBranch: {
            include: {
              product: true,
              levelPrices: account.priceLevelId
                ? {
                    where: {
                      priceLevelId: account.priceLevelId,
                      active: true,
                    },
                    take: 1,
                  }
                : false,
            },
          },
        },
      });

      const productMap = new Map(
        assignments.map((assignment) => [
          assignment.productBranch.productId,
          assignment,
        ]),
      );

      let addedSubtotal = 0;
      let addedTax = 0;
      let addedServiceCharge = 0;

      for (const requested of dto.items) {
        const assignment = productMap.get(requested.productId);

        if (!assignment) {
          throw new BadRequestException("Producto no disponible.");
        }

        const product = assignment.productBranch.product;
        const branchProduct = assignment.productBranch;
        const standardUnitPrice = Number(branchProduct.price);
        const configuredUnitPrice = Number(
          branchProduct.levelPrices?.[0]?.price ?? branchProduct.price,
        );
        const minimumPrice = Number(
          branchProduct.minimumPrice ?? branchProduct.price,
        );

        const manualPriceOverride =
          requested.unitPrice !== undefined &&
          Math.abs(Number(requested.unitPrice) - configuredUnitPrice) > 0.0001;
        const priceOverrideReason = manualPriceOverride
          ? requested.priceOverrideReason?.trim() || null
          : null;

        if (
          manualPriceOverride &&
          actor.permissions?.includes(ERP_PERMISSIONS.posPriceOverride) !== true
        ) {
          throw new ForbiddenException(
            `No tienes permiso para modificar el precio de ${product.name}.`,
          );
        }

        if (manualPriceOverride && !priceOverrideReason) {
          throw new BadRequestException(
            `Debe indicar el motivo del cambio de precio de ${product.name}.`,
          );
        }

        const unitPrice = manualPriceOverride
          ? roundMoney(Number(requested.unitPrice))
          : configuredUnitPrice;

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new BadRequestException(
            `El precio indicado para ${product.name} no es válido.`,
          );
        }

        if (unitPrice < minimumPrice) {
          throw new BadRequestException(
            `El precio de ${product.name} no puede ser menor que RD$ ${minimumPrice.toFixed(2)}.`,
          );
        }

        if (
          branchProduct.trackInventory &&
          Number(branchProduct.stockQuantity) < requested.quantity
        ) {
          throw new BadRequestException(
            `Existencia insuficiente para ${product.name}.`,
          );
        }

        const base = roundMoney(unitPrice * requested.quantity);

        const appliedTaxRate = taxesEnabled ? Number(product.taxRate) : 0;

        const tax = roundMoney(base * appliedTaxRate);

        const lineTotal = roundMoney(base + tax);

        const serviceCharge = roundMoney(base * serviceChargeRate);

        const unitCost =
          branchProduct.unitCost === null ? null : Number(branchProduct.unitCost);

        const costTotal =
          unitCost === null ? null : roundMoney(unitCost * requested.quantity);

        const existingItem = await tx.posAccountItem.findFirst({
          where: {
            accountId,
            productId: product.id,
            taxRate: appliedTaxRate,
            unitPrice,
            manualPriceOverride,
            priceOverrideReason,
            priceLevelCode: account.priceLevelCode,
            unitCost:
              branchProduct.unitCost === null ? null : branchProduct.unitCost,
          },
        });

        if (existingItem) {
          await tx.posAccountItem.update({
            where: {
              id: existingItem.id,
            },
            data: {
              quantity: {
                increment: requested.quantity,
              },
              taxAmount: {
                increment: tax,
              },
              lineTotal: {
                increment: lineTotal,
              },
              ...(costTotal === null
                ? {}
                : {
                    costTotal: {
                      increment: costTotal,
                    },
                  }),
            },
          });
        } else {
          await tx.posAccountItem.create({
            data: {
              accountId,
              productId: product.id,
              quantity: requested.quantity,
              unitPrice,
              standardUnitPrice,
              priceLevelCode: account.priceLevelCode,
              priceLevelName: account.priceLevelName,
              manualPriceOverride,
              priceOverrideReason,
              unitCost:
                branchProduct.unitCost === null ? null : branchProduct.unitCost,
              costTotal,
              taxRate: appliedTaxRate,
              taxAmount: tax,
              lineTotal,
            },
          });
        }

        if (branchProduct.trackInventory) {
          const previousStock = Number(branchProduct.stockQuantity);

          if (previousStock < requested.quantity) {
            throw new BadRequestException(
              `Existencia insuficiente para ${product.name}.`,
            );
          }

          const newStock = previousStock - requested.quantity;

          await tx.productBranch.update({
            where: {
              id: branchProduct.id,
            },
            data: {
              stockQuantity: newStock,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              companyId: product.companyId,
              branchId: branchProduct.branchId,
              pointOfSaleId: account.pointOfSaleId,
              productId: product.id,
              type: "SALE",
              quantity: requested.quantity,
              previousStock,
              newStock,
              unitCost: branchProduct.unitCost,
              movementValue:
                branchProduct.unitCost === null
                  ? null
                  : roundMoney(
                      requested.quantity * Number(branchProduct.unitCost),
                    ),
              referenceType: "POS_ACCOUNT",
              referenceId: account.id,
              referenceNumber: account.reference,
              note: `Consumo de alimentos y bebidas ${account.reference}.`,
              createdBy: actor.username,
            },
          });
        }

        addedSubtotal = roundMoney(addedSubtotal + base);

        addedTax = roundMoney(addedTax + tax);

        addedServiceCharge = roundMoney(addedServiceCharge + serviceCharge);
      }

      await tx.posAccount.update({
        where: {
          id: accountId,
        },
        data: {
          subtotal: {
            increment: addedSubtotal,
          },
          taxAmount: {
            increment: addedTax,
          },
          serviceChargeAmount: {
            increment: addedServiceCharge,
          },
          total: {
            increment: roundMoney(
              addedSubtotal + addedTax + addedServiceCharge,
            ),
          },
        },
      });

      const updated = await tx.posAccount.findUniqueOrThrow({
        where: {
          id: accountId,
        },
        include: accountInclude,
      });

      return this.mapAccount(updated);
    });
  }

  async payAccount(
    accountId: string,
    dto: PayPosAccountDto,
    actor: PosBranchAccessActor,
  ): Promise<PosAccountResponse> {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: dto.paymentMethodId,
        active: true,
      },
    });

    if (!paymentMethod) {
      throw new BadRequestException("Método de pago no disponible.");
    }

    const account = await this.prisma.posAccount.findFirst({
      where: {
        id: accountId,
        pointOfSale: {
          active: true,
          ...this.pointWhere(actor),
        },
      },
    });

    if (!account) {
      throw new NotFoundException("Cuenta de alimentos y bebidas no encontrada.");
    }

    if (account.status !== "OPEN") {
      throw new BadRequestException("La cuenta ya fue cerrada.");
    }

    if (!account.cashRegisterId) {
      throw new BadRequestException("La cuenta no tiene una caja asociada.");
    }

    if (Number(account.total) <= 0) {
      throw new BadRequestException("La cuenta no tiene consumos para cobrar.");
    }

    const session = await this.resolveOpenCashSession(
      account.cashRegisterId,
      account.pointOfSaleId,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const scopedAccount = await tx.posAccount.findFirst({
        where: {
          id: accountId,
          status: "OPEN",
          pointOfSale: {
            ...this.pointWhere(actor),
          },
        },
      });

      if (!scopedAccount) {
        throw new NotFoundException("Cuenta de alimentos y bebidas no encontrada.");
      }

      const claimed = await tx.posAccount.updateMany({
        where: {
          id: accountId,
          status: "OPEN",
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
          closedAt: new Date(),
          paymentMethodId: paymentMethod.id,
          paymentReference: dto.paymentReference?.trim() || null,
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException(
          "La cuenta ya fue cerrada o está siendo cobrada por otra operación.",
        );
      }

      const paid = await tx.posAccount.findUniqueOrThrow({
        where: {
          id: accountId,
        },
        include: accountInclude,
      });

      await tx.payment.create({
        data: {
          paymentMethodId: paymentMethod.id,
          cashSessionId: session.id,
          amount: paid.total,
          reference: dto.paymentReference?.trim() || null,
          sourceType: "POS_ACCOUNT",
          sourceId: paid.id,
          description: `Cobro de cuenta ${paid.reference}.`,
        },
      });

      if (paymentMethod.type === "CASH") {
        await tx.cashMovement.create({
          data: {
            cashSessionId: session.id,
            type: "SALE",
            amount: paid.total,
            description: `Cobro de alimentos y bebidas ${paid.reference} por ${paymentMethod.name}.`,
            externalReference: dto.paymentReference?.trim() || null,
            referenceType: "POS_ACCOUNT",
            referenceId: paid.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "PAY_POS_ACCOUNT",
          entityType: "POS_ACCOUNT",
          entityId: paid.id,
          reason: null,
          oldValues: {
            status: "OPEN",
          },
          newValues: {
            status: "PAID",
            total: Number(paid.total),
            paymentMethodId: paymentMethod.id,
            pointOfSaleId: paid.pointOfSaleId,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return paid;
    });

    return this.mapAccount(updated);
  }

  async kitchenHistory(
    pointOfSaleId: string,
    dateFrom: string | undefined,
    dateTo: string | undefined,
    preparationStationId: string | undefined,
    companyId: string,
  ): Promise<KitchenHistoryResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    let selectedStationName: string | null = null;

    if (preparationStationId && preparationStationId !== "UNASSIGNED") {
      const station = await this.prisma.preparationStation.findFirst({
        where: { id: preparationStationId, pointOfSaleId },
      });

      if (!station) {
        throw new BadRequestException(
          "La estación de preparación no pertenece a este punto de venta.",
        );
      }

      selectedStationName = station.name;
    } else if (preparationStationId === "UNASSIGNED") {
      selectedStationName = "Sin estación";
    }

    const now = new Date();
    const from = dateFrom
      ? new Date(`${dateFrom}T00:00:00.000`)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const to = dateTo
      ? new Date(`${dateTo}T23:59:59.999`)
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException(
        "Las fechas deben usar formato YYYY-MM-DD.",
      );
    }

    if (from > to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        "El rango histórico no puede superar 366 días.",
      );
    }

    const stationFilter = preparationStationId
      ? preparationStationId === "UNASSIGNED"
        ? {
            items: {
              some: {
                accountItem: { product: { preparationStationId: null } },
              },
              every: {
                accountItem: { product: { preparationStationId: null } },
              },
            },
          }
        : {
            items: {
              some: { accountItem: { product: { preparationStationId } } },
              every: { accountItem: { product: { preparationStationId } } },
            },
          }
      : {};

    const rows = await this.prisma.kitchenTicket.findMany({
      where: {
        pointOfSaleId,
        sentAt: { gte: from, lte: to },
        ...stationFilter,
      },
      include: kitchenTicketInclude,
      orderBy: { sentAt: "asc" },
    });

    const metricsFor = (scope: typeof rows) => {
      const finished = scope.filter(
        (ticket) =>
          ticket.status === "COMPLETED" || ticket.status === "CANCELLED",
      );
      const completed = finished.filter(
        (ticket) => ticket.status === "COMPLETED",
      );
      const cancelled = finished.filter(
        (ticket) => ticket.status === "CANCELLED",
      );
      const totals = completed.map((ticket) =>
        durationMinutes(ticket.sentAt, ticket.completedAt),
      );
      const totalValues = totals.filter(
        (value): value is number => value !== null,
      );
      const compliant = totalValues.filter(
        (value) => value < KITCHEN_OVERDUE_MINUTES,
      ).length;
      const breached = totalValues.filter(
        (value) => value >= KITCHEN_OVERDUE_MINUTES,
      ).length;

      return {
        totalTickets: finished.length,
        completedTickets: completed.length,
        cancelledTickets: cancelled.length,
        slaCompliantTickets: compliant,
        slaBreachedTickets: breached,
        slaCompliancePercent: percentage(compliant, totalValues.length),
        averageWaitMinutes: averageMinutes(
          completed.map((ticket) =>
            durationMinutes(ticket.sentAt, ticket.startedAt),
          ),
        ),
        averagePreparationMinutes: averageMinutes(
          completed.map((ticket) =>
            durationMinutes(ticket.startedAt, ticket.readyAt),
          ),
        ),
        averageTotalMinutes: averageMinutes(totals),
        p50TotalMinutes: percentileMinutes(totals, 0.5),
        p90TotalMinutes: percentileMinutes(totals, 0.9),
      };
    };

    const overall = metricsFor(rows);

    const dayGroups = new Map<string, typeof rows>();
    for (const ticket of rows) {
      const key = ticket.sentAt.toISOString().slice(0, 10);
      const group = dayGroups.get(key) ?? [];
      group.push(ticket);
      dayGroups.set(key, group);
    }

    const byDay: KitchenHistorySeriesPoint[] = Array.from(
      dayGroups.entries(),
    ).map(([date, group]) => {
      const values = metricsFor(group);
      return {
        date,
        totalTickets: values.totalTickets,
        completedTickets: values.completedTickets,
        cancelledTickets: values.cancelledTickets,
        slaCompliantTickets: values.slaCompliantTickets,
        slaBreachedTickets: values.slaBreachedTickets,
        slaCompliancePercent: values.slaCompliancePercent,
        averageWaitMinutes: values.averageWaitMinutes,
        averagePreparationMinutes: values.averagePreparationMinutes,
        averageTotalMinutes: values.averageTotalMinutes,
      };
    });

    const stationGroups = new Map<
      string,
      {
        preparationStationId: string | null;
        preparationStationName: string;
        tickets: typeof rows;
      }
    >();

    for (const ticket of rows) {
      const station =
        ticket.items[0]?.accountItem.product.preparationStation ?? null;
      const key = station?.id ?? "UNASSIGNED";
      const group = stationGroups.get(key);

      if (group) {
        group.tickets.push(ticket);
      } else {
        stationGroups.set(key, {
          preparationStationId: station?.id ?? null,
          preparationStationName: station?.name ?? "Sin estación",
          tickets: [ticket],
        });
      }
    }

    const byStation: KitchenHistoryStationResponse[] = Array.from(
      stationGroups.values(),
    )
      .map((group) => ({
        preparationStationId: group.preparationStationId,
        preparationStationName: group.preparationStationName,
        ...metricsFor(group.tickets),
      }))
      .sort((a, b) =>
        a.preparationStationName.localeCompare(b.preparationStationName),
      );

    return {
      pointOfSaleId,
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
      preparationStationId:
        preparationStationId === "UNASSIGNED"
          ? null
          : (preparationStationId ?? null),
      preparationStationName: selectedStationName,
      generatedAt: now.toISOString(),
      slaMinutes: KITCHEN_OVERDUE_MINUTES,
      ...overall,
      byDay,
      byStation,
    };
  }

  async kitchenMetrics(
    pointOfSaleId: string,
    preparationStationId: string | undefined,
    companyId: string,
  ): Promise<KitchenMetricsResponse> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    if (preparationStationId && preparationStationId !== "UNASSIGNED") {
      const station = await this.prisma.preparationStation.findFirst({
        where: {
          id: preparationStationId,
          pointOfSaleId,
        },
      });

      if (!station) {
        throw new BadRequestException(
          "La estación de preparación no pertenece a este punto de venta.",
        );
      }
    }

    const now = new Date();
    const historyStart = new Date(
      now.getTime() - KITCHEN_METRICS_HISTORY_HOURS * 60 * 60 * 1000,
    );

    const stationFilter = preparationStationId
      ? preparationStationId === "UNASSIGNED"
        ? {
            items: {
              some: {
                accountItem: {
                  product: {
                    preparationStationId: null,
                  },
                },
              },
              every: {
                accountItem: {
                  product: {
                    preparationStationId: null,
                  },
                },
              },
            },
          }
        : {
            items: {
              some: {
                accountItem: {
                  product: {
                    preparationStationId,
                  },
                },
              },
              every: {
                accountItem: {
                  product: {
                    preparationStationId,
                  },
                },
              },
            },
          }
      : {};

    const rows = await this.prisma.kitchenTicket.findMany({
      where: {
        pointOfSaleId,
        ...stationFilter,
        OR: [
          {
            sentAt: {
              gte: historyStart,
            },
          },
          {
            status: {
              in: KITCHEN_ACTIVE_STATUSES,
            },
          },
        ],
      },
      include: kitchenTicketInclude,
      orderBy: {
        sentAt: "desc",
      },
    });

    const activeRows = rows.filter((ticket) =>
      KITCHEN_ACTIVE_STATUSES.includes(ticket.status),
    );

    const overdueRows = activeRows.filter(
      (ticket) =>
        (now.getTime() - ticket.sentAt.getTime()) / 60_000 >=
        KITCHEN_OVERDUE_MINUTES,
    );

    const historicalRows = rows.filter(
      (ticket) =>
        ticket.sentAt >= historyStart && ticket.status !== "CANCELLED",
    );

    const metricsForRows = (
      scope: typeof rows,
    ): Omit<
      KitchenStationMetricsResponse,
      "preparationStationId" | "preparationStationName"
    > => {
      const active = scope.filter((ticket) =>
        KITCHEN_ACTIVE_STATUSES.includes(ticket.status),
      );

      const historical = scope.filter(
        (ticket) =>
          ticket.sentAt >= historyStart && ticket.status !== "CANCELLED",
      );

      return {
        activeTickets: active.length,
        pendingTickets: active.filter((ticket) => ticket.status === "PENDING")
          .length,
        preparingTickets: active.filter(
          (ticket) => ticket.status === "PREPARING",
        ).length,
        readyTickets: active.filter((ticket) => ticket.status === "READY")
          .length,
        overdueTickets: active.filter(
          (ticket) =>
            (now.getTime() - ticket.sentAt.getTime()) / 60_000 >=
            KITCHEN_OVERDUE_MINUTES,
        ).length,
        averageWaitMinutes: averageMinutes(
          historical.map((ticket) =>
            durationMinutes(ticket.sentAt, ticket.startedAt),
          ),
        ),
        averagePreparationMinutes: averageMinutes(
          historical.map((ticket) =>
            durationMinutes(ticket.startedAt, ticket.readyAt),
          ),
        ),
        averageTotalMinutes: averageMinutes(
          historical.map((ticket) =>
            durationMinutes(ticket.sentAt, ticket.completedAt),
          ),
        ),
      };
    };

    const stationGroups = new Map<
      string,
      {
        preparationStationId: string | null;
        preparationStationName: string;
        tickets: typeof rows;
      }
    >();

    for (const ticket of rows) {
      const station =
        ticket.items[0]?.accountItem.product.preparationStation ?? null;

      const key = station?.id ?? "UNASSIGNED";
      const group = stationGroups.get(key);

      if (group) {
        group.tickets.push(ticket);
      } else {
        stationGroups.set(key, {
          preparationStationId: station?.id ?? null,
          preparationStationName: station?.name ?? "Sin estación",
          tickets: [ticket],
        });
      }
    }

    const byStation: KitchenStationMetricsResponse[] = Array.from(
      stationGroups.values(),
    )
      .map((group) => ({
        preparationStationId: group.preparationStationId,
        preparationStationName: group.preparationStationName,
        ...metricsForRows(group.tickets),
      }))
      .sort((left, right) =>
        left.preparationStationName.localeCompare(right.preparationStationName),
      );

    return {
      pointOfSaleId,
      generatedAt: now.toISOString(),
      historyWindowHours: KITCHEN_METRICS_HISTORY_HOURS,
      activeTickets: activeRows.length,
      pendingTickets: activeRows.filter((ticket) => ticket.status === "PENDING")
        .length,
      preparingTickets: activeRows.filter(
        (ticket) => ticket.status === "PREPARING",
      ).length,
      readyTickets: activeRows.filter((ticket) => ticket.status === "READY")
        .length,
      overdueTickets: overdueRows.length,
      averageWaitMinutes: averageMinutes(
        historicalRows.map((ticket) =>
          durationMinutes(ticket.sentAt, ticket.startedAt),
        ),
      ),
      averagePreparationMinutes: averageMinutes(
        historicalRows.map((ticket) =>
          durationMinutes(ticket.startedAt, ticket.readyAt),
        ),
      ),
      averageTotalMinutes: averageMinutes(
        historicalRows.map((ticket) =>
          durationMinutes(ticket.sentAt, ticket.completedAt),
        ),
      ),
      byStation,
    };
  }

  async kitchenTickets(
    pointOfSaleId: string,
    status: KitchenTicketStatusValue | undefined,
    accountId: string | undefined,
    preparationStationId: string | undefined,
    companyId: string,
  ): Promise<KitchenTicketResponse[]> {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    if (status && !KITCHEN_TICKET_STATUSES.includes(status)) {
      throw new BadRequestException("Estado de ticket de cocina no válido.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const rows = await this.prisma.kitchenTicket.findMany({
      where: {
        pointOfSaleId,
        ...(status ? { status } : {}),
        ...(accountId ? { accountId } : {}),
        ...(preparationStationId
          ? preparationStationId === "UNASSIGNED"
            ? {
                items: {
                  some: {
                    accountItem: {
                      product: {
                        preparationStationId: null,
                      },
                    },
                  },
                  every: {
                    accountItem: {
                      product: {
                        preparationStationId: null,
                      },
                    },
                  },
                },
              }
            : {
                items: {
                  some: {
                    accountItem: {
                      product: {
                        preparationStationId,
                      },
                    },
                  },
                  every: {
                    accountItem: {
                      product: {
                        preparationStationId,
                      },
                    },
                  },
                },
              }
          : {}),
      },
      include: kitchenTicketInclude,
      orderBy: {
        sentAt: "desc",
      },
    });

    return rows.map((row) => this.mapKitchenTicket(row));
  }

  async sendToKitchen(
    accountId: string,
    dto: SendToKitchenDto,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<KitchenTicketResponse[]> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.posAccount.findFirst({
        where: {
          id: accountId,
          pointOfSale: {
            companyId: actor.companyId,
          },
        },
        include: {
          pointOfSale: {
            include: {
              capabilities: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  preparationStation: true,
                },
              },
              kitchenTicketItems: {
                include: {
                  ticket: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!account) {
        throw new NotFoundException("Cuenta POS no encontrada.");
      }

      if (account.status !== "OPEN") {
        throw new BadRequestException(
          "Solo se pueden enviar a cocina consumos de una cuenta abierta.",
        );
      }

      const kitchenEnabled = account.pointOfSale.capabilities.some(
        (row) => row.capability === "KITCHEN_TICKETS" && row.enabled,
      );

      if (!kitchenEnabled) {
        throw new BadRequestException(
          "Kitchen Tickets no está habilitado para este punto de venta.",
        );
      }

      const pendingItems = account.items.flatMap((item) => {
        if (item.product.type !== "FOOD" && item.product.type !== "BEVERAGE") {
          return [];
        }

        const alreadySent = item.kitchenTicketItems
          .filter(
            (ticketItem) =>
              ticketItem.status !== "CANCELLED" &&
              ticketItem.ticket.status !== "CANCELLED",
          )
          .reduce((sum, ticketItem) => sum + Number(ticketItem.quantity), 0);

        const pendingQuantity =
          Math.round((Number(item.quantity) - alreadySent) * 1000) / 1000;

        if (pendingQuantity <= 0) {
          return [];
        }

        return [
          {
            accountItemId: item.id,
            quantity: pendingQuantity,
            preparationStationId: item.product.preparationStationId,
          },
        ];
      });

      if (pendingItems.length === 0) {
        throw new BadRequestException(
          "No hay nuevos artículos pendientes de enviar a cocina.",
        );
      }

      const groups = new Map<string, typeof pendingItems>();

      for (const item of pendingItems) {
        const key = item.preparationStationId ?? "UNASSIGNED";
        const current = groups.get(key) ?? [];
        current.push(item);
        groups.set(key, current);
      }

      const createdTickets: KitchenTicketResponse[] = [];

      for (const groupItems of groups.values()) {
        const ticketNumber = `KT-${randomUUID().slice(0, 8).toUpperCase()}`;

        const ticket = await tx.kitchenTicket.create({
          data: {
            pointOfSaleId: account.pointOfSaleId,
            accountId: account.id,
            ticketNumber,
            notes: dto.notes?.trim() || null,
            items: {
              create: groupItems.map((item) => ({
                accountItemId: item.accountItemId,
                quantity: item.quantity,
              })),
            },
          },
          include: kitchenTicketInclude,
        });

        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.userId,
            action: "SEND_TO_KITCHEN",
            entityType: "KITCHEN_TICKET",
            entityId: ticket.id,
            reason: null,
            newValues: {
              accountId: account.id,
              pointOfSaleId: account.pointOfSaleId,
              ticketNumber: ticket.ticketNumber,
              status: ticket.status,
              itemIds: groupItems.map((item) => item.accountItemId),
            },
            ipAddress: actor.ipAddress,
          },
        });

        createdTickets.push(this.mapKitchenTicket(ticket));
      }

      return createdTickets;
    });
  }

  async updateKitchenTicketItemStatus(
    itemId: string,
    dto: UpdateKitchenTicketItemStatusDto,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<KitchenTicketResponse> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.kitchenTicketItem.findFirst({
        where: {
          id: itemId,
          ticket: {
            pointOfSale: {
              companyId: actor.companyId,
            },
          },
        },
        include: {
          ticket: true,
        },
      });

      if (!current) {
        throw new NotFoundException(
          "Artículo de ticket de cocina no encontrado.",
        );
      }

      const nextStatus = dto.status;

      if (nextStatus === "CANCELLED") {
        throw new BadRequestException(
          "La cancelación de un artículo requiere un motivo y debe usar el endpoint de cancelación.",
        );
      }

      const previousStatus = current.status;

      if (previousStatus !== nextStatus) {
        const allowed = KITCHEN_TICKET_ITEM_TRANSITIONS[previousStatus];

        if (!allowed.includes(nextStatus)) {
          throw new BadRequestException(
            `No se puede cambiar el artículo de ${previousStatus} a ${nextStatus}.`,
          );
        }

        await tx.kitchenTicketItem.update({
          where: { id: itemId },
          data: { status: nextStatus },
        });

        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.userId,
            action: "UPDATE_KITCHEN_ITEM_STATUS",
            entityType: "KITCHEN_TICKET_ITEM",
            entityId: itemId,
            reason: null,
            oldValues: {
              status: previousStatus,
            },
            newValues: {
              status: nextStatus,
              ticketId: current.ticketId,
            },
            ipAddress: actor.ipAddress,
          },
        });
      }

      const updated = await this.syncKitchenTicketStatus(tx, current.ticketId);

      return this.mapKitchenTicket(updated);
    });
  }

  async cancelKitchenTicketItem(
    itemId: string,
    dto: CancelKitchenTicketItemDto,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<KitchenTicketResponse> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.kitchenTicketItem.findFirst({
        where: {
          id: itemId,
          ticket: {
            pointOfSale: {
              companyId: actor.companyId,
            },
          },
        },
      });

      if (!current) {
        throw new NotFoundException(
          "Artículo de ticket de cocina no encontrado.",
        );
      }

      if (current.status === "COMPLETED" || current.status === "CANCELLED") {
        throw new BadRequestException(
          "Solo se pueden cancelar artículos pendientes, en preparación o listos.",
        );
      }

      const reason = dto.reason.trim();

      if (reason.length < 3) {
        throw new BadRequestException(
          "Debe indicar un motivo de cancelación válido.",
        );
      }

      const previousStatus = current.status;
      const now = new Date();

      await tx.kitchenTicketItem.update({
        where: { id: itemId },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CANCEL_KITCHEN_ITEM",
          entityType: "KITCHEN_TICKET_ITEM",
          entityId: itemId,
          reason,
          oldValues: {
            status: previousStatus,
          },
          newValues: {
            status: "CANCELLED",
            ticketId: current.ticketId,
            cancelledAt: now.toISOString(),
          },
          ipAddress: actor.ipAddress,
        },
      });

      const updated = await this.syncKitchenTicketStatus(tx, current.ticketId);

      return this.mapKitchenTicket(updated);
    });
  }

  async cancelKitchenTicket(
    ticketId: string,
    dto: CancelKitchenTicketDto,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<KitchenTicketResponse> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.kitchenTicket.findFirst({
        where: {
          id: ticketId,
          pointOfSale: {
            companyId: actor.companyId,
          },
        },
        include: kitchenTicketInclude,
      });

      if (!current) {
        throw new NotFoundException("Ticket de cocina no encontrado.");
      }

      if (current.status === "COMPLETED" || current.status === "CANCELLED") {
        throw new BadRequestException(
          "Solo se pueden cancelar tickets activos.",
        );
      }

      const reason = dto.reason.trim();

      if (reason.length < 3) {
        throw new BadRequestException(
          "Debe indicar un motivo de cancelación válido.",
        );
      }

      const activeItemIds = current.items
        .filter(
          (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
        )
        .map((item) => item.id);

      if (activeItemIds.length === 0) {
        throw new BadRequestException(
          "El ticket no contiene artículos activos para cancelar.",
        );
      }

      const now = new Date();

      await tx.kitchenTicketItem.updateMany({
        where: {
          id: { in: activeItemIds },
        },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledAt: now,
        },
      });

      const updated = await this.syncKitchenTicketStatus(tx, ticketId);

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CANCEL_KITCHEN_TICKET",
          entityType: "KITCHEN_TICKET",
          entityId: ticketId,
          reason,
          oldValues: {
            status: current.status,
            activeItemIds,
          },
          newValues: {
            status: updated.status,
            cancelledAt:
              updated.cancelledAt?.toISOString() ?? now.toISOString(),
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.mapKitchenTicket(updated);
    });
  }

  async updateKitchenTicketStatus(
    ticketId: string,
    dto: UpdateKitchenTicketStatusDto,
    actor: {
      userId: string;
      companyId: string;
      username: string;
      ipAddress: string | null;
    },
  ): Promise<KitchenTicketResponse> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.kitchenTicket.findFirst({
        where: {
          id: ticketId,
          pointOfSale: {
            companyId: actor.companyId,
          },
        },
        include: kitchenTicketInclude,
      });

      if (!current) {
        throw new NotFoundException("Ticket de cocina no encontrado.");
      }

      const nextStatus = dto.status;

      if (nextStatus === "CANCELLED") {
        throw new BadRequestException(
          "La cancelación de un ticket requiere un motivo y debe usar el endpoint de cancelación.",
        );
      }

      if (current.status === nextStatus) {
        return this.mapKitchenTicket(current);
      }

      const allowed = KITCHEN_TICKET_TRANSITIONS[current.status];

      if (!allowed.includes(nextStatus)) {
        throw new BadRequestException(
          `No se puede cambiar el ticket de ${current.status} a ${nextStatus}.`,
        );
      }

      const previousStatus = current.status;
      const now = new Date();

      const ticketData: Prisma.KitchenTicketUpdateInput = {
        status: nextStatus,
      };

      if (nextStatus === "PREPARING") {
        ticketData.startedAt = now;
      }

      if (nextStatus === "READY") {
        ticketData.readyAt = now;
      }

      if (nextStatus === "COMPLETED") {
        ticketData.completedAt = now;
      }

      await tx.kitchenTicket.update({
        where: { id: ticketId },
        data: ticketData,
      });

      await tx.kitchenTicketItem.updateMany({
        where: {
          ticketId,
          status: {
            not: "CANCELLED",
          },
        },
        data: {
          status: nextStatus,
        },
      });

      const updated = await this.syncKitchenTicketStatus(tx, ticketId);

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_KITCHEN_TICKET_STATUS",
          entityType: "KITCHEN_TICKET",
          entityId: ticketId,
          reason: null,
          oldValues: {
            status: previousStatus,
          },
          newValues: {
            status: updated.status,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.mapKitchenTicket(updated);
    });
  }

  async directPayment(
    dto: CreateDirectPosPaymentDto,
    actor: PosBranchAccessActor,
  ): Promise<CreatePosMovementResponse> {
    return this.prisma.$transaction(async (tx) => {
      const paymentMethod = await tx.paymentMethod.findFirst({
        where: {
          id: dto.paymentMethodId,
          active: true,
        },
      });

      if (!paymentMethod) {
        throw new BadRequestException("Método de pago no disponible.");
      }

      const point = await tx.pointOfSale.findFirst({
        where: {
          id: dto.pointOfSaleId,
          active: true,
          ...this.pointWhere(actor),
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const register = await tx.cashRegister.findFirst({
        where: {
          id: dto.cashRegisterId,
          pointOfSaleId: point.id,
          branchId: point.branchId,
          active: true,
        },
      });

      if (!register) {
        throw new BadRequestException(
          "No existe una caja válida para este punto de venta.",
        );
      }

      const session = await tx.cashSession.findFirst({
        where: {
          cashRegisterId: register.id,
          status: "OPEN",
        },
      });

      if (!session) {
        throw new BadRequestException(
          "Debe abrir la caja antes de completar el cobro.",
        );
      }

      const movement = await this.createMovement(
        {
          pointOfSaleId: dto.pointOfSaleId,
          customerId: dto.customerId,
          customerAlias: dto.customerAlias,
          saleMode: dto.saleMode ?? "DIRECT",
          items: dto.items,
        },
        actor,
        tx,
      );

      await tx.payment.create({
        data: {
          paymentMethodId: paymentMethod.id,
          cashSessionId: session.id,
          amount: movement.total,
          reference: dto.paymentReference?.trim() || null,
          sourceType: "POS_DIRECT",
          sourceId: movement.id,
          description: `Venta directa ${movement.reference}.`,
        },
      });

      if (paymentMethod.type === "CASH") {
        await tx.cashMovement.create({
          data: {
            cashSessionId: session.id,
            type: "SALE",
            amount: movement.total,
            description: `Venta directa ${movement.reference} por ${paymentMethod.name}.`,
            externalReference: dto.paymentReference?.trim() || null,
            referenceType: "POS_DIRECT",
            referenceId: movement.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "PAY_POS_DIRECT",
          entityType: "POS_MOVEMENT",
          entityId: movement.id,
          reason: null,
          newValues: {
            pointOfSaleId: point.id,
            branchId: point.branchId,
            cashRegisterId: register.id,
            cashSessionId: session.id,
            paymentMethodId: paymentMethod.id,
            total: movement.total,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return movement;
    });
  }

  async createMovement(
    dto: CreatePosMovementDto,
    actor: PosBranchAccessActor,
    transactionClient?: Prisma.TransactionClient,
  ): Promise<CreatePosMovementResponse> {
    const execute = async (
      tx: Prisma.TransactionClient,
    ): Promise<CreatePosMovementResponse> => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: dto.pointOfSaleId,
          active: true,
          ...this.pointWhere(actor),
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const saleMode: PosSaleModeValue = dto.saleMode ?? "DIRECT";

      const pricing = await this.resolveSalePricing(
        tx,
        actor.companyId,
        dto.customerId,
      );

      const financialConfiguration =
        await tx.posFinancialConfiguration.findUnique({
          where: {
            pointOfSaleId: point.id,
          },
        });

      const taxesEnabled = financialConfiguration?.taxesEnabled ?? false;

      const serviceChargeRate = serviceChargeApplies(
        financialConfiguration,
        saleMode,
      )
        ? Number(financialConfiguration?.serviceChargeRate ?? 0)
        : 0;

      const productIds = [...new Set(dto.items.map((item) => item.productId))];

      /*
       * Serializa ventas concurrentes sobre los mismos productos.
       *
       * El bloqueo ocurre antes de leer stockQuantity para que
       * la validación de existencia y el movimiento de inventario
       * trabajen sobre el estado más reciente de cada producto.
       */
      for (const productId of [...productIds].sort()) {
        const lockedProduct = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT pb.id
            FROM product_branches pb
            INNER JOIN product_points_of_sale pps
              ON pps.product_branch_id = pb.id
            INNER JOIN products p
              ON p.id = pb.product_id
            WHERE p.id = ${productId}
              AND pps.point_of_sale_id = ${point.id}
              AND pb.company_id = ${actor.companyId}
              AND pb.branch_id = ${point.branchId}
              AND p.active = TRUE
              AND pb.active = TRUE
              AND pps.active = TRUE
            FOR UPDATE
          `;

        if (lockedProduct.length === 0) {
          throw new BadRequestException("Producto no disponible.");
        }
      }

      const assignments = await tx.productPointOfSale.findMany({
        where: {
          pointOfSaleId: point.id,
          active: true,
          productBranch: {
            companyId: actor.companyId,
            branchId: point.branchId,
            active: true,
            productId: { in: productIds },
            product: { active: true },
          },
        },
        include: {
          productBranch: {
            include: {
              product: true,
              levelPrices: pricing.priceLevelId
                ? {
                    where: {
                      priceLevelId: pricing.priceLevelId,
                      active: true,
                    },
                    take: 1,
                  }
                : false,
            },
          },
        },
      });

      const productMap = new Map(
        assignments.map((assignment) => [
          assignment.productBranch.productId,
          assignment,
        ]),
      );
      let subtotal = 0;
      let taxAmount = 0;

      const prepared = dto.items.map((item) => {
        const assignment = productMap.get(item.productId);

        if (!assignment) {
          throw new BadRequestException("Producto no disponible.");
        }

        const product = assignment.productBranch.product;
        const branchProduct = assignment.productBranch;
        const standardUnitPrice = Number(branchProduct.price);
        const configuredUnitPrice = Number(
          branchProduct.levelPrices?.[0]?.price ?? branchProduct.price,
        );
        const minimumPrice = Number(
          branchProduct.minimumPrice ?? branchProduct.price,
        );

        const manualPriceOverride =
          item.unitPrice !== undefined &&
          Math.abs(Number(item.unitPrice) - configuredUnitPrice) > 0.0001;
        const priceOverrideReason = manualPriceOverride
          ? item.priceOverrideReason?.trim() || null
          : null;

        if (
          manualPriceOverride &&
          actor.permissions?.includes(ERP_PERMISSIONS.posPriceOverride) !== true
        ) {
          throw new ForbiddenException(
            `No tienes permiso para modificar el precio de ${product.name}.`,
          );
        }

        if (manualPriceOverride && !priceOverrideReason) {
          throw new BadRequestException(
            `Debe indicar el motivo del cambio de precio de ${product.name}.`,
          );
        }

        const unitPrice = manualPriceOverride
          ? roundMoney(Number(item.unitPrice))
          : configuredUnitPrice;

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new BadRequestException(
            `El precio indicado para ${product.name} no es válido.`,
          );
        }

        if (unitPrice < minimumPrice) {
          throw new BadRequestException(
            `El precio de ${product.name} no puede ser menor que RD$ ${minimumPrice.toFixed(2)}.`,
          );
        }

        if (
          branchProduct.trackInventory &&
          Number(branchProduct.stockQuantity) < item.quantity
        ) {
          throw new BadRequestException(
            `Existencia insuficiente para ${product.name}.`,
          );
        }

        const base = roundMoney(unitPrice * item.quantity);
        const appliedTaxRate = taxesEnabled ? Number(product.taxRate) : 0;
        const tax = roundMoney(base * appliedTaxRate);
        const unitCost =
          branchProduct.unitCost === null ? null : Number(branchProduct.unitCost);
        const costTotal =
          unitCost === null ? null : roundMoney(unitCost * item.quantity);

        subtotal = roundMoney(subtotal + base);
        taxAmount = roundMoney(taxAmount + tax);

        return {
          product,
          branchProduct,
          unitPrice,
          standardUnitPrice,
          manualPriceOverride,
          priceOverrideReason,
          quantity: item.quantity,
          taxRate: appliedTaxRate,
          tax,
          unitCost,
          costTotal,
          total: roundMoney(base + tax),
        };
      });

      const serviceChargeAmount = roundMoney(subtotal * serviceChargeRate);
      const movementTotal = roundMoney(
        subtotal + taxAmount + serviceChargeAmount,
      );

      const movement = await tx.posMovement.create({
        data: {
          pointOfSaleId: point.id,
          orderId: dto.orderId,
          customerId: pricing.customerId,
          priceLevelId: pricing.priceLevelId,
          priceLevelCode: pricing.priceLevelCode,
          priceLevelName: pricing.priceLevelName,
          type: dto.orderId ? "ORDER_ASSOCIATED" : "DIRECT_SALE",
          reference: `POS-${Date.now()}`,
          customerAlias:
            pricing.customerName ?? (dto.customerAlias?.trim() || null),
          saleMode,
          subtotal,
          taxAmount,
          serviceChargeRate,
          serviceChargeAmount,
          total: movementTotal,
          items: {
            create: prepared.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              standardUnitPrice: item.standardUnitPrice,
              priceLevelCode: pricing.priceLevelCode,
              priceLevelName: pricing.priceLevelName,
              manualPriceOverride: item.manualPriceOverride,
              priceOverrideReason: item.priceOverrideReason,
              unitCost: item.unitCost,
              costTotal: item.costTotal,
              taxRate: item.taxRate,
              taxAmount: item.tax,
              lineTotal: item.total,
            })),
          },
        },
      });

      for (const item of prepared) {
        if (!item.branchProduct.trackInventory) {
          continue;
        }

        const previousStock = Number(item.branchProduct.stockQuantity);

        if (previousStock < item.quantity) {
          throw new BadRequestException(
            `Existencia insuficiente para ${item.product.name}.`,
          );
        }

        const newStock = previousStock - item.quantity;

        await tx.productBranch.update({
          where: {
            id: item.branchProduct.id,
          },
          data: {
            stockQuantity: newStock,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            companyId: item.product.companyId,

            branchId: item.branchProduct.branchId,

            pointOfSaleId: point.id,

            productId: item.product.id,

            type: "SALE",

            quantity: item.quantity,

            previousStock,
            newStock,
            unitCost: item.branchProduct.unitCost,
            movementValue:
              item.branchProduct.unitCost === null
                ? null
                : roundMoney(
                    item.quantity * Number(item.branchProduct.unitCost),
                  ),

            referenceType: dto.orderId ? "SERVICE_ORDER" : "POS_DIRECT",

            referenceId: movement.id,

            referenceNumber: movement.reference,

            note: dto.orderId
              ? `Consumo asociado a orden ${movement.reference}.`
              : `Venta directa de alimentos y bebidas ${movement.reference}.`,

            createdBy: actor.username,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CREATE_POS_MOVEMENT",
          entityType: "POS_MOVEMENT",
          entityId: movement.id,
          reason: null,
          newValues: {
            pointOfSaleId: point.id,
            type: movement.type,
            total: movementTotal,
            saleMode,
            priceOverrides: prepared
              .filter((item) => item.manualPriceOverride)
              .map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                standardUnitPrice: item.standardUnitPrice,
                unitPrice: item.unitPrice,
                reason: item.priceOverrideReason,
              })),
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: movement.id,
        reference: movement.reference,
        type: movement.type,
        orderId: movement.orderId,
        saleMode,
        subtotal,
        taxAmount,
        serviceChargeRate,
        serviceChargeAmount,
        total: movementTotal,
        customerId: pricing.customerId,
        customerAlias:
          pricing.customerName ?? (dto.customerAlias?.trim() || null),
        priceLevelId: pricing.priceLevelId,
        priceLevelCode: pricing.priceLevelCode,
        priceLevelName: pricing.priceLevelName,
        items: prepared.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          saleUnit: item.product.saleUnit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          standardUnitPrice: item.standardUnitPrice,
          lineTotal: item.total,
        })),
        message: dto.orderId
          ? "Consumo agregado correctamente a la orden."
          : "Venta directa cobrada correctamente.",
      };
    };

    return transactionClient
      ? execute(transactionClient)
      : this.prisma.$transaction(execute);
  }

  private async syncKitchenTicketStatus(
    tx: Prisma.TransactionClient,
    ticketId: string,
  ): Promise<KitchenTicketWithRelations> {
    const ticket = await tx.kitchenTicket.findUnique({
      where: {
        id: ticketId,
      },
      include: kitchenTicketInclude,
    });

    if (!ticket) {
      throw new NotFoundException("Ticket de cocina no encontrado.");
    }

    const statuses = ticket.items.map((item) => item.status);

    const activeStatuses = statuses.filter((status) => status !== "CANCELLED");

    let nextStatus: KitchenTicketStatusValue;

    if (activeStatuses.length === 0) {
      nextStatus = "CANCELLED";
    } else if (activeStatuses.every((status) => status === "COMPLETED")) {
      nextStatus = "COMPLETED";
    } else if (
      activeStatuses.every(
        (status) => status === "READY" || status === "COMPLETED",
      )
    ) {
      nextStatus = "READY";
    } else if (activeStatuses.every((status) => status === "PENDING")) {
      nextStatus = "PENDING";
    } else {
      nextStatus = "PREPARING";
    }

    const now = new Date();
    const data: Prisma.KitchenTicketUpdateInput = {
      status: nextStatus,
    };

    if (nextStatus === "PREPARING" && !ticket.startedAt) {
      data.startedAt = now;
    }

    if (nextStatus === "READY" && !ticket.readyAt) {
      data.readyAt = now;
    }

    if (nextStatus === "COMPLETED" && !ticket.completedAt) {
      data.completedAt = now;
    }

    if (nextStatus === "CANCELLED" && !ticket.cancelledAt) {
      data.cancelledAt = now;
    }

    if (nextStatus !== ticket.status) {
      await tx.kitchenTicket.update({
        where: {
          id: ticketId,
        },
        data,
      });
    } else {
      const timestampKeys = Object.keys(data).filter((key) => key !== "status");

      if (timestampKeys.length > 0) {
        await tx.kitchenTicket.update({
          where: {
            id: ticketId,
          },
          data,
        });
      }
    }

    return tx.kitchenTicket.findUniqueOrThrow({
      where: {
        id: ticketId,
      },
      include: kitchenTicketInclude,
    });
  }

  private async resolveOpenCashSession(
    cashRegisterId: string | null | undefined,
    pointOfSaleId: string,
  ): Promise<{ id: string }> {
    const register = cashRegisterId
      ? await this.prisma.cashRegister.findFirst({
          where: {
            id: cashRegisterId,
            pointOfSaleId,
            active: true,
          },
        })
      : await this.prisma.cashRegister.findFirst({
          where: {
            pointOfSaleId,
            active: true,
          },
        });

    if (!register) {
      throw new BadRequestException(
        "No existe una caja configurada para este punto de venta.",
      );
    }

    const session = await this.prisma.cashSession.findFirst({
      where: {
        cashRegisterId: register.id,
        status: "OPEN",
      },
    });

    if (!session) {
      throw new BadRequestException(
        "Debe abrir la caja antes de completar el cobro.",
      );
    }

    return session;
  }

  private async registerPayment(
    paymentMethodId: string,
    cashSessionId: string,
    amount: number,
    sourceType: string,
    sourceId: string,
    reference?: string,
    description?: string,
  ): Promise<void> {
    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        active: true,
      },
    });

    if (!method) {
      throw new BadRequestException("Método de pago no disponible.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          paymentMethodId: method.id,
          cashSessionId,
          amount,
          reference: reference?.trim() || null,
          sourceType,
          sourceId,
          description: description ?? null,
        },
      });

      if (method.type === "CASH") {
        await tx.cashMovement.create({
          data: {
            cashSessionId,
            type: "SALE",
            amount,
            description:
              description ?? `Cobro ${sourceType} por ${method.name}.`,
            externalReference: reference?.trim() || null,
            referenceType: sourceType,
            referenceId: sourceId,
          },
        });
      }
    });
  }

  private mapKitchenTicket(
    ticket: KitchenTicketWithRelations,
  ): KitchenTicketResponse {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      pointOfSaleId: ticket.pointOfSaleId,
      pointOfSaleName: ticket.pointOfSale.name,
      accountId: ticket.accountId,
      accountReference: ticket.account.reference,
      customerAlias: ticket.account.customerAlias,
      tableReference: ticket.account.tableReference,
      preparationStationId:
        ticket.items[0]?.accountItem.product.preparationStationId ?? null,
      preparationStationName:
        ticket.items[0]?.accountItem.product.preparationStation?.name ?? null,
      status: ticket.status,
      notes: ticket.notes,
      sentAt: ticket.sentAt.toISOString(),
      startedAt: ticket.startedAt?.toISOString() ?? null,
      readyAt: ticket.readyAt?.toISOString() ?? null,
      completedAt: ticket.completedAt?.toISOString() ?? null,
      cancelledAt: ticket.cancelledAt?.toISOString() ?? null,
      items: ticket.items.map((item) => ({
        id: item.id,
        accountItemId: item.accountItemId,
        productId: item.accountItem.productId,
        productName: item.accountItem.product.name,
        preparationStationId: item.accountItem.product.preparationStationId,
        preparationStationName:
          item.accountItem.product.preparationStation?.name ?? null,
        quantity: Number(item.quantity),
        status: item.status,
        notes: item.notes,
        cancellationReason: item.cancellationReason,
        cancelledAt: item.cancelledAt?.toISOString() ?? null,
      })),
    };
  }

  private mapAccount(account: AccountWithRelations): PosAccountResponse {
    return {
      id: account.id,
      reference: account.reference,
      customerId: account.customerId,
      priceLevelId: account.priceLevelId,
      priceLevelCode: account.priceLevelCode,
      priceLevelName: account.priceLevelName,
      customerAlias: account.customerAlias,
      tableReference: account.tableReference,
      status: account.status,
      saleMode: account.saleMode,
      orderId: account.orderId,
      orderNumber: account.order?.orderNumber ?? null,
      pointOfSaleId: account.pointOfSaleId,
      pointOfSaleName: account.pointOfSale.name,
      cashRegisterId: account.cashRegisterId,
      cashRegisterName: account.cashRegister?.name ?? null,
      subtotal: Number(account.subtotal),
      taxAmount: Number(account.taxAmount),
      serviceChargeRate: Number(account.serviceChargeRate),
      serviceChargeAmount: Number(account.serviceChargeAmount),
      total: Number(account.total),
      openedAt: account.openedAt.toISOString(),
      paidAt: account.paidAt?.toISOString() ?? null,
      paymentMethodId: account.paymentMethodId,
      paymentMethodName: account.paymentMethod?.name ?? null,
      items: account.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        saleUnit: item.product.saleUnit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        standardUnitPrice: Number(item.standardUnitPrice),
        priceLevelCode: item.priceLevelCode,
        priceLevelName: item.priceLevelName,
        manualPriceOverride: item.manualPriceOverride,
        priceOverrideReason: item.priceOverrideReason,
        unitCost: item.unitCost === null ? null : Number(item.unitCost),
        costTotal: item.costTotal === null ? null : Number(item.costTotal),
        taxRate: Number(item.taxRate),
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      })),
    };
  }
  async createProduct(
    dto: CreateProductDto,
    actor: PosBranchAccessActor,
  ): Promise<ProductResponse> {
    return this.prisma.$transaction(async (tx) => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: dto.pointOfSaleId,
          ...this.pointWhere(actor),
          active: true,
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const category = await tx.productCategory.findFirst({
        where: {
          id: dto.categoryId,
          companyId: actor.companyId,
          active: true,
          OR: [
            { branchId: point.branchId },
            { branchId: null },
          ],
        },
      });

      if (!category) {
        throw new BadRequestException(
          "La categoría no pertenece a la empresa o sucursal del punto de venta.",
        );
      }

      let preparationStation = null;

      if (dto.preparationStationId) {
        preparationStation = await tx.preparationStation.findFirst({
          where: {
            id: dto.preparationStationId,
            pointOfSaleId: point.id,
            active: true,
          },
        });

        if (!preparationStation) {
          throw new BadRequestException(
            "La estación de preparación no pertenece a este punto de venta o está inactiva.",
          );
        }
      }

      const sku = dto.sku.trim();
      const barcode = dto.barcode?.trim() || null;

      const existingSku = await tx.product.findUnique({
        where: {
          companyId_sku: {
            companyId: actor.companyId,
            sku,
          },
        },
      });

      if (existingSku) {
        throw new BadRequestException("Ya existe un producto con ese SKU.");
      }

      if (barcode) {
        const existingBarcode = await tx.product.findFirst({
          where: {
            companyId: actor.companyId,
            barcode,
          },
        });

        if (existingBarcode) {
          throw new BadRequestException(
            "Ya existe un producto con ese código de barras.",
          );
        }
      }

      const product = await tx.product.create({
        data: {
          companyId: actor.companyId,
          branchId: point.branchId,
          pointOfSaleId: point.id,
          categoryId: category.id,
          preparationStationId: preparationStation?.id ?? null,
          sku,
          barcode,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          type: dto.type,
          saleUnit: dto.saleUnit,
          price: dto.price,
          unitCost: dto.unitCost ?? null,
          taxRate: dto.taxRate,
          stockQuantity: dto.stockQuantity,
          minimumStock: dto.minimumStock,
          trackInventory: dto.trackInventory,
          active: true,
        },
      });

      const branchConfiguration = await tx.productBranch.create({
        data: {
          companyId: actor.companyId,
          branchId: point.branchId,
          productId: product.id,
          categoryId: category.id,
          price: dto.price,
          unitCost: dto.unitCost ?? null,
          stockQuantity: dto.stockQuantity,
          minimumStock: dto.minimumStock,
          trackInventory: dto.trackInventory,
          active: true,
        },
      });

      await tx.productPointOfSale.create({
        data: {
          productBranchId: branchConfiguration.id,
          pointOfSaleId: point.id,
          preparationStationId: preparationStation?.id ?? null,
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CREATE_PRODUCT",
          entityType: "PRODUCT",
          entityId: product.id,
          reason: null,
          newValues: {
            sku: product.sku,
            name: product.name,
            pointOfSaleId: product.pointOfSaleId,
            categoryId: product.categoryId,
            price: Number(product.price),
            unitCost:
              product.unitCost === null ? null : Number(product.unitCost),
            active: product.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        type: product.type,
        saleUnit: product.saleUnit,
        price: Number(branchConfiguration.price),
        unitCost:
          branchConfiguration.unitCost === null
            ? null
            : Number(branchConfiguration.unitCost),
        taxRate: Number(product.taxRate),
        stockQuantity: Number(branchConfiguration.stockQuantity),
        minimumStock: Number(branchConfiguration.minimumStock),
        trackInventory: branchConfiguration.trackInventory,
        pointOfSaleId: product.pointOfSaleId,
        categoryId: product.categoryId,
        categoryName: category.name,
        preparationStationId: product.preparationStationId,
        preparationStationName: preparationStation?.name ?? null,
        active: product.active,
        imageUrl: product.imageUrl,
      };
    });
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    actor: PosBranchAccessActor,
  ): Promise<ProductResponse> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: {
          id,
          companyId: actor.companyId,
          ...(actor.branchAccessMode === "ASSIGNED"
            ? {
                branchConfigurations: {
                  some: {
                    branchId: { in: actor.branchIds },
                  },
                },
              }
            : {}),
        },
      });

      if (!existing) {
        throw new NotFoundException("Producto no encontrado.");
      }

      const point = await tx.pointOfSale.findFirst({
        where: {
          id: dto.pointOfSaleId,
          ...this.pointWhere(actor),
          active: true,
        },
      });

      if (!point) {
        throw new NotFoundException("Punto de venta no encontrado.");
      }

      const category = await tx.productCategory.findFirst({
        where: {
          id: dto.categoryId,
          companyId: actor.companyId,
          OR: [
            { branchId: point.branchId },
            { branchId: null },
          ],
        },
      });

      if (!category) {
        throw new BadRequestException(
          "La categoría no pertenece a la empresa o sucursal del punto de venta.",
        );
      }

      let preparationStation = null;

      if (dto.preparationStationId) {
        preparationStation = await tx.preparationStation.findFirst({
          where: {
            id: dto.preparationStationId,
            pointOfSaleId: point.id,
            active: true,
          },
        });

        if (!preparationStation) {
          throw new BadRequestException(
            "La estación de preparación no pertenece a este punto de venta o está inactiva.",
          );
        }
      }

      const sku = dto.sku.trim();
      const barcode = dto.barcode?.trim() || null;

      const duplicatedSku = await tx.product.findFirst({
        where: {
          companyId: actor.companyId,
          sku,
          id: {
            not: id,
          },
        },
      });

      if (duplicatedSku) {
        throw new BadRequestException("Ya existe otro producto con ese SKU.");
      }

      if (barcode) {
        const duplicatedBarcode = await tx.product.findFirst({
          where: {
            companyId: actor.companyId,
            barcode,
            id: {
              not: id,
            },
          },
        });

        if (duplicatedBarcode) {
          throw new BadRequestException(
            "Ya existe otro producto con ese código de barras.",
          );
        }
      }

      const product = await tx.product.update({
        where: {
          id,
        },
        data: {
          companyId: actor.companyId,
          branchId: point.branchId,
          pointOfSaleId: point.id,
          categoryId: category.id,
          preparationStationId: preparationStation?.id ?? null,
          sku,
          barcode,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          type: dto.type,
          saleUnit: dto.saleUnit,
          price: dto.price,
          unitCost: dto.unitCost ?? null,
          taxRate: dto.taxRate,
          stockQuantity: dto.stockQuantity,
          minimumStock: dto.minimumStock,
          trackInventory: dto.trackInventory,
          active: dto.active,
        },
      });

      const branchConfiguration = await tx.productBranch.upsert({
        where: {
          productId_branchId: {
            productId: product.id,
            branchId: point.branchId,
          },
        },
        create: {
          companyId: actor.companyId,
          branchId: point.branchId,
          productId: product.id,
          categoryId: category.id,
          price: dto.price,
          unitCost: dto.unitCost ?? null,
          stockQuantity: dto.stockQuantity,
          minimumStock: dto.minimumStock,
          trackInventory: dto.trackInventory,
          active: dto.active,
        },
        update: {
          categoryId: category.id,
          price: dto.price,
          unitCost: dto.unitCost ?? null,
          stockQuantity: dto.stockQuantity,
          minimumStock: dto.minimumStock,
          trackInventory: dto.trackInventory,
          active: dto.active,
        },
      });

      await tx.productPointOfSale.upsert({
        where: {
          productBranchId_pointOfSaleId: {
            productBranchId: branchConfiguration.id,
            pointOfSaleId: point.id,
          },
        },
        create: {
          productBranchId: branchConfiguration.id,
          pointOfSaleId: point.id,
          preparationStationId: preparationStation?.id ?? null,
          active: dto.active,
        },
        update: {
          preparationStationId: preparationStation?.id ?? null,
          active: dto.active,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_PRODUCT",
          entityType: "PRODUCT",
          entityId: product.id,
          reason: null,
          oldValues: {
            sku: existing.sku,
            name: existing.name,
            pointOfSaleId: existing.pointOfSaleId,
            categoryId: existing.categoryId,
            price: Number(existing.price),
            unitCost:
              existing.unitCost === null ? null : Number(existing.unitCost),
            active: existing.active,
          },
          newValues: {
            sku: product.sku,
            name: product.name,
            pointOfSaleId: product.pointOfSaleId,
            categoryId: product.categoryId,
            price: Number(product.price),
            unitCost:
              product.unitCost === null ? null : Number(product.unitCost),
            active: product.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        type: product.type,
        saleUnit: product.saleUnit,
        price: Number(branchConfiguration.price),
        unitCost:
          branchConfiguration.unitCost === null
            ? null
            : Number(branchConfiguration.unitCost),
        taxRate: Number(product.taxRate),
        stockQuantity: Number(branchConfiguration.stockQuantity),
        minimumStock: Number(branchConfiguration.minimumStock),
        trackInventory: branchConfiguration.trackInventory,
        pointOfSaleId: product.pointOfSaleId,
        categoryId: product.categoryId,
        categoryName: category.name,
        preparationStationId: product.preparationStationId,
        preparationStationName: preparationStation?.name ?? null,
        active: product.active,
        imageUrl: product.imageUrl,
      };
    });
  }

  async adminProduct(
    id: string,
    access: PosBranchAccessContext,
    pointOfSaleId?: string,
  ): Promise<ProductResponse> {
    const assignment = await this.prisma.productPointOfSale.findFirst({
      where: {
        ...(pointOfSaleId ? { pointOfSaleId } : {}),
        productBranch: {
          productId: id,
          companyId: access.companyId,
          ...(access.branchAccessMode === "ASSIGNED"
            ? { branchId: { in: access.branchIds } }
            : {}),
        },
      },
      include: {
        preparationStation: true,
        productBranch: {
          include: {
            product: true,
            category: true,
          },
        },
      },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    });

    if (!assignment) {
      throw new NotFoundException("Producto no encontrado.");
    }

    const product = assignment.productBranch.product;
    const branchProduct = assignment.productBranch;

    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      type: product.type,
      saleUnit: product.saleUnit,
      price: Number(branchProduct.price),
      unitCost:
        branchProduct.unitCost === null ? null : Number(branchProduct.unitCost),
      taxRate: Number(product.taxRate),
      stockQuantity: Number(branchProduct.stockQuantity),
      trackInventory: branchProduct.trackInventory,
      pointOfSaleId: assignment.pointOfSaleId,
      categoryId: branchProduct.categoryId,
      categoryName: branchProduct.category.name,
      preparationStationId: assignment.preparationStationId,
      preparationStationName: assignment.preparationStation?.name ?? null,
      active: product.active && branchProduct.active && assignment.active,
      imageUrl: product.imageUrl,
      minimumStock: Number(branchProduct.minimumStock),
    };
  }

  async inventoryMovements(
    productId: string,
    access: PosBranchAccessContext,
    pointOfSaleId?: string,
  ): Promise<InventoryMovementResponse[]> {
    const branchProduct = await this.prisma.productBranch.findFirst({
      where: {
        productId,
        companyId: access.companyId,
        ...(pointOfSaleId
          ? {
              pointOfSales: {
                some: { pointOfSaleId },
              },
            }
          : {}),
        ...(access.branchAccessMode === "ASSIGNED"
          ? { branchId: { in: access.branchIds } }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    if (!branchProduct) {
      throw new NotFoundException("Producto no encontrado.");
    }

    const rows = await this.prisma.inventoryMovement.findMany({
      where: {
        productId,
        companyId: access.companyId,
        branchId: branchProduct.branchId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      type: row.type,
      quantity: Number(row.quantity),
      previousStock: Number(row.previousStock),
      newStock: Number(row.newStock),
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      referenceNumber: row.referenceNumber,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async inventoryKardex(
    access: PosBranchAccessContext,
    filters: {
      branchId?: string;
      productId?: string;
      from?: string;
      to?: string;
    },
  ): Promise<InventoryKardexEntryResponse[]> {
    const canManageAllBranches =
      this.canManageAllCompanyBranches(access);

    const allowedBranches = await this.prisma.branch.findMany({
      where: {
        companyId: access.companyId,
        ...(!canManageAllBranches && access.branchAccessMode === "ASSIGNED"
          ? { id: { in: access.branchIds } }
          : {}),
      },
      select: { id: true },
    });
    const branchIds = allowedBranches.map((branch) => branch.id);

    if (filters.branchId && !branchIds.includes(filters.branchId)) {
      throw new ForbiddenException("No tienes acceso a esta sucursal.");
    }

    const parseDate = (
      value: string | undefined,
      endOfDay: boolean,
    ): Date | undefined => {
      if (!value) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestException("La fecha debe usar el formato AAAA-MM-DD.");
      }
      const date = new Date(`${value}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Fecha inválida.");
      }
      return date;
    };

    const from = parseDate(filters.from, false);
    const to = parseDate(filters.to, true);
    if (from && to && from > to) {
      throw new BadRequestException("La fecha inicial no puede superar la fecha final.");
    }

    if (filters.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: filters.productId, companyId: access.companyId },
        select: { id: true },
      });
      if (!product) throw new NotFoundException("Producto no encontrado.");
    }

    const rows = await this.prisma.inventoryMovement.findMany({
      where: {
        companyId: access.companyId,
        branchId: filters.branchId ?? { in: branchIds },
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: {
        branch: { select: { code: true, name: true } },
        product: { select: { sku: true, name: true } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 5000,
    });

    const entries = new Set([
      "INITIAL",
      "PURCHASE",
      "ADJUSTMENT_IN",
      "RETURN_IN",
      "TRANSFER_IN",
    ]);

    return rows.map((row) => {
      const quantity = Number(row.quantity);
      const unitCost = row.unitCost === null ? null : Number(row.unitCost);
      const movementValue =
        row.movementValue === null ? null : Number(row.movementValue);
      const incoming = entries.has(row.type);
      return {
        id: row.id,
        productId: row.productId,
        productSku: row.product.sku,
        productName: row.product.name,
        branchId: row.branchId,
        branchCode: row.branch.code,
        branchName: row.branch.name,
        pointOfSaleId: row.pointOfSaleId,
        type: row.type,
        direction: incoming ? "IN" : "OUT",
        quantity,
        signedQuantity: incoming ? quantity : -quantity,
        previousStock: Number(row.previousStock),
        newStock: Number(row.newStock),
        unitCost,
        movementValue,
        balanceValue:
          unitCost === null ? null : roundMoney(Number(row.newStock) * unitCost),
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        referenceNumber: row.referenceNumber,
        note: row.note,
        createdBy: row.createdBy,
        createdAt: row.createdAt.toISOString(),
      } satisfies InventoryKardexEntryResponse;
    });
  }

  async inventoryOverview(
    access: PosBranchAccessContext,
  ): Promise<InventoryOverviewProductResponse[]> {
    const canManageAllBranches =
      this.canManageAllCompanyBranches(access);

    const branches = await this.prisma.branch.findMany({
      where: {
        companyId: access.companyId,
        ...(!canManageAllBranches && access.branchAccessMode === "ASSIGNED"
          ? { id: { in: access.branchIds } }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
      },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    });

    const branchIds = branches.map((branch) => branch.id);
    const products = branchIds.length
      ? await this.prisma.product.findMany({
          where: {
            companyId: access.companyId,
            branchConfigurations: {
              some: { branchId: { in: branchIds } },
            },
          },
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            trackInventory: true,
            active: true,
            branchConfigurations: {
              where: { branchId: { in: branchIds } },
              select: {
                branchId: true,
                stockQuantity: true,
                minimumStock: true,
            unitCost: true,
            price: true,
            trackInventory: true,
                active: true,
              },
            },
          },
          orderBy: [{ name: "asc" }, { sku: "asc" }],
        })
      : [];

    return products.map((product) => {
      const configurations = new Map(
        product.branchConfigurations.map((row) => [row.branchId, row]),
      );
      const branchStocks = branches.map((branch) => {
        const configuration = configurations.get(branch.id);
        const stockQuantity = configuration
          ? Number(configuration.stockQuantity)
          : 0;
        const unitCost =
          configuration?.unitCost === null || !configuration
            ? null
            : Number(configuration.unitCost);
        const salePrice = configuration ? Number(configuration.price) : 0;
        const inventoryValue = roundMoney(stockQuantity * (unitCost ?? 0));
        const potentialSaleValue = roundMoney(stockQuantity * salePrice);
        return {
          branchId: branch.id,
          branchCode: branch.code,
          branchName: branch.name,
          stockQuantity,
          minimumStock: configuration
            ? Number(configuration.minimumStock)
            : 0,
          unitCost,
          salePrice,
          inventoryValue,
          potentialSaleValue,
          estimatedMargin: roundMoney(potentialSaleValue - inventoryValue),
          missingCost: Boolean(
            configuration?.active &&
            configuration?.trackInventory &&
            stockQuantity > 0 &&
            unitCost === null,
          ),
          active: Boolean(branch.active && configuration?.active),
        };
      });

      return {
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        trackInventory: product.trackInventory,
        active: product.active,
        totalStock: branchStocks.reduce(
          (total, branch) => total + branch.stockQuantity,
          0,
        ),
        totalInventoryValue: roundMoney(
          branchStocks.reduce(
            (total, branch) => total + branch.inventoryValue,
            0,
          ),
        ),
        totalPotentialSaleValue: roundMoney(
          branchStocks.reduce(
            (total, branch) => total + branch.potentialSaleValue,
            0,
          ),
        ),
        totalEstimatedMargin: roundMoney(
          branchStocks.reduce(
            (total, branch) => total + branch.estimatedMargin,
            0,
          ),
        ),
        missingCost: branchStocks.some((branch) => branch.missingCost),
        branches: branchStocks,
      };
    });
  }

  async transferInventory(
    dto: CreateInventoryTransferDto,
    actor: PosBranchAccessActor,
  ): Promise<InventoryTransferResponse> {
    if (dto.sourcePointOfSaleId === dto.destinationPointOfSaleId) {
      throw new BadRequestException(
        "El origen y el destino deben ser diferentes.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const canManageAllBranches =
        this.canManageAllCompanyBranches(actor);

      const points = await tx.pointOfSale.findMany({
        where: {
          id: {
            in: [dto.sourcePointOfSaleId, dto.destinationPointOfSaleId],
          },
          companyId: actor.companyId,
          active: true,
          ...(!canManageAllBranches &&
          actor.branchAccessMode === "ASSIGNED"
            ? { branchId: { in: actor.branchIds } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          branchId: true,
          branch: { select: { name: true } },
        },
      });

      const sourcePoint = points.find(
        (point) => point.id === dto.sourcePointOfSaleId,
      );
      const destinationPoint = points.find(
        (point) => point.id === dto.destinationPointOfSaleId,
      );

      if (!sourcePoint || !destinationPoint) {
        throw new NotFoundException(
          "El punto de origen o destino no está disponible.",
        );
      }

      if (sourcePoint.branchId === destinationPoint.branchId) {
        throw new BadRequestException(
          "Selecciona puntos pertenecientes a sucursales diferentes.",
        );
      }

      const product = await tx.product.findFirst({
        where: {
          id: dto.productId,
          companyId: actor.companyId,
          active: true,
        },
        select: { id: true, sku: true, name: true, branchId: true },
      });

      if (!product) {
        throw new NotFoundException("Producto no encontrado.");
      }

      const pointAssignments = await tx.productPointOfSale.findMany({
        where: {
          pointOfSaleId: {
            in: [sourcePoint.id, destinationPoint.id],
          },
          active: true,
          productBranch: {
            companyId: actor.companyId,
            productId: product.id,
            active: true,
          },
        },
        select: { pointOfSaleId: true },
      });

      if (
        !pointAssignments.some(
          (row) => row.pointOfSaleId === sourcePoint.id,
        ) ||
        !pointAssignments.some(
          (row) => row.pointOfSaleId === destinationPoint.id,
        )
      ) {
        throw new BadRequestException(
          "El producto debe estar asignado a los puntos de origen y destino.",
        );
      }

      const branchIds = [
        sourcePoint.branchId,
        destinationPoint.branchId,
      ].sort();

      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM product_branches
        WHERE product_id = ${product.id}
          AND company_id = ${actor.companyId}
          AND branch_id IN (${Prisma.join(branchIds)})
        ORDER BY id
        FOR UPDATE
      `;

      const configurations = await tx.productBranch.findMany({
        where: {
          companyId: actor.companyId,
          productId: product.id,
          branchId: { in: branchIds },
          active: true,
        },
      });

      const source = configurations.find(
        (row) => row.branchId === sourcePoint.branchId,
      );
      const destination = configurations.find(
        (row) => row.branchId === destinationPoint.branchId,
      );

      if (!source || !destination) {
        throw new BadRequestException(
          "El producto debe estar asignado tanto al origen como al destino.",
        );
      }

      if (!source.trackInventory || !destination.trackInventory) {
        throw new BadRequestException(
          "El producto debe controlar inventario en ambas sucursales.",
        );
      }

      const quantity = Number(dto.quantity);
      const sourcePreviousStock = Number(source.stockQuantity);
      const destinationPreviousStock = Number(destination.stockQuantity);

      if (sourcePreviousStock < quantity) {
        throw new BadRequestException(
          `Existencia insuficiente en ${sourcePoint.branch.name}. Disponible: ${sourcePreviousStock}.`,
        );
      }

      /* PRESERVE_TRANSFER_INVENTORY_VALUE
       * La transferencia sale al costo promedio del origen y se integra al
       * destino mediante promedio ponderado. El valor total no cambia.
       */
      const sourceUnitCost =
        source.unitCost === null ? null : Number(source.unitCost);
      const destinationUnitCost =
        destination.unitCost === null
          ? null
          : Number(destination.unitCost);

      if (sourceUnitCost === null) {
        throw new BadRequestException(
          `${product.name} no tiene costo configurado en ${sourcePoint.branch.name}.`,
        );
      }

      if (destinationPreviousStock > 0 && destinationUnitCost === null) {
        throw new BadRequestException(
          `${product.name} tiene existencia sin costo en ${destinationPoint.branch.name}. Corrige el costo antes de transferir.`,
        );
      }

      const sourceNewStock = sourcePreviousStock - quantity;
      const destinationNewStock = destinationPreviousStock + quantity;
      const destinationNewUnitCost =
        Math.round(
          ((((destinationPreviousStock * (destinationUnitCost ?? sourceUnitCost)) +
            (quantity * sourceUnitCost)) /
            destinationNewStock) +
            Number.EPSILON) *
            10_000,
        ) / 10_000;
      const transferredValue = roundMoney(quantity * sourceUnitCost);
      const transferId = randomUUID();
      const reference = `TRF-${Date.now()}`;
      const note = dto.note?.trim() || null;

      await tx.productBranch.update({
        where: { id: source.id },
        data: {
          stockQuantity: sourceNewStock,
        },
      });
      await tx.productBranch.update({
        where: { id: destination.id },
        data: {
          stockQuantity: destinationNewStock,
          unitCost: destinationNewUnitCost,
        },
      });

      /* Mantiene sincronizado el inventario heredado del producto principal. */
      if (product.branchId === sourcePoint.branchId) {
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: sourceNewStock,
            unitCost: sourceUnitCost,
          },
        });
      } else if (product.branchId === destinationPoint.branchId) {
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: destinationNewStock,
            unitCost: destinationNewUnitCost,
          },
        });
      }

      const outMovement = await tx.inventoryMovement.create({
        data: {
          companyId: actor.companyId,
          branchId: sourcePoint.branchId,
          pointOfSaleId: sourcePoint.id,
          productId: product.id,
          type: "TRANSFER_OUT",
          quantity,
          previousStock: sourcePreviousStock,
          newStock: sourceNewStock,
          unitCost: sourceUnitCost,
          movementValue: transferredValue,
          referenceType: "INVENTORY_TRANSFER",
          referenceId: transferId,
          referenceNumber: reference,
          note,
          createdBy: actor.username,
        },
      });

      const inMovement = await tx.inventoryMovement.create({
        data: {
          companyId: actor.companyId,
          branchId: destinationPoint.branchId,
          pointOfSaleId: destinationPoint.id,
          productId: product.id,
          type: "TRANSFER_IN",
          quantity,
          previousStock: destinationPreviousStock,
          newStock: destinationNewStock,
          unitCost: sourceUnitCost,
          movementValue: transferredValue,
          referenceType: "INVENTORY_TRANSFER",
          referenceId: transferId,
          referenceNumber: reference,
          note,
          createdBy: actor.username,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "TRANSFER_INVENTORY",
          entityType: "INVENTORY_TRANSFER",
          entityId: transferId,
          reason: note,
          oldValues: {
            sourceStock: sourcePreviousStock,
            destinationStock: destinationPreviousStock,
            sourceUnitCost,
            destinationUnitCost,
          },
          newValues: {
            productId: product.id,
            sourcePointOfSaleId: sourcePoint.id,
            destinationPointOfSaleId: destinationPoint.id,
            quantity,
            sourceStock: sourceNewStock,
            destinationStock: destinationNewStock,
            destinationUnitCost: destinationNewUnitCost,
            transferredValue,
            reference,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: transferId,
        reference,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        quantity,
        sourcePointOfSaleId: sourcePoint.id,
        sourcePointOfSaleName: sourcePoint.name,
        sourceBranchName: sourcePoint.branch.name,
        sourcePreviousStock,
        sourceNewStock,
        destinationPointOfSaleId: destinationPoint.id,
        destinationPointOfSaleName: destinationPoint.name,
        destinationBranchName: destinationPoint.branch.name,
        destinationPreviousStock,
        destinationNewStock,
        note,
        createdBy: actor.username,
        createdAt: outMovement.createdAt.toISOString(),
        movementIds: [outMovement.id, inMovement.id],
      };
    });
  }

  async createInventoryMovement(
    productId: string,
    dto: CreateInventoryMovementDto,
    actor: PosBranchAccessActor,
  ): Promise<InventoryMovementResponse> {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.productPointOfSale.findFirst({
        where: {
          pointOfSaleId: dto.pointOfSaleId,
          productBranch: {
            productId,
            companyId: actor.companyId,
            ...(actor.branchAccessMode === "ASSIGNED"
              ? { branchId: { in: actor.branchIds } }
              : {}),
          },
        },
        include: {
          productBranch: {
            include: { product: true },
          },
        },
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      });

      if (!assignment) {
        throw new NotFoundException("Producto no encontrado.");
      }

      const selectedBranchProduct = assignment.productBranch;
      const product = selectedBranchProduct.product;

      /*
       * Serializa ajustes manuales, ventas y
       * demás escrituras concurrentes del mismo
       * producto.
       *
       * Primero preservamos frontera Company.
       * Luego verificamos Branch antes de mutar.
       */
      const lockedProduct = await tx.$queryRaw<
        Array<{
          id: string;
          branchId: string;
        }>
      >`
          SELECT
            id,
            branch_id AS branchId
          FROM product_branches
          WHERE id = ${selectedBranchProduct.id}
            AND company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedProduct.length === 0) {
        throw new NotFoundException("Producto no encontrado.");
      }

      const branchProduct = await tx.productBranch.findUniqueOrThrow({
        where: { id: selectedBranchProduct.id },
      });

      if (!branchProduct.trackInventory) {
        throw new BadRequestException("Este producto no controla inventario.");
      }

      const previousStock = Number(branchProduct.stockQuantity);

      const isEntry =
        dto.type === "PURCHASE" ||
        dto.type === "ADJUSTMENT_IN" ||
        dto.type === "RETURN_IN";

      const newStock = isEntry
        ? previousStock + dto.quantity
        : previousStock - dto.quantity;

      if (newStock < 0) {
        throw new BadRequestException(
          "La operación dejaría el inventario en negativo.",
        );
      }

      await tx.productBranch.update({
        where: {
          id: branchProduct.id,
        },
        data: {
          stockQuantity: newStock,
        },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          companyId: product.companyId,
          branchId: branchProduct.branchId,
          pointOfSaleId: assignment.pointOfSaleId,
          productId: product.id,

          type: dto.type,

          quantity: dto.quantity,
          previousStock,
          newStock,
          unitCost: branchProduct.unitCost,
          movementValue:
            branchProduct.unitCost === null
              ? null
              : roundMoney(dto.quantity * Number(branchProduct.unitCost)),

          referenceType: "MANUAL",

          referenceNumber: dto.referenceNumber?.trim() || null,

          note: dto.note?.trim() || null,

          createdBy: actor.username,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: product.companyId,
          userId: actor.userId,
          action: "CREATE_INVENTORY_MOVEMENT",
          entityType: "INVENTORY_MOVEMENT",
          entityId: movement.id,
          reason: dto.note?.trim() || null,
          oldValues: {
            productId: product.id,
            branchId: branchProduct.branchId,
            stockQuantity: previousStock,
          },
          newValues: {
            productId: product.id,
            branchId: branchProduct.branchId,
            type: dto.type,
            quantity: dto.quantity,
            stockQuantity: newStock,
            referenceNumber: dto.referenceNumber?.trim() || null,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        id: movement.id,
        productId: movement.productId,
        type: movement.type,
        quantity: Number(movement.quantity),
        previousStock: Number(movement.previousStock),
        newStock: Number(movement.newStock),
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        referenceNumber: movement.referenceNumber,
        note: movement.note,
        createdBy: movement.createdBy,
        createdAt: movement.createdAt.toISOString(),
      };
    });
  }
}
