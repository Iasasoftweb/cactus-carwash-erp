import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';


import type {
  PurchaseOrderReceiptResponse,
  PurchaseOrderResponse,
  SupplierResponse,
  SupplierInvoiceResponse,
  SupplierPaymentResponse,
  AccountsPayableSummaryResponse,
  AccountsPayableReportResponse,
} from '@cactus/shared';

import { PrismaService } from '@cactus/database';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';

type PurchaseAuditActor = {
  userId: string;
  username: string;
  ipAddress: string | null;
};

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async accountsPayableReport(
  companyId: string,
  branchId?: string,
  dateFrom?: string,
  dateTo?: string,
  supplierId?: string,
): Promise<AccountsPayableReportResponse> {
  const from =
    dateFrom
      ? new Date(`${dateFrom}T00:00:00`)
      : undefined;

  const to =
    dateTo
      ? new Date(`${dateTo}T23:59:59.999`)
      : undefined;

  const invoices =
    await this.prisma.supplierInvoice.findMany({
      where: {
        companyId,

        ...(branchId
          ? {
              branchId,
            }
          : {}),

        ...(supplierId
          ? {
              supplierId,
            }
          : {}),

        ...(from || to
          ? {
              issuedAt: {
                ...(from
                  ? {
                      gte: from,
                    }
                  : {}),

                ...(to
                  ? {
                      lte: to,
                    }
                  : {}),
              },
            }
          : {}),
      },

      include: {
        supplier: true,

        allocations: {
          include: {
            payment: true,
          },
        },
      },

      orderBy: {
        issuedAt: 'asc',
      },
    });

  const now =
    new Date();

  let invoiced = 0;
  let paid = 0;
  let pendingBalance = 0;
  let overdueBalance = 0;

  let pendingInvoices = 0;
  let partiallyPaidInvoices = 0;
  let paidInvoices = 0;
  let cancelledInvoices = 0;

  let agingCurrent = 0;
  let aging1To30 = 0;
  let aging31To60 = 0;
  let aging61To90 = 0;
  let agingOver90 = 0;

  const supplierMap =
    new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        invoiced: number;
        paid: number;
        balance: number;
        overdueBalance: number;
        invoiceCount: number;
      }
    >();

  for (const invoice of invoices) {
    const total =
      Number(invoice.total);

    const balance =
      Number(invoice.balance);

    const paidAmount =
      invoice.allocations.reduce(
        (sum, allocation) => {
          if (
            allocation.payment.status ===
            'CANCELLED'
          ) {
            return sum;
          }

          return (
            sum +
            Number(allocation.amount)
          );
        },
        0,
      );

    invoiced += total;
    paid += paidAmount;

    if (
      invoice.status !==
      'CANCELLED'
    ) {
      pendingBalance +=
        balance;
    }

    if (
      invoice.status ===
      'PENDING'
    ) {
      pendingInvoices += 1;
    } else if (
      invoice.status ===
      'PARTIALLY_PAID'
    ) {
      partiallyPaidInvoices += 1;
    } else if (
      invoice.status ===
      'PAID'
    ) {
      paidInvoices += 1;
    } else if (
      invoice.status ===
      'CANCELLED'
    ) {
      cancelledInvoices += 1;
    }

    const supplier =
      supplierMap.get(
        invoice.supplierId,
      ) ?? {
        supplierId:
          invoice.supplierId,

        supplierName:
          invoice.supplier.name,

        invoiced: 0,
        paid: 0,
        balance: 0,
        overdueBalance: 0,
        invoiceCount: 0,
      };

    supplier.invoiced += total;
    supplier.paid += paidAmount;
    supplier.invoiceCount += 1;

    if (
      invoice.status !==
        'CANCELLED' &&
      balance > 0
    ) {
      supplier.balance +=
        balance;
    }

    if (
      invoice.status !==
        'CANCELLED' &&
      balance > 0
    ) {
      if (!invoice.dueDate) {
        agingCurrent +=
          balance;
      } else {
        const dueDate =
          new Date(
            invoice.dueDate,
          );

        if (dueDate >= now) {
          agingCurrent +=
            balance;
        } else {
          overdueBalance +=
            balance;

          supplier.overdueBalance +=
            balance;

          const overdueDays =
            Math.max(
              1,
              Math.floor(
                (
                  now.getTime() -
                  dueDate.getTime()
                ) /
                  86_400_000,
              ),
            );

          if (
            overdueDays <= 30
          ) {
            aging1To30 +=
              balance;
          } else if (
            overdueDays <= 60
          ) {
            aging31To60 +=
              balance;
          } else if (
            overdueDays <= 90
          ) {
            aging61To90 +=
              balance;
          } else {
            agingOver90 +=
              balance;
          }
        }
      }
    }

    supplierMap.set(
      invoice.supplierId,
      supplier,
    );
  }

  return {
    dateFrom:
      dateFrom ?? null,

    dateTo:
      dateTo ?? null,

    supplierId:
      supplierId ?? null,

    invoiced,
    paid,
    pendingBalance,
    overdueBalance,

    totalInvoices:
      invoices.length,

    pendingInvoices,
    partiallyPaidInvoices,
    paidInvoices,
    cancelledInvoices,

    aging: [
      {
        key: 'CURRENT',
        label: 'Por vencer',
        amount: agingCurrent,
      },
      {
        key: 'DAYS_1_30',
        label: '1–30 días',
        amount: aging1To30,
      },
      {
        key: 'DAYS_31_60',
        label: '31–60 días',
        amount: aging31To60,
      },
      {
        key: 'DAYS_61_90',
        label: '61–90 días',
        amount: aging61To90,
      },
      {
        key: 'OVER_90',
        label: 'Más de 90 días',
        amount: agingOver90,
      },
    ],

    suppliers:
      [...supplierMap.values()]
        .sort(
          (a, b) =>
            b.balance -
            a.balance,
        ),
  };
}

        async accountsPayableSummary(
          companyId: string,
          branchId?: string,
        ): Promise<AccountsPayableSummaryResponse> {
          const rows =
            await this.prisma.supplierInvoice.findMany({
              where: {
                companyId,
                ...(branchId
                  ? {
                      branchId,
                    }
                  : {}),
                status: {
                  in: [
                    'PENDING',
                    'PARTIALLY_PAID',
                  ],
                },
                balance: {
                  gt: 0,
                },
              },
              select: {
                balance: true,
                dueDate: true,
              },
            });

          const now = new Date();

          const dueSoonLimit =
            new Date(now);

          dueSoonLimit.setDate(
            dueSoonLimit.getDate() + 7,
          );

          let totalBalance = 0;
          let overdueBalance = 0;
          let dueSoonBalance = 0;

          let pendingInvoices = 0;
          let overdueInvoices = 0;
          let dueSoonInvoices = 0;

          for (const row of rows) {
            const balance =
              Number(row.balance);

            totalBalance += balance;
            pendingInvoices += 1;

            if (!row.dueDate) {
              continue;
            }

            const dueDate =
              new Date(row.dueDate);

            if (dueDate < now) {
              overdueBalance += balance;
              overdueInvoices += 1;

              continue;
            }

            if (
              dueDate >= now &&
              dueDate <= dueSoonLimit
            ) {
              dueSoonBalance += balance;
              dueSoonInvoices += 1;
            }
          }

          return {
            totalBalance,
            overdueBalance,
            dueSoonBalance,
            pendingInvoices,
            overdueInvoices,
            dueSoonInvoices,
          };
        }

  async supplierInvoices(
  companyId: string,
  branchId?: string,
  supplierId?: string,
): Promise<SupplierInvoiceResponse[]> {
  const rows =
    await this.prisma.supplierInvoice.findMany({
      where: {
        companyId,
        ...(branchId
          ? { branchId }
          : {}),
        ...(supplierId
          ? { supplierId }
          : {}),
      },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

  return rows.map((row) =>
    this.mapSupplierInvoice(row),
  );
}

async supplierInvoice(
  id: string,
  companyId: string,
): Promise<SupplierInvoiceResponse> {
  const row =
    await this.prisma.supplierInvoice.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
    });

  if (!row) {
    throw new NotFoundException(
      'Factura de suplidor no encontrada.',
    );
  }

  return this.mapSupplierInvoice(row);
}

