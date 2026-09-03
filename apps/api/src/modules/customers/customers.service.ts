import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@cactus/database";
import type {
  CustomerResponse,
  CustomerVehicleResponse,
  CustomerInvoiceResponse,
  CustomerInvoiceDetailResponse,
  IssueCustomerCreditNoteResponse,
  PayCustomerInvoiceResponse,
  CancelCustomerCreditNoteResponse,
  CustomerReceivableAgingResponse,
  CustomerReceivableAgingBucket,
  CustomerCollectionActivityResponse,
  CustomerCollectionFollowUpsResponse,
  ResolveCustomerCollectionFollowUpResponse,
} from "@cactus/shared";

import { IssueCustomerCreditNoteDto } from "./dto/issue-customer-credit-note.dto";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { UpdateCustomerCreditDto } from "./dto/update-customer-credit.dto";
import { CreateCustomerVehicleDto } from "./dto/create-customer-vehicle.dto";
import { PayCustomerInvoiceDto } from "./dto/pay-customer-invoice.dto";
import { CreateCustomerCollectionActivityDto } from "./dto/create-customer-collection-activity.dto";
import { ResolveCustomerCollectionFollowUpDto } from "./dto/resolve-customer-collection-follow-up.dto";
type CustomerAuditActor = {
  userId: string;
  companyId: string;
  username: string;
  branchAccessMode: "ALL" | "ASSIGNED";
  branchIds: string[];
  ipAddress: string | null;
};

