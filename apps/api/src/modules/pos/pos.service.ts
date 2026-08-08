import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '@cactus/database';
import type {
  CashRegisterResponse,
  CreatePosMovementResponse,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PosAccountResponse,
  ProductCategoryResponse,
  ProductResponse,
} from '@cactus/shared';
import { AddPosAccountItemsDto } from './dto/add-pos-account-items.dto';
import { CreateDirectPosPaymentDto } from './dto/create-direct-pos-payment.dto';
import { CreatePosMovementDto } from './dto/create-pos-movement.dto';
import { OpenPosAccountDto } from './dto/open-pos-account.dto';
import { PayPosAccountDto } from './dto/pay-pos-account.dto';
import { UpdatePosAccountDto } from './dto/update-pos-account.dto';

const accountInclude = {
  pointOfSale: true,
  cashRegister: true,
  paymentMethod: true,
  order: { select: { orderNumber: true } },
  items: {
    include: { product: true },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.PosAccountInclude;

type AccountWithRelations = Prisma.PosAccountGetPayload<{
  include: typeof accountInclude;
}>;

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  async paymentMethods(): Promise<PaymentMethodResponse[]> {
    const rows = await this.prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
    }));
  }

  async points(): Promise<PointOfSaleResponse[]> {
    const rows = await this.prisma.pointOfSale.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
    }));
  }

  async cashRegisters(
    pointOfSaleId?: string,
  ): Promise<CashRegisterResponse[]> {
    const rows = await this.prisma.cashRegister.findMany({
      where: {
        active: true,
        ...(pointOfSaleId ? { pointOfSaleId } : {}),
      },
      include: { pointOfSale: true },
      orderBy: { name: 'asc' },
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
    pointOfSaleId?: string,
  ): Promise<ProductCategoryResponse[]> {
    const rows = await this.prisma.productCategory.findMany({
      where: {
        active: true,
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
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
    }));
  }

  async products(
    pointOfSaleId?: string,
    categoryId?: string,
  ): Promise<ProductResponse[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        active: true,
        ...(pointOfSaleId ? { pointOfSaleId } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      type: row.type,
      price: Number(row.price),
      taxRate: Number(row.taxRate),
      stockQuantity: Number(row.stockQuantity),
      trackInventory: row.trackInventory,
      pointOfSaleId: row.pointOfSaleId,
      categoryId: row.categoryId,
      categoryName: row.category.name,
    }));
  }

  async accounts(pointOfSaleId?: string): Promise<PosAccountResponse[]> {
    const rows = await this.prisma.posAccount.findMany({
      where: {
        status: 'OPEN',
        ...(pointOfSaleId ? { pointOfSaleId } : {}),
      },
      include: accountInclude,
      orderBy: { openedAt: 'asc' },
    });

    return rows.map((row) => this.mapAccount(row));
  }

  async account(accountId: string): Promise<PosAccountResponse> {
    const account = await this.prisma.posAccount.findUnique({
      where: { id: accountId },
      include: accountInclude,
    });

    if (!account) {
      throw new NotFoundException('Cuenta de Coffee Bar no encontrada.');
    }

    return this.mapAccount(account);
  }

  async openAccount(dto: OpenPosAccountDto): Promise<PosAccountResponse> {
    const point = await this.prisma.pointOfSale.findFirst({
      where: { id: dto.pointOfSaleId, active: true },
    });

    if (!point) {
      throw new NotFoundException('Punto de venta no encontrado.');
    }

    if (dto.cashRegisterId) {
      const register = await this.prisma.cashRegister.findFirst({
        where: {
          id: dto.cashRegisterId,
          pointOfSaleId: point.id,
          active: true,
        },
      });

      if (!register) {
        throw new BadRequestException(
          'La caja seleccionada no pertenece a este punto de venta.',
        );
      }
    }

    const reference = `CB-${Date.now()}`;

    const account = await this.prisma.posAccount.create({
      data: {
        pointOfSaleId: point.id,
        cashRegisterId: dto.cashRegisterId,
        orderId: dto.orderId,
        reference,
        customerAlias: dto.customerAlias.trim(),
        tableReference: dto.tableReference?.trim() || null,
      },
      include: accountInclude,
    });

    return this.mapAccount(account);
  }

  async updateAccount(
  accountId: string,
  dto: UpdatePosAccountDto,
): Promise<PosAccountResponse> {
  const account = await this.prisma.posAccount.findUnique({
    where: {
      id: accountId,
    },
  });

  if (!account) {
    throw new NotFoundException(
      'Cuenta de Coffee Bar no encontrada.',
    );
  }

  if (account.status !== 'OPEN') {
    throw new BadRequestException(
      'Solo se pueden modificar cuentas abiertas.',
    );
  }

  const customerAlias = dto.customerAlias.trim();

  if (!customerAlias) {
    throw new BadRequestException(
      'El nombre o alias del cliente es obligatorio.',
    );
  }

  const updated = await this.prisma.posAccount.update({
    where: {
      id: accountId,
    },
    data: {
      customerAlias,
      tableReference:
        dto.tableReference?.trim() || null,
    },
    include: accountInclude,
  });

  return this.mapAccount(updated);
}

  async addAccountItems(
    accountId: string,
    dto: AddPosAccountItemsDto,
  ): Promise<PosAccountResponse> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.posAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException('Cuenta de Coffee Bar no encontrada.');
      }

      if (account.status !== 'OPEN') {
        throw new BadRequestException(
          'Solo se pueden agregar consumos a una cuenta abierta.',
        );
      }

      const ids = [...new Set(dto.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: {
          id: { in: ids },
          pointOfSaleId: account.pointOfSaleId,
          active: true,
        },
      });

      const productMap = new Map(products.map((product) => [product.id, product]));
      let addedSubtotal = 0;
      let addedTax = 0;

      for (const requested of dto.items) {
        const product = productMap.get(requested.productId);

        if (!product) {
          throw new BadRequestException('Producto no disponible.');
        }

        if (
          product.trackInventory &&
          Number(product.stockQuantity) < requested.quantity
        ) {
          throw new BadRequestException(
            `Existencia insuficiente para ${product.name}.`,
          );
        }

        const base = Number(product.price) * requested.quantity;
        const tax = base * Number(product.taxRate);
        const total = base + tax;

        const existingItem = await tx.posAccountItem.findFirst({
          where: {
            accountId,
            productId: product.id,
          },
        });

        if (existingItem) {
          await tx.posAccountItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: { increment: requested.quantity },
              taxAmount: { increment: tax },
              lineTotal: { increment: total },
            },
          });
        } else {
          await tx.posAccountItem.create({
            data: {
              accountId,
              productId: product.id,
              quantity: requested.quantity,
              unitPrice: product.price,
              taxAmount: tax,
              lineTotal: total,
            },
          });
        }

        if (product.trackInventory) {
          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: {
                decrement: requested.quantity,
              },
            },
          });
        }

        addedSubtotal += base;
        addedTax += tax;
      }

      await tx.posAccount.update({
        where: { id: accountId },
        data: {
          subtotal: { increment: addedSubtotal },
          taxAmount: { increment: addedTax },
          total: { increment: addedSubtotal + addedTax },
        },
      });

      const updated = await tx.posAccount.findUniqueOrThrow({
        where: { id: accountId },
        include: accountInclude,
      });

      return this.mapAccount(updated);
    });
  }