async createSupplierInvoice(
  dto: CreateSupplierInvoiceDto,
  authenticatedCompanyId: string,
  actor: PurchaseAuditActor,
): Promise<SupplierInvoiceResponse> {
  if (dto.companyId !== authenticatedCompanyId) {
    throw new BadRequestException(
      'La empresa indicada no corresponde a la sesión autenticada.',
    );
  }

  const subtotal = dto.subtotal;
  const taxAmount = dto.taxAmount;
  const total = subtotal + taxAmount;

  if (subtotal < 0 || taxAmount < 0 || total <= 0) {
    throw new BadRequestException(
      'Los montos de la factura no son válidos.',
    );
  }

  const invoiceNumber =
    dto.invoiceNumber.trim();

  if (!invoiceNumber) {
    throw new BadRequestException(
      'El número de factura es obligatorio.',
    );
  }

  const created =
    await this.prisma.$transaction(
      async (tx) => {
        const supplier =
          await tx.supplier.findFirst({
            where: {
              id: dto.supplierId,
              companyId: dto.companyId,
              active: true,
            },
          });

        if (!supplier) {
          throw new NotFoundException(
            'Suplidor no encontrado o inactivo.',
          );
        }

        const branch =
          await tx.branch.findFirst({
            where: {
              id: dto.branchId,
              companyId: dto.companyId,
              active: true,
            },
          });

        if (!branch) {
          throw new NotFoundException(
            'Sucursal no encontrada.',
          );
        }

        /*
         * Si la factura está asociada a una orden de compra,
         * serializamos la facturación de esa orden.
         *
         * Esto evita que dos solicitudes concurrentes puedan
         * observar simultáneamente el mismo subtotal disponible
         * y sobrefacturar la recepción.
         */
        if (dto.purchaseOrderId) {
          const lockedOrders =
            await tx.$queryRaw<
              Array<{
                id: string;
                status: string;
              }>
            >`
              SELECT
                po.id,
                po.status
              FROM purchase_orders po
              WHERE po.id = ${dto.purchaseOrderId}
                AND po.company_id = ${dto.companyId}
                AND po.branch_id = ${dto.branchId}
                AND po.supplier_id = ${dto.supplierId}
              FOR UPDATE
            `;

          if (lockedOrders.length === 0) {
            throw new BadRequestException(
              'La orden de compra no pertenece a este suplidor, empresa o sucursal.',
            );
          }

          const lockedOrder =
            lockedOrders[0];

          if (
            lockedOrder.status ===
            'CANCELLED'
          ) {
            throw new BadRequestException(
              'No se puede registrar una factura sobre una orden de compra cancelada.',
            );
          }

          /*
           * El modelo actual no posee líneas de factura vinculadas
           * individualmente a PurchaseOrderItem.
           *
           * Por eso la reconciliación se realiza por subtotal:
           *
           *   subtotal recibido
           *   - subtotal previamente facturado
           *   = subtotal todavía facturable
           *
           * taxAmount no participa en este límite porque
           * PurchaseOrderItem representa mercancía mediante
           * receivedQuantity * unitCost y no distribuye impuestos.
           */
          const orderItems =
            await tx.purchaseOrderItem.findMany({
              where: {
                purchaseOrderId:
                  dto.purchaseOrderId,
              },
              select: {
                receivedQuantity: true,
                unitCost: true,
              },
            });

          const receivedSubtotal =
            orderItems.reduce(
              (sum, item) =>
                sum +
                Number(
                  item.receivedQuantity,
                ) *
                  Number(item.unitCost),
              0,
            );

          if (receivedSubtotal <= 0) {
            throw new BadRequestException(
              'La orden de compra todavía no tiene mercancía recibida facturable.',
            );
          }

          const previousInvoices =
            await tx.supplierInvoice.findMany({
              where: {
                purchaseOrderId:
                  dto.purchaseOrderId,
                status: {
                  not: 'CANCELLED',
                },
              },
              select: {
                subtotal: true,
              },
            });

          const alreadyInvoicedSubtotal =
            previousInvoices.reduce(
              (sum, invoice) =>
                sum +
                Number(
                  invoice.subtotal,
                ),
              0,
            );

          /*
           * Redondeamos a centavos antes de comparar.
           *
           * Esto evita falsos rechazos derivados de aritmética
           * IEEE-754 al convertir Decimal a number.
           */
          const receivedCents =
            Math.round(
              receivedSubtotal * 100,
            );

          const invoicedCents =
            Math.round(
              alreadyInvoicedSubtotal *
                100,
            );

          const requestedCents =
            Math.round(
              subtotal * 100,
            );

          const availableCents =
            Math.max(
              receivedCents -
                invoicedCents,
              0,
            );

          if (requestedCents <= 0) {
            throw new BadRequestException(
              'El subtotal de una factura asociada a una orden de compra debe ser mayor que cero.',
            );
          }

          if (
            requestedCents >
            availableCents
          ) {
            const availableSubtotal =
              (
                availableCents / 100
              ).toFixed(2);

            throw new BadRequestException(
              `El subtotal de la factura supera el monto recibido pendiente de facturar. Disponible: ${availableSubtotal}.`,
            );
          }
        }

        const duplicate =
          await tx.supplierInvoice.findFirst({
            where: {
              supplierId:
                dto.supplierId,
              invoiceNumber,
            },
          });

        if (duplicate) {
          throw new BadRequestException(
            'Ya existe una factura con ese número para este suplidor.',
          );
        }

        const createdInvoice =
          await tx.supplierInvoice.create({
            data: {
              companyId:
                dto.companyId,

              branchId:
                dto.branchId,

              supplierId:
                dto.supplierId,

              purchaseOrderId:
                dto.purchaseOrderId ??
                null,

              invoiceNumber,

              subtotal,
              taxAmount,
              total,
              balance: total,

              status: 'PENDING',

              issuedAt:
                new Date(
                  dto.issuedAt,
                ),

              dueDate:
                dto.dueDate
                  ? new Date(
                      dto.dueDate,
                    )
                  : null,

              notes:
                dto.notes?.trim() ||
                null,

              createdBy:
                actor.username,
            },

            include: {
              supplier: true,
              purchaseOrder: true,
            },
          });

        await tx.auditLog.create({
          data: {
            companyId:
              dto.companyId,

            userId:
              actor.userId,

            action:
              'CREATE_SUPPLIER_INVOICE',

            entityType:
              'SUPPLIER_INVOICE',

            entityId:
              createdInvoice.id,

            reason: null,

            newValues: {
              supplierId:
                createdInvoice.supplierId,

              purchaseOrderId:
                createdInvoice.purchaseOrderId,

              invoiceNumber:
                createdInvoice.invoiceNumber,

              subtotal:
                Number(
                  createdInvoice.subtotal,
                ),

              taxAmount:
                Number(
                  createdInvoice.taxAmount,
                ),

              total:
                Number(
                  createdInvoice.total,
                ),

              balance:
                Number(
                  createdInvoice.balance,
                ),

              status:
                createdInvoice.status,
            },

            ipAddress:
              actor.ipAddress,
          },
        });

        return createdInvoice;
      },
    );

  return this.mapSupplierInvoice(
    created,
  );
}


  async purchaseOrderReceipts(
  id: string,
  companyId: string,
): Promise<PurchaseOrderReceiptResponse[]> {
  const order =
    await this.prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId,
      },
      select: {
        id: true,
      },
    });

  if (!order) {
    throw new NotFoundException(
      'Orden de compra no encontrada.',
    );
  }

  const movements =
    await this.prisma.inventoryMovement.findMany({
      where: {
        companyId,
        referenceType: 'PURCHASE_ORDER',
        referenceId: id,
        type: 'PURCHASE',
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

  return movements.map((movement) => ({
    id: movement.id,
    productId: movement.productId,
    productName: movement.product.name,
    sku: movement.product.sku,
    quantity: Number(movement.quantity),
    previousStock: Number(
      movement.previousStock,
    ),
    newStock: Number(movement.newStock),
    receivedBy: movement.createdBy,
    receivedAt:
      movement.createdAt.toISOString(),
  }));
}

  async suppliers(
    companyId: string,
  ): Promise<SupplierResponse[]> {
    const rows =
      await this.prisma.supplier.findMany({
        where: {
          companyId,
        },
        orderBy: [
          {
            active: 'desc',
          },
          {
            name: 'asc',
          },
        ],
      });

    return rows.map((row) =>
      this.mapSupplier(row),
    );
  }

  async supplier(
    id: string,
    companyId: string,
  ): Promise<SupplierResponse> {
    const row =
      await this.prisma.supplier.findFirst({
        where: {
          id,
          companyId,
        },
      });

    if (!row) {
      throw new NotFoundException(
        'Proveedor no encontrado.',
      );
    }

    return this.mapSupplier(row);

    
  }

  async purchaseOrders(
  companyId: string,
  branchId?: string,
): Promise<PurchaseOrderResponse[]> {
  const rows =
    await this.prisma.purchaseOrder.findMany({
      where: {
        companyId,
        ...(branchId
          ? {
              branchId,
            }
          : {}),
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

  return rows.map((row) =>
    this.mapPurchaseOrder(row),
  );
}

async purchaseOrder(
  id: string,
  companyId: string,
): Promise<PurchaseOrderResponse> {
  const row =
    await this.prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

  if (!row) {
    throw new NotFoundException(
      'Orden de compra no encontrada.',
    );
  }

  return this.mapPurchaseOrder(row);
}

async createPurchaseOrder(
  dto: CreatePurchaseOrderDto,
  authenticatedCompanyId: string,
  actor: PurchaseAuditActor,
): Promise<PurchaseOrderResponse> {
  if (dto.companyId !== authenticatedCompanyId) {
    throw new BadRequestException(
      'La empresa indicada no corresponde a la sesión autenticada.',
    );
  }

  if (dto.items.length === 0) {
    throw new BadRequestException(
      'La orden de compra debe contener al menos un producto.',
    );
  }

  const duplicateProductIds =
    dto.items
      .map((item) => item.productId)
      .filter(
        (productId, index, rows) =>
          rows.indexOf(productId) !== index,
      );

  if (duplicateProductIds.length > 0) {
    throw new BadRequestException(
      'No puedes repetir el mismo producto en una orden de compra.',
    );
  }

  const created =
    await this.prisma.$transaction(
      async (tx) => {
        const branch =
          await tx.branch.findFirst({
            where: {
              id: dto.branchId,
              companyId: dto.companyId,
              active: true,
            },
          });

        if (!branch) {
          throw new NotFoundException(
            'Sucursal no encontrada.',
          );
        }

        const supplier =
          await tx.supplier.findFirst({
            where: {
              id: dto.supplierId,
              companyId: dto.companyId,
              active: true,
            },
          });

        if (!supplier) {
          throw new NotFoundException(
            'Proveedor no encontrado o inactivo.',
          );
        }

        const productIds =
          dto.items.map(
            (item) => item.productId,
          );

        const products =
          await tx.product.findMany({
            where: {
              id: {
                in: productIds,
              },
              companyId: dto.companyId,
              branchId: dto.branchId,
              active: true,
            },
          });

        if (
          products.length !==
          productIds.length
        ) {
          throw new BadRequestException(
            'Uno o más productos no pertenecen a la empresa/sucursal o están inactivos.',
          );
        }

        const sequence =
          await tx.numberSequence.upsert({
            where: {
              branchId_documentType: {
                branchId:
                  branch.id,
                documentType:
                  'PURCHASE_ORDER',
              },
            },

            update: {
              currentValue: {
                increment: 1,
              },
            },

            create: {
              companyId:
                dto.companyId,

              branchId:
                branch.id,

              documentType:
                'PURCHASE_ORDER',

              prefix:
                'OC',

              currentValue:
                1,

              padding:
                8,
            },
          });

        const branchDocumentCode =
          branch.code
            .trim()
            .toUpperCase();

        if (
          !branchDocumentCode ||
          branchDocumentCode.length > 20 ||
          !/^[A-Z0-9]+$/.test(
            branchDocumentCode,
          )
        ) {
          throw new BadRequestException(
            'El código de la sucursal debe contener únicamente letras y números para generar documentos.',
          );
        }

        const orderNumber =
          `${sequence.prefix}-${branchDocumentCode}-${String(
            sequence.currentValue,
          ).padStart(
            sequence.padding,
            '0',
          )}`;

        const createdOrder =
          await tx.purchaseOrder.create({
          data: {
            companyId:
              dto.companyId,

            branchId:
              dto.branchId,

            supplierId:
              dto.supplierId,

            orderNumber,

            status:
              'OPEN',

            notes:
              dto.notes?.trim() ||
              null,

            createdBy:
              actor.username,

            orderedAt:
              new Date(),

            items: {
              create:
                dto.items.map(
                  (item) => ({
                    productId:
                      item.productId,

                    quantity:
                      item.quantity,

                    unitCost:
                      item.unitCost,
                  }),
                ),
            },
          },

          include: {
            supplier: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            companyId:
              dto.companyId,
            userId:
              actor.userId,
            action:
              'CREATE_PURCHASE_ORDER',
            entityType:
              'PURCHASE_ORDER',
            entityId:
              createdOrder.id,
            reason:
              null,
            newValues: {
              orderNumber:
                createdOrder.orderNumber,
              branchId:
                createdOrder.branchId,
              supplierId:
                createdOrder.supplierId,
              status:
                createdOrder.status,
              items:
                createdOrder.items.map(
                  (item) => ({
                    productId:
                      item.productId,
                    quantity:
                      Number(item.quantity),
                    unitCost:
                      Number(item.unitCost),
                  }),
                ),
            },
            ipAddress:
              actor.ipAddress,
          },
        });

        return createdOrder;
      },
    );

  return this.mapPurchaseOrder(
    created,
  );
}

async receivePurchaseOrder(
  id: string,
  dto: ReceivePurchaseOrderDto,
  companyId: string,
  actor: PurchaseAuditActor,
): Promise<PurchaseOrderResponse> {
  if (dto.items.length === 0) {
    throw new BadRequestException(
      'Debes indicar al menos un producto recibido.',
    );
  }

  const duplicateItemIds =
    dto.items
      .map((item) => item.purchaseOrderItemId)
      .filter(
        (itemId, index, rows) =>
          rows.indexOf(itemId) !== index,
      );

  if (duplicateItemIds.length > 0) {
    throw new BadRequestException(
      'No puedes repetir el mismo artículo en una recepción.',
    );
  }

  return this.prisma.$transaction(
    async (tx) => {
      /*
       * Serializa las recepciones de una misma orden.
       *
       * El proyecto usa MySQL. FOR UPDATE evita que dos
       * recepciones concurrentes de la misma orden validen
       * cantidades/estado sobre la misma versión.
       */
      const lockedOrder =
        await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM purchase_orders
          WHERE id = ${id}
            AND company_id = ${companyId}
          FOR UPDATE
        `;

      if (lockedOrder.length === 0) {
        throw new NotFoundException(
          'Orden de compra no encontrada.',
        );
      }

      const order =
        await tx.purchaseOrder.findFirst({
          where: {
            id,
            companyId,
          },

          include: {
            supplier: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Orden de compra no encontrada.',
        );
      }

      if (order.status === 'CANCELLED') {
        throw new BadRequestException(
          'No se puede recibir una orden cancelada.',
        );
      }

      if (order.status === 'RECEIVED') {
        throw new BadRequestException(
          'La orden ya fue recibida completamente.',
        );
      }

      const itemMap =
        new Map(
          order.items.map(
            (item) => [
              item.id,
              item,
            ],
          ),
        );

      for (const receivedItem of dto.items) {
        const orderItem =
          itemMap.get(
            receivedItem.purchaseOrderItemId,
          );

        if (!orderItem) {
          throw new BadRequestException(
            'Uno de los productos recibidos no pertenece a esta orden.',
          );
        }

        if (!orderItem.product.trackInventory) {
          throw new BadRequestException(
            `${orderItem.product.name} no controla inventario.`,
          );
        }

        const orderedQuantity =
          Number(orderItem.quantity);

        /*
         * receivedQuantity se incrementa de forma atómica.
         * La orden ya está bloqueada, por lo que otra
         * recepción de la misma OC no puede adelantarse.
         */
        const updatedOrderItem =
          await tx.purchaseOrderItem.update({
            where: {
              id: orderItem.id,
            },

            data: {
              receivedQuantity: {
                increment:
                  receivedItem.quantity,
              },
            },
          });

        const newReceivedQuantity =
          Number(
            updatedOrderItem.receivedQuantity,
          );

        if (
          newReceivedQuantity >
          orderedQuantity
        ) {
          /*
           * Lanzar dentro de la transacción revierte
           * también el incremento anterior.
           */
          throw new BadRequestException(
            `La recepción de ${orderItem.product.name} supera la cantidad ordenada.`,
          );
        }

        /* CALCULATE_WEIGHTED_AVERAGE_COST
         * Bloquea el inventario del producto en la sucursal para impedir
         * que dos órdenes concurrentes calculen el costo sobre el mismo saldo.
         */
        const lockedBranchProduct =
          await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM product_branches
            WHERE company_id = ${order.companyId}
              AND branch_id = ${order.branchId}
              AND product_id = ${orderItem.productId}
            FOR UPDATE
          `;

        if (lockedBranchProduct.length === 0) {
          throw new BadRequestException(
            `${orderItem.product.name} no está asignado a la sucursal de la orden.`,
          );
        }

        const branchProduct =
          await tx.productBranch.findUnique({
            where: {
              productId_branchId: {
                productId: orderItem.productId,
                branchId: order.branchId,
              },
            },
            include: {
              pointOfSales: {
                where: { active: true },
                select: { pointOfSaleId: true },
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          });

        if (!branchProduct?.active || !branchProduct.trackInventory) {
          throw new BadRequestException(
            `${orderItem.product.name} no controla inventario en esta sucursal.`,
          );
        }

        const pointOfSaleId =
          branchProduct.pointOfSales[0]?.pointOfSaleId;

        if (!pointOfSaleId) {
          throw new BadRequestException(
            `${orderItem.product.name} no tiene un punto de venta activo en esta sucursal.`,
          );
        }

        const previousStock =
          Number(branchProduct.stockQuantity);
        const receivedQuantity =
          Number(receivedItem.quantity);
        const purchaseUnitCost =
          Number(orderItem.unitCost);
        const previousUnitCost =
          branchProduct.unitCost === null
            ? purchaseUnitCost
            : Number(branchProduct.unitCost);

        const valuedPreviousStock =
          Math.max(previousStock, 0);
        const valuedNewStock =
          valuedPreviousStock + receivedQuantity;
        const newStock =
          previousStock + receivedQuantity;
        const weightedUnitCost =
          Math.round(
            (((valuedPreviousStock * previousUnitCost) +
              (receivedQuantity * purchaseUnitCost)) /
              valuedNewStock +
              Number.EPSILON) *
              10_000,
          ) / 10_000;

        await tx.productBranch.update({
          where: { id: branchProduct.id },
          data: {
            stockQuantity: newStock,
            unitCost: weightedUnitCost,
          },
        });

        /* Mantiene sincronizados los campos heredados del producto principal
         * mientras otros procesos terminan de migrar a ProductBranch.
         */
        if (orderItem.product.branchId === order.branchId) {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: {
              stockQuantity: newStock,
              unitCost: weightedUnitCost,
            },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            companyId: order.companyId,
            branchId: order.branchId,
            pointOfSaleId,
            productId: orderItem.productId,
            type: 'PURCHASE',
            quantity: receivedQuantity,
            previousStock,
            newStock,
            /* KARDEX_PURCHASE_VALUE */
            unitCost: purchaseUnitCost,
            movementValue:
              Math.round(
                (receivedQuantity * purchaseUnitCost + Number.EPSILON) * 100,
              ) / 100,
            referenceType: 'PURCHASE_ORDER',
            referenceId: order.id,
            referenceNumber: order.orderNumber,
            note:
              `Recepción de compra ${order.orderNumber} - ${order.supplier.name}. Costo promedio: ${weightedUnitCost}.`,
            createdBy: actor.username,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId: order.companyId,
            userId: actor.userId,
            action: 'UPDATE_WEIGHTED_AVERAGE_COST',
            entityType: 'PRODUCT_BRANCH',
            entityId: branchProduct.id,
            reason: `Recepción de la orden ${order.orderNumber}.`,
            oldValues: {
              stockQuantity: previousStock,
              unitCost: previousUnitCost,
            },
            newValues: {
              receivedQuantity,
              purchaseUnitCost,
              stockQuantity: newStock,
              unitCost: weightedUnitCost,
            },
            ipAddress: actor.ipAddress,
          },
        });
      }

      const refreshedItems =
        await tx.purchaseOrderItem.findMany({
          where: {
            purchaseOrderId:
              order.id,
          },
        });

      const fullyReceived =
        refreshedItems.every(
          (item) =>
            Number(
              item.receivedQuantity,
            ) >=
            Number(
              item.quantity,
            ),
        );

      const partiallyReceived =
        refreshedItems.some(
          (item) =>
            Number(
              item.receivedQuantity,
            ) > 0,
        );

      const status =
        fullyReceived
          ? 'RECEIVED'
          : partiallyReceived
            ? 'PARTIALLY_RECEIVED'
            : 'OPEN';

      await tx.purchaseOrder.update({
        where: {
          id: order.id,
        },

        data: {
          status,

          receivedAt:
            fullyReceived
              ? new Date()
              : null,
        },
      });

      const result =
        await tx.purchaseOrder.findUnique({
          where: {
            id: order.id,
          },

          include: {
            supplier: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        });

      if (!result) {
        throw new NotFoundException(
          'Orden de compra no encontrada.',
        );
      }

      await tx.auditLog.create({
        data: {
          companyId:
            order.companyId,
          userId:
            actor.userId,
          action:
            'RECEIVE_PURCHASE_ORDER',
          entityType:
            'PURCHASE_ORDER',
          entityId:
            order.id,
          reason:
            null,
          oldValues: {
            status:
              order.status,
            receivedQuantities:
              order.items.map(
                (item) => ({
                  itemId:
                    item.id,
                  productId:
                    item.productId,
                  receivedQuantity:
                    Number(
                      item.receivedQuantity,
                    ),
                }),
              ),
          },
          newValues: {
            status:
              result.status,
            receivedItems:
              dto.items.map(
                (item) => ({
                  purchaseOrderItemId:
                    item.purchaseOrderItemId,
                  quantity:
                    item.quantity,
                }),
              ),
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return this.mapPurchaseOrder(
        result,
      );
    },
  );
}


  async createSupplier(
    dto: CreateSupplierDto,
    authenticatedCompanyId: string,
    actor: PurchaseAuditActor,
  ): Promise<SupplierResponse> {
    if (dto.companyId !== authenticatedCompanyId) {
      throw new BadRequestException(
        'La empresa indicada no corresponde a la sesión autenticada.',
      );
    }

    const company =
      await this.prisma.company.findUnique({
        where: {
          id: dto.companyId,
        },
      });

    if (!company) {
      throw new NotFoundException(
        'Empresa no encontrada.',
      );
    }

    const row =
      await this.prisma.$transaction(
        async (tx) => {
          const created =
            await tx.supplier.create({
              data: {
                companyId: dto.companyId,
                name: dto.name.trim(),
                taxId:
                  dto.taxId?.trim() || null,
                phone:
                  dto.phone?.trim() || null,
                email:
                  dto.email?.trim() || null,
                address:
                  dto.address?.trim() || null,
              },
            });

          await tx.auditLog.create({
            data: {
              companyId:
                created.companyId,
              userId:
                actor.userId,
              action:
                'CREATE_SUPPLIER',
              entityType:
                'SUPPLIER',
              entityId:
                created.id,
              reason:
                null,
              newValues: {
                name:
                  created.name,
                taxId:
                  created.taxId,
                phone:
                  created.phone,
                email:
                  created.email,
                address:
                  created.address,
                active:
                  created.active,
              },
              ipAddress:
                actor.ipAddress,
            },
          });

          return created;
        },
      );

    return this.mapSupplier(row);
  }

  async updateSupplier(
    id: string,
    dto: UpdateSupplierDto,
    companyId: string,
    actor: PurchaseAuditActor,
  ): Promise<SupplierResponse> {
    const row =
      await this.prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.supplier.findFirst({
              where: {
                id,
                companyId,
              },
            });

          if (!existing) {
            throw new NotFoundException(
              'Proveedor no encontrado.',
            );
          }

          const updated =
            await tx.supplier.update({
              where: {
                id,
              },
              data: {
                name:
                  dto.name.trim(),
                taxId:
                  dto.taxId?.trim() || null,
                phone:
                  dto.phone?.trim() || null,
                email:
                  dto.email?.trim() || null,
                address:
                  dto.address?.trim() || null,
                active:
                  dto.active,
              },
            });

          await tx.auditLog.create({
            data: {
              companyId,
              userId:
                actor.userId,
              action:
                'UPDATE_SUPPLIER',
              entityType:
                'SUPPLIER',
              entityId:
                updated.id,
              reason:
                null,
              oldValues: {
                name:
                  existing.name,
                taxId:
                  existing.taxId,
                phone:
                  existing.phone,
                email:
                  existing.email,
                address:
                  existing.address,
                active:
                  existing.active,
              },
              newValues: {
                name:
                  updated.name,
                taxId:
                  updated.taxId,
                phone:
                  updated.phone,
                email:
                  updated.email,
                address:
                  updated.address,
                active:
                  updated.active,
              },
              ipAddress:
                actor.ipAddress,
            },
          });

          return updated;
        },
      );

    return this.mapSupplier(row);
  }

  private mapPurchaseOrder(
    row: {
      id: string;
      companyId: string;
      branchId: string;
      supplierId: string;
      orderNumber: string;
      status:
        | 'DRAFT'
        | 'OPEN'
        | 'PARTIALLY_RECEIVED'
        | 'RECEIVED'
        | 'CANCELLED';
      notes: string | null;
      createdBy: string | null;
      orderedAt: Date | null;
      receivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      supplier: {
        name: string;
      };
      items: Array<{
        id: string;
        productId: string;
        quantity: unknown;
        receivedQuantity: unknown;
        unitCost: unknown;
        product: {
          name: string;
          sku: string;
        };
      }>;
    },
  ): PurchaseOrderResponse {
    return {
      id: row.id,
      companyId: row.companyId,
      branchId: row.branchId,
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      orderNumber: row.orderNumber,
      status: row.status,
      notes: row.notes,
      createdBy: row.createdBy,
      orderedAt:
        row.orderedAt?.toISOString() ?? null,
      receivedAt:
        row.receivedAt?.toISOString() ?? null,
      createdAt:
        row.createdAt.toISOString(),
      updatedAt:
        row.updatedAt.toISOString(),
      items: row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: Number(item.quantity),
        receivedQuantity:
          Number(item.receivedQuantity),
        unitCost: Number(item.unitCost),
      })),
    };
  }

  private mapSupplier(
    row: {
      id: string;
      companyId: string;
      name: string;
      taxId: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
  ): SupplierResponse {
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      taxId: row.taxId,
      phone: row.phone,
      email: row.email,
      address: row.address,
      active: row.active,
      createdAt:
        row.createdAt.toISOString(),
      updatedAt:
        row.updatedAt.toISOString(),
    };
  }

  async cancelPurchaseOrder(
    id: string,
    companyId: string,
    actor: PurchaseAuditActor,
  ): Promise<PurchaseOrderResponse> {
    return this.prisma.$transaction(
      async (tx) => {
        /*
         * Serializa cancelaciones y recepciones de la misma orden.
         *
         * receivePurchaseOrder() bloquea esta misma fila con FOR UPDATE.
         * Usar el mismo lock aquí evita que una cancelación y una
         * recepción concurrentes validen el estado de la OC sobre
         * versiones diferentes.
         */
        const lockedOrder =
          await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM purchase_orders
            WHERE id = ${id}
              AND company_id = ${companyId}
            FOR UPDATE
          `;

        if (lockedOrder.length === 0) {
          throw new NotFoundException(
            'Orden de compra no encontrada.',
          );
        }

        const order =
          await tx.purchaseOrder.findFirst({
            where: {
              id,
              companyId,
            },
            include: {
              supplier: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          });

        if (!order) {
          throw new NotFoundException(
            'Orden de compra no encontrada.',
          );
        }

        if (order.status === 'CANCELLED') {
          throw new BadRequestException(
            'La orden ya está cancelada.',
          );
        }

        if (order.status === 'RECEIVED') {
          throw new BadRequestException(
            'No se puede cancelar una orden recibida.',
          );
        }

        const hasReceivedItems =
          order.items.some(
            (item) =>
              Number(
                item.receivedQuantity,
              ) > 0,
          );

        if (
          order.status === 'PARTIALLY_RECEIVED' ||
          hasReceivedItems
        ) {
          throw new BadRequestException(
            'No se puede cancelar una orden con mercancía recibida.',
          );
        }

        const updated =
          await tx.purchaseOrder.update({
            where: {
              id,
            },
            data: {
              status: 'CANCELLED',
            },
            include: {
              supplier: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          });

        await tx.auditLog.create({
          data: {
            companyId:
              order.companyId,
            userId:
              actor.userId,
            action:
              'CANCEL_PURCHASE_ORDER',
            entityType:
              'PURCHASE_ORDER',
            entityId:
              order.id,
            reason:
              null,
            oldValues: {
              status:
                order.status,
            },
            newValues: {
              status:
                updated.status,
            },
            ipAddress:
              actor.ipAddress,
          },
        });

        return this.mapPurchaseOrder(
          updated,
        );
      },
    );
  }


  async supplierPayments(
    companyId: string,
    branchId?: string,
    supplierId?: string,
  ): Promise<SupplierPaymentResponse[]> {
    const rows =
      await this.prisma.supplierPayment.findMany({
        where: {
          companyId,
          ...(branchId ? { branchId } : {}),
          ...(supplierId ? { supplierId } : {}),
        },
        include: {
          supplier: true,
          method: true,
        },
        orderBy: {
          paidAt: 'desc',
        },
      });

    return rows.map((row) =>
      this.mapSupplierPayment(row),
    );
  }

  async createSupplierPayment(
    dto: CreateSupplierPaymentDto,
    authenticatedCompanyId: string,
    actor: PurchaseAuditActor,
  ): Promise<SupplierPaymentResponse> {
    if (dto.companyId !== authenticatedCompanyId) {
      throw new BadRequestException(
        'La empresa indicada no corresponde a la sesión autenticada.',
      );
    }

    const created =
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Serializa pagos concurrentes sobre la misma factura.
           *
           * El proyecto usa MySQL. FOR UPDATE evita que dos pagos
           * lean y validen simultáneamente el mismo saldo pendiente.
           */
          const lockedInvoice =
            await tx.$queryRaw<Array<{ id: string }>>`
              SELECT id
              FROM supplier_invoices
              WHERE id = ${dto.supplierInvoiceId}
                AND company_id = ${dto.companyId}
                AND branch_id = ${dto.branchId}
                AND supplier_id = ${dto.supplierId}
              FOR UPDATE
            `;

          if (lockedInvoice.length === 0) {
            throw new NotFoundException(
              'Factura de suplidor no encontrada.',
            );
          }

          const invoice =
            await tx.supplierInvoice.findFirst({
              where: {
                id: dto.supplierInvoiceId,
                companyId: dto.companyId,
                branchId: dto.branchId,
                supplierId: dto.supplierId,
              },
            });

          if (!invoice) {
            throw new NotFoundException(
              'Factura de suplidor no encontrada.',
            );
          }

          if (invoice.status === 'CANCELLED') {
            throw new BadRequestException(
              'No se puede pagar una factura cancelada.',
            );
          }

          const currentBalance =
            Number(invoice.balance);

          if (
            invoice.status === 'PAID' ||
            currentBalance <= 0
          ) {
            throw new BadRequestException(
              'La factura ya está pagada.',
            );
          }

          if (dto.amount > currentBalance) {
            throw new BadRequestException(
              'El pago no puede superar el saldo pendiente de la factura.',
            );
          }

          const supplier =
            await tx.supplier.findFirst({
              where: {
                id: dto.supplierId,
                companyId: dto.companyId,
                active: true,
              },
            });

          if (!supplier) {
            throw new NotFoundException(
              'Suplidor no encontrado o inactivo.',
            );
          }

          const branch =
            await tx.branch.findFirst({
              where: {
                id: dto.branchId,
                companyId: dto.companyId,
                active: true,
              },
            });

          if (!branch) {
            throw new NotFoundException(
              'Sucursal no encontrada.',
            );
          }

          const method =
            await tx.paymentMethod.findFirst({
              where: {
                id: dto.paymentMethodId,
                active: true,
              },
            });

          if (!method) {
            throw new NotFoundException(
              'Método de pago no encontrado o inactivo.',
            );
          }

          const payment =
            await tx.supplierPayment.create({
              data: {
                companyId: dto.companyId,
                branchId: dto.branchId,
                supplierId: dto.supplierId,
                paymentMethodId:
                  dto.paymentMethodId,

                amount: dto.amount,

                reference:
                  dto.reference?.trim() || null,

                description:
                  dto.description?.trim() || null,

                createdBy:
                  actor.username,

                allocations: {
                  create: {
                    supplierInvoiceId:
                      invoice.id,

                    amount:
                      dto.amount,
                  },
                },
              },

              include: {
                supplier: true,
                method: true,
              },
            });

          if (method.type === 'CASH') {
            if (!dto.cashSessionId) {
              throw new BadRequestException(
                'Los pagos en efectivo requieren una sesión de caja abierta.',
              );
            }

            const cashSession =
              await tx.cashSession.findFirst({
                where: {
                  id: dto.cashSessionId,
                  status: 'OPEN',

                  cashRegister: {
                    branchId:
                      dto.branchId,
                  },
                },
              });

            if (!cashSession) {
              throw new BadRequestException(
                'No existe una sesión de caja abierta válida para este pago.',
              );
            }

            await tx.cashMovement.create({
              data: {
                cashSessionId:
                  cashSession.id,

                type:
                  'EXPENSE',

                amount:
                  dto.amount,

                description:
                  `Pago a suplidor ${supplier.name}`,

                beneficiary:
                  supplier.name,

                externalReference:
                  dto.reference?.trim() ||
                  payment.id,

                referenceType:
                  'SUPPLIER_PAYMENT',

                referenceId:
                  payment.id,
              },
            });
          }

          /*
           * invoice está bloqueada desde el inicio de la transacción,
           * por lo que currentBalance sigue siendo la base válida
           * para este pago.
           */
          const newBalance =
            currentBalance -
            dto.amount;

          const updatedInvoice =
            await tx.supplierInvoice.update({
              where: {
                id: invoice.id,
              },

              data: {
                balance:
                  newBalance,

                status:
                  newBalance <= 0
                    ? 'PAID'
                    : 'PARTIALLY_PAID',
              },
            });

          await tx.auditLog.create({
            data: {
              companyId:
                dto.companyId,
              userId:
                actor.userId,
              action:
                'CREATE_SUPPLIER_PAYMENT',
              entityType:
                'SUPPLIER_PAYMENT',
              entityId:
                payment.id,
              reason:
                null,
              oldValues: {
                supplierInvoiceId:
                  invoice.id,
                invoiceBalance:
                  currentBalance,
                invoiceStatus:
                  invoice.status,
              },
              newValues: {
                supplierInvoiceId:
                  invoice.id,
                amount:
                  dto.amount,
                paymentMethodId:
                  dto.paymentMethodId,
                invoiceBalance:
                  Number(
                    updatedInvoice.balance,
                  ),
                invoiceStatus:
                  updatedInvoice.status,
              },
              ipAddress:
                actor.ipAddress,
            },
          });

          return payment;
        },
      );

    return this.mapSupplierPayment(
      created,
    );
  }

  private mapSupplierPayment(
    row: {
      id: string;
      companyId: string;
      branchId: string;
      supplierId: string;
      paymentMethodId: string;
      status: 'ISSUED' | 'CANCELLED';
      reference: string | null;
      description: string | null;
      amount: unknown;
      paidAt: Date;
      createdBy: string | null;
      createdAt: Date;
      supplier: {
        name: string;
      };
      method: {
        name: string;
      };
    },
  ): SupplierPaymentResponse {
    return {
      id: row.id,
      companyId: row.companyId,
      branchId: row.branchId,
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      paymentMethodId:
        row.paymentMethodId,
      paymentMethodName:
        row.method.name,
      status: row.status,
      reference: row.reference,
      description: row.description,
      amount: Number(row.amount),
      paidAt: row.paidAt.toISOString(),
      createdBy: row.createdBy,
      createdAt:
        row.createdAt.toISOString(),
    };
  }


  private mapSupplierInvoice(
    row: {
      id: string;
      companyId: string;
      branchId: string;
      supplierId: string;
      purchaseOrderId: string | null;
      invoiceNumber: string;
      status:
        | 'PENDING'
        | 'PARTIALLY_PAID'
        | 'PAID'
        | 'CANCELLED';
      subtotal: unknown;
      taxAmount: unknown;
      total: unknown;
      balance: unknown;
      issuedAt: Date;
      dueDate: Date | null;
      notes: string | null;
      createdBy: string | null;
      createdAt: Date;
      updatedAt: Date;
      supplier: {
        name: string;
      };
      purchaseOrder: {
        orderNumber: string;
      } | null;
    },
  ): SupplierInvoiceResponse {
    return {
      id: row.id,
      companyId: row.companyId,
      branchId: row.branchId,
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      purchaseOrderId: row.purchaseOrderId,
      purchaseOrderNumber:
        row.purchaseOrder?.orderNumber ?? null,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      subtotal: Number(row.subtotal),
      taxAmount: Number(row.taxAmount),
      total: Number(row.total),
      balance: Number(row.balance),
      issuedAt: row.issuedAt.toISOString(),
      dueDate:
        row.dueDate?.toISOString() ?? null,
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

}