type CustomerBranchAccessContext = {
  companyId: string;
  branchAccessMode: "ALL" | "ASSIGNED";
  branchIds: string[];
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private invoiceBranchFilter(access: CustomerBranchAccessContext) {
    return access.branchAccessMode === "ASSIGNED"
      ? {
          order: {
            branchId: {
              in: access.branchIds,
            },
          },
        }
      : {};
  }

  private customerResponse(customer: {
    id: string;
    companyId: string;
    type: "GENERAL" | "REGISTERED" | "CREDIT";
    displayName: string;
    legalName: string | null;
    phone: string | null;
    email: string | null;
    taxId: string | null;
    creditEnabled: boolean;
    creditLimit: unknown;
    creditDays: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      vehicles: number;
    };
  }): CustomerResponse {
    return {
      id: customer.id,
      companyId: customer.companyId,
      type: customer.type,
      displayName: customer.displayName,
      legalName: customer.legalName,
      phone: customer.phone,
      email: customer.email,
      taxId: customer.taxId,
      creditEnabled: customer.creditEnabled,
      creditLimit: Number(customer.creditLimit),
      creditDays: customer.creditDays,
      active: customer.active,
      vehicleCount: customer._count.vehicles,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  private vehicleResponse(vehicle: {
    id: string;
    customerId: string | null;
    vehicleTypeId: string;
    brandId: string | null;
    modelId: string | null;
    plate: string | null;
    color: string | null;
    description: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    vehicleType: {
      name: string;
    };
    brand: {
      name: string;
    } | null;
    model: {
      name: string;
    } | null;
  }): CustomerVehicleResponse {
    if (!vehicle.customerId) {
      throw new BadRequestException(
        "El vehículo no está asociado a un cliente.",
      );
    }

    return {
      id: vehicle.id,
      customerId: vehicle.customerId,
      vehicleTypeId: vehicle.vehicleTypeId,
      vehicleTypeName: vehicle.vehicleType.name,
      brandId: vehicle.brandId,
      brandName: vehicle.brand?.name ?? null,
      modelId: vehicle.modelId,
      modelName: vehicle.model?.name ?? null,
      plate: vehicle.plate,
      color: vehicle.color,
      description: vehicle.description,
      active: vehicle.active,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
  }

  async list(companyId: string, search?: string): Promise<CustomerResponse[]> {
    const query = search?.trim();

    const customers = await this.prisma.customer.findMany({
      where: {
        companyId,
        ...(query
          ? {
              OR: [
                {
                  displayName: {
                    contains: query,
                  },
                },
                {
                  legalName: {
                    contains: query,
                  },
                },
                {
                  phone: {
                    contains: query,
                  },
                },
                {
                  email: {
                    contains: query,
                  },
                },
                {
                  taxId: {
                    contains: query,
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            vehicles: true,
          },
        },
      },
      orderBy: [
        {
          active: "desc",
        },
        {
          displayName: "asc",
        },
      ],
    });

    return customers.map((customer) => this.customerResponse(customer));
  }

  async get(companyId: string, id: string): Promise<CustomerResponse> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        _count: {
          select: {
            vehicles: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado.");
    }

    return this.customerResponse(customer);
  }

  async create(
    companyId: string,
    dto: CreateCustomerDto,
    actor: CustomerAuditActor,
  ): Promise<CustomerResponse> {
    if (companyId !== actor.companyId) {
      throw new NotFoundException("Empresa no encontrada.");
    }

    const displayName = dto.displayName.trim();

    if (!displayName) {
      throw new BadRequestException("El nombre del cliente es obligatorio.");
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          companyId,
          type: dto.type ?? "REGISTERED",
          displayName,
          legalName: dto.legalName?.trim() || null,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          taxId: dto.taxId?.trim() || null,
          active: dto.active ?? true,
        },
        include: {
          _count: {
            select: {
              vehicles: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.userId,
          action: "CREATE_CUSTOMER",
          entityType: "CUSTOMER",
          entityId: created.id,
          reason: null,
          newValues: {
            type: created.type,
            displayName: created.displayName,
            legalName: created.legalName,
            phone: created.phone,
            email: created.email,
            taxId: created.taxId,
            active: created.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return created;
    });

    return this.customerResponse(customer);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCustomerDto,
    actor: CustomerAuditActor,
  ): Promise<CustomerResponse> {
    if (companyId !== actor.companyId) {
      throw new NotFoundException("Cliente no encontrado.");
    }

    if (dto.displayName !== undefined && !dto.displayName.trim()) {
      throw new BadRequestException(
        "El nombre del cliente no puede quedar vacío.",
      );
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          _count: {
            select: {
              vehicles: true,
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Cliente no encontrado.");
      }

      const updated = await tx.customer.update({
        where: {
          id,
        },
        data: {
          ...(dto.type !== undefined
            ? {
                type: dto.type,
              }
            : {}),
          ...(dto.displayName !== undefined
            ? {
                displayName: dto.displayName.trim(),
              }
            : {}),
          ...(dto.legalName !== undefined
            ? {
                legalName: dto.legalName?.trim() || null,
              }
            : {}),
          ...(dto.phone !== undefined
            ? {
                phone: dto.phone?.trim() || null,
              }
            : {}),
          ...(dto.email !== undefined
            ? {
                email: dto.email?.trim() || null,
              }
            : {}),
          ...(dto.taxId !== undefined
            ? {
                taxId: dto.taxId?.trim() || null,
              }
            : {}),
          ...(dto.active !== undefined
            ? {
                active: dto.active,
              }
            : {}),
        },
        include: {
          _count: {
            select: {
              vehicles: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.userId,
          action: "UPDATE_CUSTOMER",
          entityType: "CUSTOMER",
          entityId: updated.id,
          reason: null,
          oldValues: {
            type: existing.type,
            displayName: existing.displayName,
            legalName: existing.legalName,
            phone: existing.phone,
            email: existing.email,
            taxId: existing.taxId,
            active: existing.active,
          },
          newValues: {
            type: updated.type,
            displayName: updated.displayName,
            legalName: updated.legalName,
            phone: updated.phone,
            email: updated.email,
            taxId: updated.taxId,
            active: updated.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return updated;
    });

    return this.customerResponse(customer);
  }

  async resolveCollectionFollowUp(
    companyId: string,
    customerId: string,
    activityId: string,
    dto: ResolveCustomerCollectionFollowUpDto,
    actor: CustomerAuditActor,
  ): Promise<ResolveCustomerCollectionFollowUpResponse> {
    if (companyId !== actor.companyId) {
      throw new NotFoundException("Seguimiento no encontrado.");
    }

    const resolution = dto.resolution.trim();

    if (!resolution) {
      throw new BadRequestException(
        "Debe indicar la resolución del seguimiento.",
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.customerCollectionActivity.findFirst({
        where: {
          id: activityId,
          customerId,
          companyId,
        },
        include: {
          followUpResolvedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (!activity) {
        throw new NotFoundException("Seguimiento no encontrado.");
      }

      if (!activity.nextFollowUpAt) {
        throw new BadRequestException(
          "La gestión no tiene seguimiento pendiente.",
        );
      }

      if (activity.followUpResolvedAt) {
        throw new BadRequestException("El seguimiento ya fue atendido.");
      }

      const updated = await tx.customerCollectionActivity.update({
        where: {
          id: activity.id,
        },
        data: {
          followUpResolvedAt: new Date(),
          followUpResolvedById: actor.userId,
          followUpResolution: resolution,
        },
        include: {
          followUpResolvedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.userId,
          action: "RESOLVE_CUSTOMER_COLLECTION_FOLLOW_UP",
          entityType: "CUSTOMER_COLLECTION_ACTIVITY",
          entityId: updated.id,
          reason: resolution.slice(0, 255),
          newValues: {
            customerId,
            followUpResolvedAt: updated.followUpResolvedAt,
            followUpResolvedById: updated.followUpResolvedById,
            followUpResolution: updated.followUpResolution,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return updated;
    });

    return {
      activityId: row.id,
      customerId: row.customerId,
      followUpResolvedAt: row.followUpResolvedAt!.toISOString(),
      followUpResolvedById: row.followUpResolvedById,
      followUpResolvedByName: row.followUpResolvedBy?.fullName ?? null,
      followUpResolution: row.followUpResolution!,
      message: "Seguimiento marcado como atendido.",
    };
  }

  async updateCredit(
    companyId: string,
    id: string,
    dto: UpdateCustomerCreditDto,
    actor: CustomerAuditActor,
  ): Promise<CustomerResponse> {
    if (companyId !== actor.companyId) {
      throw new NotFoundException("Cliente no encontrado.");
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          _count: {
            select: {
              vehicles: true,
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Cliente no encontrado.");
      }

      const updated = await tx.customer.update({
        where: {
          id,
        },
        data: {
          creditEnabled: dto.creditEnabled,
          creditLimit: dto.creditLimit,
          creditDays: dto.creditDays,
          type: dto.creditEnabled ? "CREDIT" : "REGISTERED",
        },
        include: {
          _count: {
            select: {
              vehicles: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.userId,
          action: "UPDATE_CUSTOMER_CREDIT",
          entityType: "CUSTOMER",
          entityId: updated.id,
          reason: null,
          oldValues: {
            creditEnabled: existing.creditEnabled,
            creditLimit: Number(existing.creditLimit),
            creditDays: existing.creditDays,
            type: existing.type,
          },
          newValues: {
            creditEnabled: updated.creditEnabled,
            creditLimit: Number(updated.creditLimit),
            creditDays: updated.creditDays,
            type: updated.type,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return updated;
    });

    return this.customerResponse(customer);
  }

  async receivablesAging(
    access: CustomerBranchAccessContext,
  ): Promise<CustomerReceivableAgingResponse> {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const invoices = await this.prisma.invoice.findMany({
      where: {
        customerId: {
          not: null,
        },
        balance: {
          gt: 0,
        },
        customer: {
          companyId: access.companyId,
        },
        ...this.invoiceBranchFilter(access),
      },
      include: {
        customer: {
          select: {
            id: true,
            displayName: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
      orderBy: [
        {
          dueDate: "asc",
        },
        {
          issuedAt: "asc",
        },
      ],
    });

    function aging(dueDate: Date | null): {
      daysOverdue: number;
      bucket: CustomerReceivableAgingBucket;
    } {
      if (!dueDate) {
        return {
          daysOverdue: 0,
          bucket: "CURRENT",
        };
      }

      const dueDay = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
      );

      const millisecondsPerDay = 24 * 60 * 60 * 1000;

      const daysOverdue = Math.max(
        0,
        Math.floor(
          (startOfToday.getTime() - dueDay.getTime()) / millisecondsPerDay,
        ),
      );

      if (daysOverdue === 0) {
        return {
          daysOverdue,
          bucket: "CURRENT",
        };
      }

      if (daysOverdue <= 30) {
        return {
          daysOverdue,
          bucket: "1_30",
        };
      }

      if (daysOverdue <= 60) {
        return {
          daysOverdue,
          bucket: "31_60",
        };
      }

      if (daysOverdue <= 90) {
        return {
          daysOverdue,
          bucket: "61_90",
        };
      }

      return {
        daysOverdue,
        bucket: "90_PLUS",
      };
    }

    const invoiceRows = invoices.map((invoice) => {
      if (!invoice.customer) {
        throw new Error("Factura CxC sin cliente asociado.");
      }

      const result = aging(invoice.dueDate);

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        orderNumber: invoice.order.orderNumber,
        customerId: invoice.customer.id,
        customerName: invoice.customer.displayName,
        issuedAt: invoice.issuedAt.toISOString(),
        dueDate: invoice.dueDate?.toISOString() ?? null,
        total: Number(invoice.total),
        balance: Number(invoice.balance),
        daysOverdue: result.daysOverdue,
        bucket: result.bucket,
      };
    });

    type CustomerAccumulator = {
      customerId: string;
      customerName: string;
      totalReceivable: number;
      current: number;
      days1To30: number;
      days31To60: number;
      days61To90: number;
      days90Plus: number;
      overdueBalance: number;
      openInvoices: number;
      overdueInvoices: number;
    };

    const customerMap = new Map<string, CustomerAccumulator>();

    for (const invoice of invoiceRows) {
      const customer = customerMap.get(invoice.customerId) ?? {
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        totalReceivable: 0,
        current: 0,
        days1To30: 0,
        days31To60: 0,
        days61To90: 0,
        days90Plus: 0,
        overdueBalance: 0,
        openInvoices: 0,
        overdueInvoices: 0,
      };

      customer.totalReceivable += invoice.balance;

      customer.openInvoices += 1;

      switch (invoice.bucket) {
        case "CURRENT":
          customer.current += invoice.balance;
          break;

        case "1_30":
          customer.days1To30 += invoice.balance;
          break;

        case "31_60":
          customer.days31To60 += invoice.balance;
          break;

        case "61_90":
          customer.days61To90 += invoice.balance;
          break;

        case "90_PLUS":
          customer.days90Plus += invoice.balance;
          break;
      }

      if (invoice.daysOverdue > 0) {
        customer.overdueBalance += invoice.balance;

        customer.overdueInvoices += 1;
      }

      customerMap.set(invoice.customerId, customer);
    }

    const customers = [...customerMap.values()].sort(
      (a, b) => b.totalReceivable - a.totalReceivable,
    );

    const summary = {
      totalReceivable: 0,
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
      overdueBalance: 0,
      openInvoices: 0,
      overdueInvoices: 0,
      overdueCustomers: 0,
    };

    for (const customer of customers) {
      summary.totalReceivable += customer.totalReceivable;
      summary.current += customer.current;
      summary.days1To30 += customer.days1To30;
      summary.days31To60 += customer.days31To60;
      summary.days61To90 += customer.days61To90;
      summary.days90Plus += customer.days90Plus;
      summary.overdueBalance += customer.overdueBalance;
      summary.openInvoices += customer.openInvoices;
      summary.overdueInvoices += customer.overdueInvoices;

      if (customer.overdueBalance > 0) {
        summary.overdueCustomers += 1;
      }
    }

    return {
      asOf: now.toISOString(),
      summary,
      customers,
      invoices: invoiceRows,
    };
  }
  async invoices(
    access: CustomerBranchAccessContext,
    customerId: string,
  ): Promise<CustomerInvoiceResponse[]> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId: access.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado.");
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        customerId,
        customer: {
          companyId: access.companyId,
        },
        ...this.invoiceBranchFilter(access),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      orderId: invoice.orderId,
      orderNumber: invoice.order.orderNumber,
      customerId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      balance: Number(invoice.balance),
      issuedAt: invoice.issuedAt.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
    }));
  }

  async invoice(
    access: CustomerBranchAccessContext,
    customerId: string,
    invoiceId: string,
  ): Promise<CustomerInvoiceDetailResponse> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        customerId,
        customer: {
          companyId: access.companyId,
        },
        ...this.invoiceBranchFilter(access),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        allocations: {
          include: {
            payment: {
              include: {
                method: true,
              },
            },
          },
        },
        creditNotes: {
          orderBy: {
            issuedAt: "desc",
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Factura no encontrada.");
    }

    return {
      id: invoice.id,
      orderId: invoice.orderId,
      orderNumber: invoice.order.orderNumber,
      customerId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      balance: Number(invoice.balance),
      issuedAt: invoice.issuedAt.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,

      payments: invoice.allocations.map((allocation) => ({
        paymentId: allocation.payment.id,
        amount: Number(allocation.amount),
        paymentMethodId: allocation.payment.paymentMethodId,
        paymentMethodName: allocation.payment.method.name,
        paymentMethodType: allocation.payment.method.type,
        reference: allocation.payment.reference,
        receivedAt: allocation.payment.receivedAt.toISOString(),
      })),

      creditNotes: invoice.creditNotes.map((note) => ({
        id: note.id,
        creditNoteNo: note.creditNoteNo,
        status: note.status,
        amount: Number(note.amount),
        reason: note.reason,
        issuedAt: note.issuedAt.toISOString(),
        cancelledAt: note.cancelledAt?.toISOString() ?? null,
      })),
    };
  }

  async payInvoice(
    customerId: string,
    invoiceId: string,
    dto: PayCustomerInvoiceDto,
    actor: CustomerAuditActor,
  ): Promise<PayCustomerInvoiceResponse> {
    const companyId = actor.companyId;

    return this.prisma.$transaction(async (tx) => {
      /*
       * Serializa cobros concurrentes sobre la misma factura.
       * Evita que dos pagos consuman simultáneamente el mismo saldo.
       */
      const lockedInvoice = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT i.id
          FROM invoices i
          INNER JOIN customers c
            ON c.id = i.customer_id
          WHERE i.id = ${invoiceId}
            AND i.customer_id = ${customerId}
            AND c.company_id = ${companyId}
          FOR UPDATE
        `;

      if (lockedInvoice.length === 0) {
        throw new NotFoundException("Factura no encontrada.");
      }

      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          customerId,
          customer: {
            companyId,
          },
          ...this.invoiceBranchFilter(actor),
        },
        include: {
          order: true,
          customer: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException("Factura no encontrada.");
      }

      if (invoice.status === "PAID" || Number(invoice.balance) <= 0) {
        throw new BadRequestException("La factura ya está pagada.");
      }

      if (invoice.status === "CREDIT_NOTED") {
        throw new BadRequestException(
          "La factura tiene una nota de crédito aplicada y no admite cobros por este flujo.",
        );
      }

      const amount = dto.amount;

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(
          "El monto del pago debe ser mayor que cero.",
        );
      }

      const previousBalance = Number(invoice.balance);

      if (amount > previousBalance) {
        throw new BadRequestException(
          "El pago no puede superar el saldo pendiente de la factura.",
        );
      }

      const register = await tx.cashRegister.findFirst({
        where: {
          id: dto.cashRegisterId,
          branchId: invoice.order.branchId,
          active: true,
        },
      });

      if (!register) {
        throw new BadRequestException(
          "La caja seleccionada no corresponde a la sucursal de la factura.",
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
          "Debe abrir la caja antes de registrar el cobro.",
        );
      }

      const method = await tx.paymentMethod.findFirst({
        where: {
          id: dto.paymentMethodId,
          active: true,
        },
      });

      if (!method) {
        throw new BadRequestException("Método de pago no disponible.");
      }

      if (method.type === "CREDIT") {
        throw new BadRequestException(
          "El método de crédito no puede utilizarse para cobrar una cuenta por cobrar.",
        );
      }

      const payment = await tx.payment.create({
        data: {
          paymentMethodId: method.id,

          cashSessionId: session.id,

          amount,

          reference: dto.reference?.trim() || null,

          sourceType: "CUSTOMER_INVOICE",

          sourceId: invoice.id,

          description: `Cobro de factura ${invoice.invoiceNumber}.`,

          allocations: {
            create: {
              invoiceId: invoice.id,
              amount,
            },
          },
        },
      });

      if (method.type === "CASH") {
        await tx.cashMovement.create({
          data: {
            cashSessionId: session.id,

            type: "COLLECTION",

            amount,

            description: `Cobro en efectivo de factura ${invoice.invoiceNumber}.`,

            beneficiary: invoice.customer?.displayName ?? null,

            externalReference: dto.reference?.trim() || payment.id,

            referenceType: "CUSTOMER_INVOICE",

            referenceId: invoice.id,
          },
        });
      }

      const newBalance = previousBalance - amount;

      const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          balance: newBalance,
          status: newStatus,
        },
      });

      if (newStatus === "PAID") {
        await tx.serviceOrder.update({
          where: {
            id: invoice.orderId,
          },
          data: {
            financialStatus: "PAID",
            paidAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId,

          userId: actor.userId,

          action: "PAY_CUSTOMER_INVOICE",

          entityType: "INVOICE",

          entityId: invoice.id,

          reason: null,

          oldValues: {
            status: invoice.status,
            balance: previousBalance,
          },

          newValues: {
            status: updatedInvoice.status,
            balance: Number(updatedInvoice.balance),
            amount,
            paymentId: payment.id,
            paymentMethodId: method.id,
            paymentMethodType: method.type,
            cashSessionId: session.id,
          },

          ipAddress: actor.ipAddress,
        },
      });

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId,
        orderId: invoice.orderId,
        amount,
        previousBalance,
        balance: Number(updatedInvoice.balance),
        status: updatedInvoice.status === "PAID" ? "PAID" : "PARTIALLY_PAID",
        paymentId: payment.id,
        message:
          updatedInvoice.status === "PAID"
            ? "Factura cobrada completamente."
            : "Abono registrado correctamente.",
      };
    });
  }

  async issueCreditNote(
    customerId: string,
    invoiceId: string,
    dto: IssueCustomerCreditNoteDto,
    actor: CustomerAuditActor,
  ): Promise<IssueCustomerCreditNoteResponse> {
    const companyId = actor.companyId;

    return this.prisma.$transaction(async (tx) => {
      /*
       * Serializa notas de crédito concurrentes sobre
       * la misma factura.
       */
      const lockedInvoice = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT i.id
          FROM invoices i
          INNER JOIN customers c
            ON c.id = i.customer_id
          INNER JOIN service_orders so
            ON so.id = i.order_id
          INNER JOIN branches b
            ON b.id = so.branch_id
          WHERE i.id = ${invoiceId}
            AND i.customer_id = ${customerId}
            AND c.company_id = ${companyId}
            AND b.company_id = ${companyId}
          FOR UPDATE
        `;

      if (lockedInvoice.length === 0) {
        throw new NotFoundException("Factura no encontrada.");
      }

      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          customerId,
          customer: {
            companyId,
          },
          ...this.invoiceBranchFilter(actor),
        },
        include: {
          customer: true,
          order: {
            include: {
              branch: true,
            },
          },
          allocations: {
            select: {
              amount: true,
            },
          },
          creditNotes: {
            where: {
              status: "ISSUED",
            },
            select: {
              amount: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundException("Factura no encontrada.");
      }

      const reason = dto.reason.trim();

      if (!reason) {
        throw new BadRequestException(
          "El motivo de la nota de crédito es obligatorio.",
        );
      }

      const amount = dto.amount;

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(
          "El monto de la nota de crédito debe ser mayor que cero.",
        );
      }

      /*
       * En esta primera versión la nota de crédito
       * solamente puede aplicarse contra saldo pendiente.
       *
       * No revierte pagos ni genera devoluciones de efectivo.
       */
      const previousBalance = Number(invoice.balance);

      const previousBalanceCents = Math.round(previousBalance * 100);

      const requestedCents = Math.round(amount * 100);

      if (previousBalanceCents <= 0) {
        throw new BadRequestException(
          "La factura no tiene saldo pendiente para acreditar.",
        );
      }

      if (requestedCents > previousBalanceCents) {
        throw new BadRequestException(
          `La nota de crédito supera el saldo pendiente de la factura. Disponible: ${(
            previousBalanceCents / 100
          ).toFixed(2)}.`,
        );
      }

      /*
       * NumberSequence está segmentado por sucursal y tipo documental.
       * El upsert serializa la numeración mediante la restricción
       * única [branchId, documentType].
       */
      const sequence = await tx.numberSequence.upsert({
        where: {
          branchId_documentType: {
            branchId: invoice.order.branchId,
            documentType: "CREDIT_NOTE",
          },
        },
        update: {
          currentValue: {
            increment: 1,
          },
        },
        create: {
          companyId,
          branchId: invoice.order.branchId,
          documentType: "CREDIT_NOTE",
          prefix: "NC",
          currentValue: 1,
          padding: 8,
        },
      });

      const branchCode = invoice.order.branch.code.trim().toUpperCase();

      if (
        !branchCode ||
        branchCode.length > 17 ||
        !/^[A-Z0-9]+$/.test(branchCode)
      ) {
        throw new BadRequestException(
          "El código de la sucursal no es válido para generar notas de crédito.",
        );
      }

      const creditNoteNo = `${sequence.prefix}-${branchCode}-${String(
        sequence.currentValue,
      ).padStart(sequence.padding, "0")}`;

      const creditNote = await tx.creditNote.create({
        data: {
          companyId,
          invoiceId: invoice.id,
          issuedById: actor.userId,
          creditNoteNo,
          status: "ISSUED",
          amount,
          reason,
        },
      });

      const newBalanceCents = previousBalanceCents - requestedCents;

      const newBalance = newBalanceCents / 100;

      /*
       * Si la factura queda en cero por nota de crédito,
       * queda documentada como CREDIT_NOTED.
       *
       * Si aún queda saldo, preservamos la semántica actual:
       * - PARTIALLY_PAID si ya hubo pagos
       * - CREDIT en caso contrario
       */
      const hasPayments = invoice.allocations.length > 0;

      const newInvoiceStatus =
        newBalanceCents === 0
          ? "CREDIT_NOTED"
          : hasPayments
            ? "PARTIALLY_PAID"
            : "CREDIT";

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          balance: newBalance,
          status: newInvoiceStatus,
        },
      });

      let orderFinancialStatus = invoice.order.financialStatus;

      if (newBalanceCents === 0) {
        const updatedOrder = await tx.serviceOrder.update({
          where: {
            id: invoice.orderId,
          },
          data: {
            financialStatus: "CREDIT_NOTE_APPLIED",
            paidAt: null,
          },
        });

        orderFinancialStatus = updatedOrder.financialStatus;
      } else if (invoice.order.financialStatus === "PAID") {
        /*
         * No debería ocurrir en este flujo porque una factura
         * pagada tiene balance 0, pero mantenemos defensa explícita.
         */
        throw new BadRequestException(
          "Una orden pagada no admite nota de crédito contra saldo pendiente.",
        );
      }

      await tx.auditLog.create({
        data: {
          companyId,

          userId: actor.userId,

          action: "ISSUE_CUSTOMER_CREDIT_NOTE",

          entityType: "CREDIT_NOTE",

          entityId: creditNote.id,

          reason,

          oldValues: {
            invoiceId: invoice.id,
            invoiceStatus: invoice.status,
            invoiceBalance: previousBalance,
            orderFinancialStatus: invoice.order.financialStatus,
          },

          newValues: {
            creditNoteNo: creditNote.creditNoteNo,
            amount,
            invoiceStatus: updatedInvoice.status,
            invoiceBalance: Number(updatedInvoice.balance),
            orderFinancialStatus,
            issuedBy: actor.username,
          },

          ipAddress: actor.ipAddress,
        },
      });

      return {
        creditNote: {
          id: creditNote.id,
          creditNoteNo: creditNote.creditNoteNo,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId,
          orderId: invoice.orderId,
          status: creditNote.status,
          amount: Number(creditNote.amount),
          reason: creditNote.reason,
          issuedAt: creditNote.issuedAt.toISOString(),
        },

        previousBalance,

        balance: Number(updatedInvoice.balance),

        invoiceStatus: newInvoiceStatus,

        orderFinancialStatus,

        message:
          newBalanceCents === 0
            ? "Nota de crédito emitida. La factura quedó totalmente acreditada."
            : "Nota de crédito parcial emitida correctamente.",
      };
    });
  }

  async vehicles(
    companyId: string,
    customerId: string,
  ): Promise<CustomerVehicleResponse[]> {
    await this.get(companyId, customerId);

    const rows = await this.prisma.vehicle.findMany({
      where: {
        customerId,
        customer: {
          companyId,
        },
      },
      include: {
        vehicleType: {
          select: {
            name: true,
          },
        },
        brand: {
          select: {
            name: true,
          },
        },
        model: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          active: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return rows.map((vehicle) => this.vehicleResponse(vehicle));
  }

  async createVehicle(
    companyId: string,
    customerId: string,
    dto: CreateCustomerVehicleDto,
    actor: CustomerAuditActor,
  ): Promise<CustomerVehicleResponse> {
    if (companyId !== actor.companyId) {
      throw new NotFoundException("Cliente no encontrado.");
    }

    const description = dto.description.trim();

    if (!description) {
      throw new BadRequestException(
        "La descripción del vehículo es obligatoria.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
        select: {
          id: true,
        },
      });

      if (!customer) {
        throw new NotFoundException("Cliente no encontrado.");
      }

      const vehicleType = await tx.vehicleType.findFirst({
        where: {
          id: dto.vehicleTypeId,
          active: true,
        },
        select: {
          id: true,
        },
      });

      if (!vehicleType) {
        throw new BadRequestException("Tipo de vehículo no válido o inactivo.");
      }

      let resolvedBrandId = dto.brandId || null;

      let resolvedModelId = dto.modelId || null;

      if (resolvedModelId) {
        const model = await tx.vehicleModel.findUnique({
          where: {
            id: resolvedModelId,
          },
          select: {
            id: true,
            brandId: true,
          },
        });

        if (!model) {
          throw new BadRequestException("Modelo de vehículo no válido.");
        }

        if (resolvedBrandId && resolvedBrandId !== model.brandId) {
          throw new BadRequestException(
            "El modelo seleccionado no pertenece a la marca indicada.",
          );
        }

        resolvedBrandId = model.brandId;
      } else if (resolvedBrandId) {
        const brand = await tx.vehicleBrand.findUnique({
          where: {
            id: resolvedBrandId,
          },
          select: {
            id: true,
          },
        });

        if (!brand) {
          throw new BadRequestException("Marca de vehículo no válida.");
        }
      }

      const vehicle = await tx.vehicle.create({
        data: {
          customerId,
          vehicleTypeId: dto.vehicleTypeId,
          brandId: resolvedBrandId,
          modelId: resolvedModelId,
          plate: dto.plate?.trim() || null,
          color: dto.color?.trim() || null,
          description,
          active: dto.active ?? true,
        },
        include: {
          vehicleType: {
            select: {
              name: true,
            },
          },
          brand: {
            select: {
              name: true,
            },
          },
          model: {
            select: {
              name: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.userId,
          action: "CREATE_CUSTOMER_VEHICLE",
          entityType: "VEHICLE",
          entityId: vehicle.id,
          reason: null,
          newValues: {
            customerId,
            vehicleTypeId: vehicle.vehicleTypeId,
            brandId: vehicle.brandId,
            modelId: vehicle.modelId,
            plate: vehicle.plate,
            color: vehicle.color,
            description: vehicle.description,
            active: vehicle.active,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return this.vehicleResponse(vehicle);
    });
  }

  async cancelCreditNote(
    customerId: string,
    invoiceId: string,
    creditNoteId: string,
    actor: CustomerAuditActor,
  ): Promise<CancelCustomerCreditNoteResponse> {
    const companyId = actor.companyId;

    return this.prisma.$transaction(async (tx) => {
      const lockedInvoice = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT i.id
          FROM invoices i
          INNER JOIN customers c
            ON c.id = i.customer_id
          INNER JOIN service_orders so
            ON so.id = i.order_id
          INNER JOIN branches b
            ON b.id = so.branch_id
          WHERE i.id = ${invoiceId}
            AND i.customer_id = ${customerId}
            AND c.company_id = ${companyId}
            AND b.company_id = ${companyId}
          FOR UPDATE
        `;

      if (lockedInvoice.length === 0) {
        throw new NotFoundException("Nota de crédito no encontrada.");
      }

      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          customerId,
          customer: {
            companyId,
          },
          ...this.invoiceBranchFilter(actor),
        },
        include: {
          order: true,
          allocations: {
            select: {
              amount: true,
            },
          },
          creditNotes: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException("Nota de crédito no encontrada.");
      }

      const creditNote = invoice.creditNotes.find(
        (note) => note.id === creditNoteId && note.companyId === companyId,
      );

      if (!creditNote) {
        throw new NotFoundException("Nota de crédito no encontrada.");
      }

      if (creditNote.status === "CANCELLED") {
        throw new BadRequestException(
          "La nota de crédito ya se encuentra cancelada.",
        );
      }

      const previousBalance = Number(invoice.balance);

      const cancelledAt = new Date();

      await tx.creditNote.update({
        where: {
          id: creditNote.id,
        },
        data: {
          status: "CANCELLED",
          cancelledAt,
        },
      });

      const paymentsCents = invoice.allocations.reduce(
        (sum, row) => sum + Math.round(Number(row.amount) * 100),
        0,
      );

      const activeCreditNotesCents = invoice.creditNotes.reduce((sum, note) => {
        if (note.id === creditNote.id || note.status !== "ISSUED") {
          return sum;
        }

        return sum + Math.round(Number(note.amount) * 100);
      }, 0);

      const totalCents = Math.round(Number(invoice.total) * 100);

      const newBalanceCents = Math.max(
        0,
        totalCents - paymentsCents - activeCreditNotesCents,
      );

      const newBalance = newBalanceCents / 100;

      const hasPayments = paymentsCents > 0;

      const hasActiveCreditNotes = activeCreditNotesCents > 0;

      const newInvoiceStatus =
        newBalanceCents === 0
          ? hasActiveCreditNotes
            ? "CREDIT_NOTED"
            : "PAID"
          : hasPayments
            ? "PARTIALLY_PAID"
            : "CREDIT";

      const newOrderFinancialStatus =
        newBalanceCents === 0
          ? hasActiveCreditNotes
            ? "CREDIT_NOTE_APPLIED"
            : "PAID"
          : hasPayments
            ? "PARTIALLY_PAID"
            : "CREDIT";

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          balance: newBalance,
          status: newInvoiceStatus,
        },
      });

      const updatedOrder = await tx.serviceOrder.update({
        where: {
          id: invoice.orderId,
        },
        data: {
          financialStatus: newOrderFinancialStatus,
          paidAt:
            newOrderFinancialStatus === "PAID"
              ? (invoice.order.paidAt ?? new Date())
              : null,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.userId,
          action: "CANCEL_CUSTOMER_CREDIT_NOTE",
          entityType: "CREDIT_NOTE",
          entityId: creditNote.id,
          reason: creditNote.reason,
          oldValues: {
            status: creditNote.status,
            invoiceStatus: invoice.status,
            invoiceBalance: previousBalance,
            orderFinancialStatus: invoice.order.financialStatus,
          },
          newValues: {
            status: "CANCELLED",
            cancelledAt: cancelledAt.toISOString(),
            invoiceStatus: updatedInvoice.status,
            invoiceBalance: Number(updatedInvoice.balance),
            orderFinancialStatus: updatedOrder.financialStatus,
            cancelledBy: actor.username,
          },
          ipAddress: actor.ipAddress,
        },
      });

      return {
        creditNoteId: creditNote.id,
        creditNoteNo: creditNote.creditNoteNo,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId,
        orderId: invoice.orderId,
        previousBalance,
        balance: Number(updatedInvoice.balance),
        invoiceStatus: newInvoiceStatus,
        orderFinancialStatus: newOrderFinancialStatus,
        cancelledAt: cancelledAt.toISOString(),
        message: "Nota de crédito cancelada correctamente.",
      };
    });
  }

  async collectionActivities(
    companyId: string,
    customerId: string,
  ): Promise<CustomerCollectionActivityResponse[]> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado.");
    }

    const rows = await this.prisma.customerCollectionActivity.findMany({
      where: {
        companyId,
        customerId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return rows.map((row) => ({
      id: row.id,
      customerId: row.customerId,
      contactType: row.contactType,
      result: row.result,
      notes: row.notes,
      nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
      promisedPaymentDate: row.promisedPaymentDate?.toISOString() ?? null,
      promisedAmount:
        row.promisedAmount === null ? null : Number(row.promisedAmount),
      createdAt: row.createdAt.toISOString(),
      createdById: row.createdById,
      createdByName: row.createdBy?.fullName ?? null,
    }));
  }

  async createCollectionActivity(
    companyId: string,
    customerId: string,
    dto: CreateCustomerCollectionActivityDto,
    actor: CustomerAuditActor,
  ): Promise<CustomerCollectionActivityResponse> {
    if (companyId !== actor.companyId) {
      throw new NotFoundException("Cliente no encontrado.");
    }

    const notes = dto.notes.trim();

    if (!notes) {
      throw new BadRequestException(
        "Debe indicar el detalle de la gestión de cobranza.",
      );
    }

    if (dto.result === "PROMISE_TO_PAY" && !dto.promisedPaymentDate) {
      throw new BadRequestException(
        "Una promesa de pago requiere fecha prometida.",
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
        select: {
          id: true,
          displayName: true,
        },
      });

      if (!customer) {
        throw new NotFoundException("Cliente no encontrado.");
      }

      const created = await tx.customerCollectionActivity.create({
        data: {
          companyId,
          customerId,
          createdById: actor.userId,
          contactType: dto.contactType,
          result: dto.result,
          notes,
          nextFollowUpAt: dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : null,
          promisedPaymentDate: dto.promisedPaymentDate
            ? new Date(dto.promisedPaymentDate)
            : null,
          promisedAmount: dto.promisedAmount ?? null,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.userId,
          action: "CREATE_CUSTOMER_COLLECTION_ACTIVITY",
          entityType: "CUSTOMER_COLLECTION_ACTIVITY",
          entityId: created.id,
          reason: notes.slice(0, 255),
          newValues: {
            customerId,
            contactType: created.contactType,
            result: created.result,
            nextFollowUpAt: created.nextFollowUpAt,
            promisedPaymentDate: created.promisedPaymentDate,
            promisedAmount:
              created.promisedAmount === null
                ? null
                : Number(created.promisedAmount),
          },
          ipAddress: actor.ipAddress,
        },
      });

      return created;
    });

    return {
      id: row.id,
      customerId: row.customerId,
      contactType: row.contactType,
      result: row.result,
      notes: row.notes,
      nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
      promisedPaymentDate: row.promisedPaymentDate?.toISOString() ?? null,
      promisedAmount:
        row.promisedAmount === null ? null : Number(row.promisedAmount),
      createdAt: row.createdAt.toISOString(),
      createdById: row.createdById,
      createdByName: row.createdBy?.fullName ?? null,
    };
  }

  async collectionFollowUps(
    companyId: string,
  ): Promise<CustomerCollectionFollowUpsResponse> {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    /*
     * Obtenemos actividades recientes ordenadas
     * por cliente y fecha descendente.
     *
     * Solo la actividad más reciente de cada
     * cliente define el seguimiento vigente.
     */
    const rows = await this.prisma.customerCollectionActivity.findMany({
      where: {
        companyId,
        followUpResolvedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            displayName: true,
          },
        },
        createdBy: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: [
        {
          customerId: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const latestByCustomer = new Map<string, (typeof rows)[number]>();

    for (const row of rows) {
      if (!latestByCustomer.has(row.customerId)) {
        latestByCustomer.set(row.customerId, row);
      }
    }

    const items = [...latestByCustomer.values()]
      .filter((row) => row.nextFollowUpAt !== null)
      .map((row) => {
        const followUpAt = row.nextFollowUpAt!;

        let status: "OVERDUE" | "TODAY" | "UPCOMING";

        if (followUpAt < startOfToday) {
          status = "OVERDUE";
        } else if (followUpAt < startOfTomorrow) {
          status = "TODAY";
        } else {
          status = "UPCOMING";
        }

        return {
          activityId: row.id,

          customerId: row.customer.id,

          customerName: row.customer.displayName,

          result: row.result,

          contactType: row.contactType,

          notes: row.notes,

          nextFollowUpAt: followUpAt.toISOString(),

          promisedPaymentDate: row.promisedPaymentDate?.toISOString() ?? null,

          promisedAmount:
            row.promisedAmount === null ? null : Number(row.promisedAmount),

          createdAt: row.createdAt.toISOString(),

          createdByName: row.createdBy?.fullName ?? null,

          status,
        };
      })
      .sort(
        (a, b) =>
          new Date(a.nextFollowUpAt).getTime() -
          new Date(b.nextFollowUpAt).getTime(),
      );

    return {
      asOf: now.toISOString(),

      summary: {
        total: items.length,

        overdue: items.filter((row) => row.status === "OVERDUE").length,

        today: items.filter((row) => row.status === "TODAY").length,

        upcoming: items.filter((row) => row.status === "UPCOMING").length,
      },

      items,
    };
  }
}