async payAccount(
  accountId: string,
  dto: PayPosAccountDto,
): Promise<PosAccountResponse> {
  const account =
    await this.prisma.posAccount.findUnique({
      where: {
        id: accountId,
      },
    });

  if (!account) {
    throw new NotFoundException(
      'Cuenta de Coffee Bar no encontrada.',
    );
  }

  if (account.status !== 'OPEN') {
    throw new BadRequestException(
      'La cuenta ya fue cerrada.',
    );
  }

  if (!account.cashRegisterId) {
    throw new BadRequestException(
      'La cuenta no tiene una caja asociada.',
    );
  }

  if (Number(account.total) <= 0) {
    throw new BadRequestException(
      'La cuenta no tiene consumos para cobrar.',
    );
  }

  const paymentMethod =
    await this.prisma.paymentMethod.findFirst({
      where: {
        id: dto.paymentMethodId,
        active: true,
      },
    });

  if (!paymentMethod) {
    throw new BadRequestException(
      'Método de pago no disponible.',
    );
  }

  const session =
    await this.resolveOpenCashSession(
      account.cashRegisterId,
      account.pointOfSaleId,
    );

  const updated =
    await this.prisma.$transaction(async (tx) => {
      const paid =
        await tx.posAccount.update({
          where: {
            id: accountId,
          },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            closedAt: new Date(),
            paymentMethodId:
              paymentMethod.id,
            paymentReference:
              dto.paymentReference?.trim() ||
              null,
          },
          include: accountInclude,
        });

      await tx.payment.create({
        data: {
          paymentMethodId:
            paymentMethod.id,
          cashSessionId:
            session.id,
          amount:
            paid.total,
          reference:
            dto.paymentReference?.trim() ||
            null,
          sourceType:
            'POS_ACCOUNT',
          sourceId:
            paid.id,
          description:
            `Cobro de cuenta ${paid.reference}.`,
        },
      });

      await tx.cashMovement.create({
        data: {
          cashSessionId:
            session.id,
          type:
            'SALE',
          amount:
            paid.total,
          description:
            `Cobro Coffee Bar ${paid.reference} por ${paymentMethod.name}.`,
          externalReference:
            dto.paymentReference?.trim() ||
            null,
          referenceType:
            'POS_ACCOUNT',
          referenceId:
            paid.id,
        },
      });

      return paid;
    });

  return this.mapAccount(updated);
}

  async directPayment(
    dto: CreateDirectPosPaymentDto,
  ): Promise<CreatePosMovementResponse> {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: dto.paymentMethodId,
        active: true,
      },
    });

    if (!paymentMethod) {
      throw new BadRequestException('Método de pago no disponible.');
    }

    const session = await this.resolveOpenCashSession(
      dto.cashRegisterId,
      dto.pointOfSaleId,
    );

    const movement = await this.createMovement({
      pointOfSaleId: dto.pointOfSaleId,
      customerAlias: dto.customerAlias,
      items: dto.items,
    });

    await this.registerPayment(
      dto.paymentMethodId,
      session.id,
      movement.total,
      'POS_DIRECT',
      movement.id,
      dto.paymentReference,
      `Venta directa ${movement.reference}.`,
    );

    return movement;
  }

  async createMovement(
    dto: CreatePosMovementDto,
  ): Promise<CreatePosMovementResponse> {
    return this.prisma.$transaction(async (tx) => {
      const point = await tx.pointOfSale.findFirst({
        where: {
          id: dto.pointOfSaleId,
          active: true,
        },
      });

      if (!point) {
        throw new NotFoundException('Punto de venta no encontrado.');
      }

      const productIds = [...new Set(dto.items.map((item) => item.productId))];

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          pointOfSaleId: point.id,
          active: true,
        },
      });

      const productMap = new Map(products.map((product) => [product.id, product]));
      let subtotal = 0;
      let taxAmount = 0;

      const prepared = dto.items.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new BadRequestException('Producto no disponible.');
        }

        if (
          product.trackInventory &&
          Number(product.stockQuantity) < item.quantity
        ) {
          throw new BadRequestException(
            `Existencia insuficiente para ${product.name}.`,
          );
        }

        const base = Number(product.price) * item.quantity;
        const tax = base * Number(product.taxRate);

        subtotal += base;
        taxAmount += tax;

        return {
          product,
          quantity: item.quantity,
          tax,
          total: base + tax,
        };
      });

      const movement = await tx.posMovement.create({
        data: {
          pointOfSaleId: point.id,
          orderId: dto.orderId,
          type: dto.orderId ? 'ORDER_ASSOCIATED' : 'DIRECT_SALE',
          reference: `POS-${Date.now()}`,
          customerAlias: dto.customerAlias?.trim() || null,
          subtotal,
          taxAmount,
          total: subtotal + taxAmount,
          items: {
            create: prepared.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.product.price,
              taxAmount: item.tax,
              lineTotal: item.total,
            })),
          },
        },
      });

      for (const item of prepared) {
        if (item.product.trackInventory) {
          await tx.product.update({
            where: { id: item.product.id },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return {
        id: movement.id,
        reference: movement.reference,
        type: movement.type,
        orderId: movement.orderId,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        message: dto.orderId
          ? 'Consumo agregado correctamente a la orden.'
          : 'Venta directa cobrada correctamente.',
      };
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
        'No existe una caja configurada para este punto de venta.',
      );
    }

    const session = await this.prisma.cashSession.findFirst({
      where: {
        cashRegisterId: register.id,
        status: 'OPEN',
      },
    });

    if (!session) {
      throw new BadRequestException(
        'Debe abrir la caja antes de completar el cobro.',
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
    throw new BadRequestException(
      'Método de pago no disponible.',
    );
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
        description:
          description ?? null,
      },
    });

    await tx.cashMovement.create({
      data: {
        cashSessionId,
        type: 'SALE',
        amount,
        description:
          description ??
          `Cobro ${sourceType} por ${method.name}.`,
        externalReference:
          reference?.trim() || null,
        referenceType: sourceType,
        referenceId: sourceId,
      },
    });
  });
}

  private mapAccount(account: AccountWithRelations): PosAccountResponse {
    return {
      id: account.id,
      reference: account.reference,
      customerAlias: account.customerAlias,
      tableReference: account.tableReference,
      status: account.status,
      orderId: account.orderId,
      orderNumber: account.order?.orderNumber ?? null,
      pointOfSaleId: account.pointOfSaleId,
      pointOfSaleName: account.pointOfSale.name,
      cashRegisterId: account.cashRegisterId,
      cashRegisterName: account.cashRegister?.name ?? null,
      subtotal: Number(account.subtotal),
      taxAmount: Number(account.taxAmount),
      total: Number(account.total),
      openedAt: account.openedAt.toISOString(),
      paidAt: account.paidAt?.toISOString() ?? null,
      paymentMethodId: account.paymentMethodId,
      paymentMethodName: account.paymentMethod?.name ?? null,
      items: account.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      })),
    };
  }
}
