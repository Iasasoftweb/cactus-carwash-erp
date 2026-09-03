import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@cactus/database";
import type {
  CustomerPriceLevelSummaryResponse,
  CustomerPriceLevelAssignmentResponse,
  PriceLevelResponse,
  ProductPricingResponse,
} from "@cactus/shared";
import { CreatePriceLevelDto } from "./dto/create-price-level.dto";
import { UpdatePriceLevelDto } from "./dto/update-price-level.dto";
import { UpdateProductPricesDto } from "./dto/update-product-prices.dto";

type PricingActor = {
  userId: string;
  companyId: string;
  ipAddress: string | null;
};

type PricingAccess = {
  companyId: string;
  branchAccessMode: "ALL" | "ASSIGNED";
  branchIds: string[];
};

type PricingAccessActor = PricingActor & PricingAccess;

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  private levelResponse(level: {
    id: string;
    companyId: string;
    code: string;
    name: string;
    isDefault: boolean;
    sortOrder: number;
    active: boolean;
  }): PriceLevelResponse {
    return {
      id: level.id,
      companyId: level.companyId,
      code: level.code,
      name: level.name,
      isDefault: level.isDefault,
      sortOrder: level.sortOrder,
      active: level.active,
    };
  }

  async levels(companyId: string): Promise<PriceLevelResponse[]> {
    const rows = await this.prisma.priceLevel.findMany({
      where: { companyId },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return rows.map((row) => this.levelResponse(row));
  }

  async customerLevels(
    companyId: string,
  ): Promise<CustomerPriceLevelSummaryResponse[]> {
    const customers = await this.prisma.customer.findMany({
      where: { companyId, active: true },
      select: {
        id: true,
        displayName: true,
        priceLevel: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    return customers.map((customer) => ({
      customerId: customer.id,
      customerName: customer.displayName,
      priceLevelId: customer.priceLevel?.id ?? null,
      priceLevelCode: customer.priceLevel?.code ?? null,
      priceLevelName: customer.priceLevel?.name ?? null,
    }));
  }

  async createLevel(
    dto: CreatePriceLevelDto,
    actor: PricingActor,
  ): Promise<PriceLevelResponse> {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();

    if (!code || !name) {
      throw new BadRequestException("Código y nombre son obligatorios.");
    }

    return this.prisma.$transaction(async (tx) => {
      const duplicated = await tx.priceLevel.findFirst({
        where: { companyId: actor.companyId, code },
        select: { id: true },
      });

      if (duplicated) {
        throw new BadRequestException(
          "Ya existe un nivel de precio con ese código.",
        );
      }

      if (dto.isDefault) {
        await tx.priceLevel.updateMany({
          where: { companyId: actor.companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const level = await tx.priceLevel.create({
        data: {
          companyId: actor.companyId,
          code,
          name,
          isDefault: dto.isDefault ?? false,
          sortOrder: dto.sortOrder ?? 0,
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CREATE_PRICE_LEVEL",
          entityType: "PRICE_LEVEL",
          entityId: level.id,
          reason: null,
          newValues: {
            code: level.code,
            name: level.name,
            isDefault: level.isDefault,
            sortOrder: level.sortOrder,
            active: level.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.levelResponse(level);
    });
  }

  async updateLevel(
    id: string,
    dto: UpdatePriceLevelDto,
    actor: PricingActor,
  ): Promise<PriceLevelResponse> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.priceLevel.findFirst({
        where: { id, companyId: actor.companyId },
      });

      if (!existing) {
        throw new NotFoundException("Nivel de precio no encontrado.");
      }

      if (existing.isDefault && dto.active === false) {
        throw new BadRequestException(
          "El nivel predeterminado no puede desactivarse.",
        );
      }

      if (existing.isDefault && dto.isDefault === false) {
        throw new BadRequestException(
          "Primero debes seleccionar otro nivel como predeterminado.",
        );
      }

      const code =
        dto.code === undefined ? existing.code : dto.code.trim().toUpperCase();

      const name = dto.name === undefined ? existing.name : dto.name.trim();

      if (!code || !name) {
        throw new BadRequestException(
          "Código y nombre no pueden quedar vacíos.",
        );
      }

      const duplicated = await tx.priceLevel.findFirst({
        where: {
          companyId: actor.companyId,
          code,
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicated) {
        throw new BadRequestException(
          "Ya existe otro nivel de precio con ese código.",
        );
      }

      if (dto.isDefault === true && !existing.isDefault) {
        await tx.priceLevel.updateMany({
          where: { companyId: actor.companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const level = await tx.priceLevel.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code } : {}),
          ...(dto.name !== undefined ? { name } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_PRICE_LEVEL",
          entityType: "PRICE_LEVEL",
          entityId: level.id,
          reason: null,
          oldValues: {
            code: existing.code,
            name: existing.name,
            isDefault: existing.isDefault,
            sortOrder: existing.sortOrder,
            active: existing.active,
          },
          newValues: {
            code: level.code,
            name: level.name,
            isDefault: level.isDefault,
            sortOrder: level.sortOrder,
            active: level.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.levelResponse(level);
    });
  }

  private async resolveProductBranch(
    productId: string,
    pointOfSaleId: string,
    access: PricingAccess,
  ) {
    if (!pointOfSaleId) {
      throw new BadRequestException("Debe indicar el punto de venta.");
    }

    const point = await this.prisma.pointOfSale.findFirst({
      where: {
        id: pointOfSaleId,
        companyId: access.companyId,
        ...(access.branchAccessMode === "ASSIGNED"
          ? { branchId: { in: access.branchIds } }
          : {}),
      },
      select: { id: true, branchId: true },
    });

    if (!point) {
      throw new NotFoundException("Punto de venta no encontrado.");
    }

    const productBranch = await this.prisma.productBranch.findUnique({
      where: {
        productId_branchId: {
          productId,
          branchId: point.branchId,
        },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        levelPrices: true,
      },
    });

    if (!productBranch || productBranch.companyId !== access.companyId) {
      throw new NotFoundException(
        "El producto no está asignado a esta sucursal.",
      );
    }

    return { point, productBranch };
  }

  async productPricing(
    productId: string,
    pointOfSaleId: string,
    access: PricingAccess,
  ): Promise<ProductPricingResponse> {
    const { productBranch } = await this.resolveProductBranch(
      productId,
      pointOfSaleId,
      access,
    );

    const levels = await this.prisma.priceLevel.findMany({
      where: { companyId: access.companyId },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    const configured = new Map(
      productBranch.levelPrices.map((row) => [row.priceLevelId, row]),
    );

    return {
      productId: productBranch.product.id,
      productName: productBranch.product.name,
      sku: productBranch.product.sku,
      productBranchId: productBranch.id,
      pointOfSaleId,
      minimumPrice: Number(productBranch.minimumPrice ?? productBranch.price),
      prices: levels.map((level) => {
        const row = configured.get(level.id);

        return {
          id: row?.id ?? null,
          productBranchId: productBranch.id,
          priceLevelId: level.id,
          priceLevelCode: level.code,
          priceLevelName: level.name,
          isDefault: level.isDefault,
          price: Number(row?.price ?? productBranch.price),
          active: row?.active ?? level.isDefault,
        };
      }),
    };
  }

  async updateProductPricing(
    productId: string,
    dto: UpdateProductPricesDto,
    actor: PricingAccessActor,
  ): Promise<ProductPricingResponse> {
    const ids = dto.prices.map((row) => row.priceLevelId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("No puedes repetir un nivel de precio.");
    }

    const { productBranch } = await this.resolveProductBranch(
      productId,
      dto.pointOfSaleId,
      actor,
    );

    const levels = await this.prisma.priceLevel.findMany({
      where: {
        companyId: actor.companyId,
        id: { in: ids },
      },
    });

    if (levels.length !== ids.length) {
      throw new BadRequestException(
        "Uno de los niveles de precio no pertenece a la empresa.",
      );
    }

    const defaultLevel = levels.find((level) => level.isDefault);
    const defaultPrice = defaultLevel
      ? dto.prices.find((row) => row.priceLevelId === defaultLevel.id)
      : undefined;

    if (!defaultLevel || !defaultPrice || !defaultPrice.active) {
      throw new BadRequestException(
        "Debes incluir y activar el precio predeterminado.",
      );
    }

    const invalidPrice = dto.prices.find(
      (row) => row.active && row.price < dto.minimumPrice,
    );

    if (invalidPrice) {
      const level = levels.find(
        (item) => item.id === invalidPrice.priceLevelId,
      );
      throw new BadRequestException(
        `El precio ${level?.name ?? ""} no puede ser menor que el mínimo.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productBranch.update({
        where: { id: productBranch.id },
        data: {
          minimumPrice: dto.minimumPrice,
          price: defaultPrice.price,
        },
      });

      for (const row of dto.prices) {
        await tx.productBranchPrice.upsert({
          where: {
            productBranchId_priceLevelId: {
              productBranchId: productBranch.id,
              priceLevelId: row.priceLevelId,
            },
          },
          create: {
            companyId: actor.companyId,
            productBranchId: productBranch.id,
            priceLevelId: row.priceLevelId,
            price: row.price,
            active: row.active,
          },
          update: {
            price: row.price,
            active: row.active,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_PRODUCT_LEVEL_PRICES",
          entityType: "PRODUCT_BRANCH",
          entityId: productBranch.id,
          reason: null,
          oldValues: {
            minimumPrice: Number(
              productBranch.minimumPrice ?? productBranch.price,
            ),
            defaultPrice: Number(productBranch.price),
          },
          newValues: {
            minimumPrice: dto.minimumPrice,
            defaultPrice: defaultPrice.price,
            prices: dto.prices.map((row) => ({
              priceLevelId: row.priceLevelId,
              price: row.price,
              active: row.active,
            })),
          },
          ipAddress: actor.ipAddress,
        },
      });
    });

    return this.productPricing(productId, dto.pointOfSaleId, actor);
  }

  async updateCustomerPriceLevel(
    customerId: string,
    priceLevelId: string,
    actor: PricingActor,
  ): Promise<CustomerPriceLevelAssignmentResponse> {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, companyId: actor.companyId },
        select: {
          id: true,
          displayName: true,
          priceLevelId: true,
        },
      });

      if (!customer) {
        throw new NotFoundException("Cliente no encontrado.");
      }

      const level = await tx.priceLevel.findFirst({
        where: {
          id: priceLevelId,
          companyId: actor.companyId,
          active: true,
        },
      });

      if (!level) {
        throw new BadRequestException("El nivel de precio no está disponible.");
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: { priceLevelId: level.id },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "UPDATE_CUSTOMER_PRICE_LEVEL",
          entityType: "CUSTOMER",
          entityId: customer.id,
          reason: null,
          oldValues: { priceLevelId: customer.priceLevelId },
          newValues: {
            priceLevelId: level.id,
            priceLevelCode: level.code,
            priceLevelName: level.name,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        customerId: customer.id,
        customerName: customer.displayName,
        priceLevelId: level.id,
        priceLevelCode: level.code,
        priceLevelName: level.name,
      };
    });
  }
}