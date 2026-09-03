import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import { randomUUID } from 'node:crypto';
import type {
  CreatedOrderResponse,
  OrderChecklistItemResponse,
  OrderDetailResponse,
  OrderListItemResponse,
  OrderNoteResponse,
  OrderOperationalStatus,
  UpdateOrderStatusResponse,
  OperationalTicketResponse,
  TicketPrintLogResponse,
  AddOrderServiceResponse,
  AuthorizeOrderCreditResponse,
} from '@cactus/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { AddOrderServiceDto } from './dto/add-order-service.dto';
import { CreateOrderNoteDto } from './dto/create-order-note.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { AuthorizeOrderCreditDto } from './dto/authorize-order-credit.dto';

type OrderAuditActor = {
  userId: string;
  companyId: string;
  username: string;
  branchAccessMode: 'ALL' | 'ASSIGNED';
  branchIds: string[];
  ipAddress: string | null;
};

const transitions: Record<OrderOperationalStatus, OrderOperationalStatus[]> = {
  RECEIVED: ['WAITING', 'IN_PROGRESS', 'CANCELLED'],
  WAITING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['SERVICES_COMPLETED', 'CANCELLED'],
  SERVICES_COMPLETED: ['READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const initialChecklist = [
  ['KEYS', 'Llaves entregadas'],
  ['RADIO', 'Radio funcionando'],
  ['AC', 'Aire acondicionado'],
  ['SPARE_TIRE', 'Goma de repuesto'],
  ['TOOLS', 'Herramientas'],
  ['FUEL', 'Nivel de combustible verificado'],
  ['SCRATCHES', 'Rayones existentes verificados'],
  ['DENTS', 'Golpes existentes verificados'],
  ['PERSONAL_ITEMS', 'Objetos personales verificados'],
] as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private branchWhere(
    actor: OrderAuditActor,
  ) {
    return {
      companyId: actor.companyId,
      ...(actor.branchAccessMode === 'ASSIGNED'
        ? {
            id: {
              in: actor.branchIds,
            },
          }
        : {}),
    };
  }

  private assertBranchAccess(
    actor: OrderAuditActor,
    branchId: string,
  ): void {
    if (
      actor.branchAccessMode === 'ASSIGNED' &&
      !actor.branchIds.includes(branchId)
    ) {
      throw new NotFoundException(
        'Orden no encontrada.',
      );
    }
  }

  async list(
    actor: OrderAuditActor,
  ): Promise<OrderListItemResponse[]> {
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        branch: this.branchWhere(actor),
      },
      include: {
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        items: {
          where: {
            status: {
              not: 'VOIDED',
            },
          },
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        entryAt: 'desc',
      },
      take: 200,
    });

    return orders.map((order): OrderListItemResponse => {
      const employees = [
        ...new Set(
          order.items
            .map((item) => item.employee?.fullName)
            .filter((name): name is string => Boolean(name)),
        ),
      ];

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerAlias: order.customerAlias,
        vehicle: order.vehicle.description,
        vehicleType: order.vehicle.vehicleType.name,
        plate: order.vehicle.plate,
        operationalStatus: order.operationalStatus,
        financialStatus: order.financialStatus,
        total: order.items.reduce(
          (sum, item) => sum + Number(item.lineTotal),
          0,
        ),
        servicesCount: order.items.reduce(
          (sum, item) => sum + Number(item.quantity),
          0,
        ),
        employees,
        entryAt: order.entryAt.toISOString(),
      };
    });
  }

  async detail(
    orderId: string,
    actor: OrderAuditActor,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        branch: this.branchWhere(actor),
      },
      include: {
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        items: {
          include: {
            service: {
              include: {
                category: true,
              },
            },
            employee: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        events: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        checklistItems: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        observations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.checklistItems.length === 0) {
      await this.prisma.orderChecklistItem.createMany({
        data: initialChecklist.map(([code, label]) => ({
          orderId: order.id,
          code,
          label,
          checked: false,
        })),
      });

      return this.detail(
        orderId,
        actor,
      );
    }

    const subtotal = order.items.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0,
    );

    const taxAmount = order.items.reduce(
      (sum, item) => sum + Number(item.taxAmount),
      0,
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerAlias: order.customerAlias,
      vehicle: {
        id: order.vehicle.id,
        description: order.vehicle.description,
        plate: order.vehicle.plate,
        vehicleTypeId: order.vehicle.vehicleTypeId,
        vehicleType: order.vehicle.vehicleType.name,
      },
      operationalStatus: order.operationalStatus,
      financialStatus: order.financialStatus,
      qrToken: order.qrToken,
      notes: order.notes,
      entryAt: order.entryAt.toISOString(),
      servicesCompletedAt: order.servicesCompletedAt?.toISOString() ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      services: order.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.descriptionSnapshot,
        category: item.service?.category.name ?? null,
        employeeId: item.employeeId,
        employeeName: item.employee?.fullName ?? null,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        status: item.status,
      })),
      events: order.events.map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        createdAt: event.createdAt.toISOString(),
      })),
      checklist: order.checklistItems.map((item) => ({
        id: item.id,
        code: item.code,
        label: item.label,
        checked: item.checked,
        notes: item.notes,
        updatedAt: item.updatedAt.toISOString(),
      })),
      observations: order.observations.map((note) => ({
        id: note.id,
        visibility: note.visibility,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      })),
    };
  }

  async tickets(
    orderId: string,
    actor: OrderAuditActor,
  ): Promise<OperationalTicketResponse[]> {
    const order = await this.prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        branch: this.branchWhere(actor),
      },
      include: {
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        items: {
          where: {
            status: {
              not: 'VOIDED',
            },
            itemType: 'SERVICE',
          },
          include: {
            employee: true,
            service: {
              include: {
                category: {
                  include: {
                    operationalArea: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Orden no encontrada.',
      );
    }

    const grouped =
      new Map<string, OperationalTicketResponse>();

    for (const item of order.items) {
      const area =
        item.service?.category.operationalArea;

      if (!area) {
        continue;
      }

      const ticketCode =
        `${order.orderNumber}-${area.ticketPrefix}`;

      const current =
        grouped.get(area.id) ?? {
          area: {
            id: area.id,
            code: area.code,
            name: area.name,
            ticketPrefix: area.ticketPrefix,
            color: area.color,
            icon: area.icon,
            printerName: area.printerName,
            printCopies: area.printCopies,
            autoPrint: area.autoPrint,
            slaMinutes: area.slaMinutes,
          },
          ticketCode,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerAlias: order.customerAlias,
          vehicleDescription:
            order.vehicle.description,
          vehicleType:
            order.vehicle.vehicleType.name,
          plate: order.vehicle.plate,
          createdAt:
            order.createdAt.toISOString(),
          lines: [],
          total: 0,
        };

      current.lines.push({
        id: item.id,
        serviceName:
          item.descriptionSnapshot,
        employeeName:
          item.employee?.fullName ?? null,
        quantity:
          Number(item.quantity),
        unitPrice:
          Number(item.unitPrice),
        lineTotal:
          Number(item.lineTotal),
      });

      current.total +=
        Number(item.lineTotal);

      grouped.set(
        area.id,
        current,
      );
    }

    return [
      ...grouped.values(),
    ];
  }

  async registerTicketPrint(
    orderId: string,
    areaCode: string,
    reprint: boolean,
    actor: OrderAuditActor,
  ): Promise<TicketPrintLogResponse> {
    return this.prisma.$transaction(async (tx) => {
      /*
       * Serializa el consecutivo de impresiones por orden.
       */
      const lockedOrder =
        await tx.$queryRaw<
          Array<{
            id: string;
            branchId: string;
          }>
        >`
          SELECT
            so.id,
            so.branch_id AS branchId
          FROM service_orders so
          INNER JOIN branches b
            ON b.id = so.branch_id
          WHERE so.id = ${orderId}
            AND b.company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedOrder.length === 0) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      this.assertBranchAccess(
        actor,
        lockedOrder[0].branchId,
      );

      const order =
        await tx.serviceOrder.findFirst({
          where: {
            id: orderId,
            branch:
              this.branchWhere(actor),
          },
          select: {
            id: true,
            orderNumber: true,
            branchId: true,
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      const area =
        await tx.operationalArea.findFirst({
          where: {
            code: areaCode,
            active: true,
            companyId:
              actor.companyId,
            branchId:
              order.branchId,
          },
        });

      if (!area) {
        throw new NotFoundException(
          'Área operativa no encontrada.',
        );
      }

      const previousCopies =
        await tx.ticketPrintLog.count({
          where: {
            orderId,
            operationalAreaId:
              area.id,
          },
        });

      const log =
        await tx.ticketPrintLog.create({
          data: {
            orderId,
            operationalAreaId:
              area.id,
            ticketCode:
              `${order.orderNumber}-${area.ticketPrefix}`,
            printType:
              reprint ||
              previousCopies > 0
                ? 'REPRINT'
                : 'ORIGINAL',
            copyNumber:
              previousCopies + 1,
            printedBy:
              actor.username,
          },
        });

      await tx.orderEvent.create({
        data: {
          orderId,
          type:
            'STATUS_CHANGED',
          title:
            reprint
              ? 'Ticket reimpreso'
              : 'Ticket impreso',
          description:
            `${area.name}: copia ${log.copyNumber}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'REGISTER_TICKET_PRINT',
          entityType:
            'SERVICE_ORDER',
          entityId:
            order.id,
          newValues: {
            areaCode:
              area.code,
            ticketCode:
              log.ticketCode,
            printType:
              log.printType,
            copyNumber:
              log.copyNumber,
            printedBy:
              actor.username,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return {
        id: log.id,
        ticketCode:
          log.ticketCode,
        printType:
          log.printType,
        copyNumber:
          log.copyNumber,
        printedAt:
          log.printedAt.toISOString(),
      };
    });
  }

  async pay(
    orderId: string,
    dto: PayOrderDto,
    actor: OrderAuditActor,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        /*
         * Serializa cobros concurrentes sobre la misma orden.
         *
         * FOR UPDATE evita que dos solicitudes puedan validar
         * simultáneamente una orden todavía PENDING y registrar
         * dos pagos/cobros sobre el mismo documento.
         */
        const lockedOrder =
          await tx.$queryRaw<
            Array<{
              id: string;
              branchId: string;
            }>
          >`
            SELECT
              so.id,
              so.branch_id AS branchId
            FROM service_orders so
            INNER JOIN branches b
              ON b.id = so.branch_id
            WHERE so.id = ${orderId}
              AND b.company_id = ${actor.companyId}
            FOR UPDATE
          `;

        if (
          lockedOrder.length === 0
        ) {
          throw new NotFoundException(
            'Orden no encontrada.',
          );
        }

        this.assertBranchAccess(
          actor,
          lockedOrder[0].branchId,
        );

        const order =
          await tx.serviceOrder.findFirst({
            where: {
              id:
                orderId,
              branch:
                this.branchWhere(actor),
            },
            include: {
              items: {
                where: {
                  status:
                    'ACTIVE',
                },
              },
            },
          });

        if (!order) {
          throw new NotFoundException(
            'Orden no encontrada.',
          );
        }

        if (
          order.financialStatus ===
          'PAID'
        ) {
          throw new BadRequestException(
            'La orden ya está pagada.',
          );
        }

        if (
          order.financialStatus ===
          'CREDIT'
        ) {
          throw new BadRequestException(
            'La orden está marcada como crédito y no puede cobrarse por este flujo.',
          );
        }

        const register =
          await tx.cashRegister.findFirst({
            where: {
              id:
                dto.cashRegisterId,
              branchId:
                order.branchId,
              active:
                true,
            },
          });

        if (!register) {
          throw new BadRequestException(
            'La caja seleccionada no corresponde a esta sucursal.',
          );
        }

        const session =
          await tx.cashSession.findFirst({
            where: {
              cashRegisterId:
                register.id,
              status:
                'OPEN',
            },
          });

        if (!session) {
          throw new BadRequestException(
            'Debe abrir la caja antes de completar el cobro.',
          );
        }

        const method =
          await tx.paymentMethod.findFirst({
            where: {
              id:
                dto.paymentMethodId,
              active:
                true,
            },
          });

        if (!method) {
          throw new BadRequestException(
            'Método de pago no disponible.',
          );
        }

        const amount =
          order.items.reduce(
            (sum, item) =>
              sum +
              Number(
                item.lineTotal,
              ),
            0,
          );

        if (amount <= 0) {
          throw new BadRequestException(
            'La orden no tiene un monto válido para cobrar.',
          );
        }

        if (
          method.type ===
          'CREDIT'
        ) {
          throw new BadRequestException(
            'El método de crédito no puede utilizarse como pago ordinario de una orden.',
          );
        }

        await tx.payment.create({
          data: {
            paymentMethodId:
              method.id,
            cashSessionId:
              session.id,
            amount,
            reference:
              dto.reference?.trim() ||
              null,
            sourceType:
              'SERVICE_ORDER',
            sourceId:
              order.id,
            description:
              `Cobro de orden ${order.orderNumber}.`,
          },
        });

        /*
         * Payment registra el cobro financiero.
         *
         * CashMovement representa movimiento de efectivo físico.
         * Solamente CASH debe aumentar el efectivo esperado de caja.
         * CARD / TRANSFER / OTHER quedan registrados en Payment y
         * permanecen asociados a la sesión para reporting por turno.
         */
        if (
          method.type ===
          'CASH'
        ) {
          await tx.cashMovement.create({
            data: {
              cashSessionId:
                session.id,
              type:
                'COLLECTION',
              amount,
              description:
                `Cobro en efectivo de orden ${order.orderNumber}.`,
              externalReference:
                dto.reference?.trim() ||
                null,
              referenceType:
                'SERVICE_ORDER',
              referenceId:
                order.id,
            },
          });
        }

        const updatedOrder =
          await tx.serviceOrder.update({
            where: {
              id:
                order.id,
            },
            data: {
              financialStatus:
                'PAID',
              paidAt:
                new Date(),
            },
          });

        await tx.auditLog.create({
          data: {
            companyId:
              actor.companyId,
            userId:
              actor.userId,
            action:
              'PAY_SERVICE_ORDER',
            entityType:
              'SERVICE_ORDER',
            entityId:
              order.id,
            oldValues: {
              financialStatus:
                order.financialStatus,
            },
            newValues: {
              financialStatus:
                updatedOrder.financialStatus,
              amount,
              paymentMethodId:
                method.id,
              paymentMethodType:
                method.type,
              cashSessionId:
                session.id,
            },
            ipAddress:
              actor.ipAddress,
          },
        });

        return {
          orderId:
            order.id,
          orderNumber:
            order.orderNumber,
          amount,
          financialStatus:
            'PAID' as const,
          message:
            'Orden cobrada correctamente.',
        };
      },
    );
  }

  async authorizeCredit(
    orderId: string,
    dto: AuthorizeOrderCreditDto,
    actor: OrderAuditActor,
  ): Promise<AuthorizeOrderCreditResponse> {
    return this.prisma.$transaction(async (tx) => {
      /*
       * Orden de locks obligatorio:
       *   1. ServiceOrder
       *   2. Customer
       *
       * pay(), addService(), updateStatus() y este flujo comparten
       * el lock de la orden. El lock del cliente serializa el consumo
       * del límite de crédito entre órdenes diferentes del mismo cliente.
       */
      const lockedOrder =
        await tx.$queryRaw<
          Array<{
            id: string;
            branchId: string;
          }>
        >`
          SELECT
            so.id,
            so.branch_id AS branchId
          FROM service_orders so
          INNER JOIN branches b
            ON b.id = so.branch_id
          WHERE so.id = ${orderId}
            AND b.company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedOrder.length === 0) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      this.assertBranchAccess(
        actor,
        lockedOrder[0].branchId,
      );

      const order =
        await tx.serviceOrder.findFirst({
          where: {
            id:
              orderId,
            branch:
              this.branchWhere(actor),
          },
          include: {
            items: {
              where: {
                status:
                  'ACTIVE',
              },
            },
            invoice: {
              select: {
                id: true,
              },
            },
            creditAuthorization: {
              select: {
                id: true,
              },
            },
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      if (
        order.financialStatus !==
        'PENDING'
      ) {
        throw new BadRequestException(
          'Solo una orden financieramente pendiente puede autorizarse a crédito.',
        );
      }

      if (
        order.invoice ||
        order.creditAuthorization
      ) {
        throw new BadRequestException(
          'La orden ya posee documentación financiera asociada.',
        );
      }

      if (!order.customerId) {
        throw new BadRequestException(
          'La venta a crédito requiere un cliente registrado.',
        );
      }

      const lockedCustomer =
        await tx.$queryRaw<
          Array<{ id: string }>
        >`
          SELECT id
          FROM customers
          WHERE id = ${order.customerId}
            AND company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (
        lockedCustomer.length === 0
      ) {
        throw new NotFoundException(
          'Cliente no encontrado.',
        );
      }

      const customer =
        await tx.customer.findFirst({
          where: {
            id:
              order.customerId,
            companyId:
              actor.companyId,
            active:
              true,
          },
        });

      if (!customer) {
        throw new BadRequestException(
          'El cliente no está disponible para esta empresa.',
        );
      }

      if (!customer.creditEnabled) {
        throw new BadRequestException(
          'El cliente no tiene crédito habilitado.',
        );
      }

      const creditLimit =
        Number(
          customer.creditLimit,
        );

      if (creditLimit <= 0) {
        throw new BadRequestException(
          'El cliente no tiene un límite de crédito disponible.',
        );
      }

      if (
        customer.creditDays < 0
      ) {
        throw new BadRequestException(
          'La configuración de días de crédito no es válida.',
        );
      }

      const subtotal =
        order.items.reduce(
          (sum, item) =>
            sum +
            Number(
              item.lineTotal,
            ),
          0,
        );

      const taxAmount =
        order.items.reduce(
          (sum, item) =>
            sum +
            Number(
              item.taxAmount,
            ),
          0,
        );

      const amount =
        subtotal +
        taxAmount;

      if (amount <= 0) {
        throw new BadRequestException(
          'La orden no tiene un monto válido para autorizar a crédito.',
        );
      }

      /*
       * Exposición vigente = balances positivos de facturas todavía
       * abiertas o documentadas como crédito.
       *
       * El cliente permanece bloqueado durante este cálculo y durante
       * la creación de la nueva factura, por lo que dos autorizaciones
       * concurrentes del mismo cliente no pueden consumir el mismo cupo.
       */
      const exposureResult =
        await tx.invoice.aggregate({
          where: {
            customerId:
              customer.id,
            status: {
              in: [
                'ISSUED',
                'PARTIALLY_PAID',
                'CREDIT',
              ],
            },
            balance: {
              gt: 0,
            },
          },
          _sum: {
            balance: true,
          },
        });

      const currentExposure =
        Number(
          exposureResult._sum.balance ??
            0,
        );

      const newExposure =
        currentExposure +
        amount;

      if (
        newExposure >
        creditLimit
      ) {
        const available =
          Math.max(
            0,
            creditLimit -
              currentExposure,
          );

        throw new BadRequestException(
          `El crédito disponible del cliente es insuficiente. Disponible: ${available.toFixed(2)}.`,
        );
      }

      const authorizedAt =
        new Date();

      const dueDate =
        new Date(
          authorizedAt.getTime(),
        );

      dueDate.setUTCDate(
        dueDate.getUTCDate() +
          customer.creditDays,
      );

      const authorization =
        await tx.creditAuthorization.create({
          data: {
            orderId:
              order.id,
            customerId:
              customer.id,
            authorizedById:
              actor.userId,
            amount,
            creditDays:
              customer.creditDays,
            dueDate,
            status:
              'APPROVED',
            notes:
              dto.notes?.trim() ||
              null,
          },
        });

      const invoice =
        await tx.invoice.create({
          data: {
            orderId:
              order.id,
            customerId:
              customer.id,
            /*
             * orderNumber ya es único globalmente y cabe en
             * Invoice.invoiceNumber (VarChar 30).
             */
            invoiceNumber:
              order.orderNumber,
            status:
              'CREDIT',
            subtotal,
            taxAmount,
            total:
              amount,
            balance:
              amount,
            issuedAt:
              authorizedAt,
            dueDate,
            items: {
              create:
                order.items.map(
                  (item) => ({
                    orderItemId:
                      item.id,
                    description:
                      item.descriptionSnapshot,
                    quantity:
                      item.quantity,
                    unitPrice:
                      item.unitPrice,
                    taxAmount:
                      item.taxAmount,
                    lineTotal:
                      item.lineTotal,
                  }),
                ),
            },
          },
        });

      const updatedOrder =
        await tx.serviceOrder.update({
          where: {
            id:
              order.id,
          },
          data: {
            financialStatus:
              'CREDIT',
          },
        });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'AUTHORIZE_ORDER_CREDIT',
          entityType:
            'SERVICE_ORDER',
          entityId:
            order.id,
          reason:
            dto.notes?.trim() ||
            null,
          oldValues: {
            financialStatus:
              order.financialStatus,
            currentExposure,
          },
          newValues: {
            financialStatus:
              updatedOrder.financialStatus,
            customerId:
              customer.id,
            authorizationId:
              authorization.id,
            invoiceId:
              invoice.id,
            invoiceNumber:
              invoice.invoiceNumber,
            amount,
            creditLimit,
            previousExposure:
              currentExposure,
            newExposure,
            creditDays:
              customer.creditDays,
            dueDate:
              dueDate.toISOString(),
            authorizedBy:
              actor.username,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return {
        orderId:
          order.id,
        orderNumber:
          order.orderNumber,
        customerId:
          customer.id,
        authorizationId:
          authorization.id,
        invoiceId:
          invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        amount,
        previousExposure:
          currentExposure,
        newExposure,
        creditLimit,
        creditDays:
          customer.creditDays,
        dueDate:
          dueDate.toISOString(),
        financialStatus:
          'CREDIT',
        message:
          'Crédito autorizado correctamente.',
      };
    });
  }

  async addService(
    orderId: string,
    dto: AddOrderServiceDto,
    actor: OrderAuditActor,
  ): Promise<AddOrderServiceResponse> {
    return this.prisma.$transaction(async (tx) => {
      const lockedOrder =
        await tx.$queryRaw<
          Array<{
            id: string;
            branchId: string;
          }>
        >`
          SELECT
            so.id,
            so.branch_id AS branchId
          FROM service_orders so
          INNER JOIN branches b
            ON b.id = so.branch_id
          WHERE so.id = ${orderId}
            AND b.company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedOrder.length === 0) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      this.assertBranchAccess(
        actor,
        lockedOrder[0].branchId,
      );

      const order =
        await tx.serviceOrder.findFirst({
          where: {
            id: orderId,
            branch:
              this.branchWhere(actor),
          },
          include: {
            vehicle: true,
            branch: true,
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      if (
        [
          'DELIVERED',
          'CANCELLED',
        ].includes(
          order.operationalStatus,
        )
      ) {
        throw new BadRequestException(
          'No se pueden agregar servicios a una orden cerrada.',
        );
      }

      if (
        [
          'PAID',
          'CREDIT',
        ].includes(
          order.financialStatus,
        )
      ) {
        throw new BadRequestException(
          'No se pueden agregar servicios a una orden financieramente cerrada.',
        );
      }

      const price =
        await tx.servicePrice.findFirst({
          where: {
            serviceId:
              dto.serviceId,
            vehicleTypeId:
              order.vehicle.vehicleTypeId,
            branchId:
              order.branchId,
            active:
              true,
            service: {
              companyId:
                actor.companyId,
              active:
                true,
            },
          },
          include: {
            service: {
              include: {
                category: {
                  include: {
                    operationalArea:
                      true,
                  },
                },
              },
            },
          },
        });

      if (!price) {
        throw new BadRequestException(
          'El servicio seleccionado no tiene una tarifa activa para este vehículo.',
        );
      }

      const employee =
        await tx.employee.findFirst({
          where: {
            id:
              dto.employeeId,
            companyId:
              actor.companyId,
            branchId:
              order.branchId,
            active:
              true,
          },
        });

      if (!employee) {
        throw new BadRequestException(
          'El empleado seleccionado no está disponible para esta sucursal.',
        );
      }

      const item =
        await tx.serviceOrderItem.create({
          data: {
            serviceOrderId:
              order.id,
            itemType:
              'SERVICE',
            serviceId:
              dto.serviceId,
            employeeId:
              dto.employeeId,
            descriptionSnapshot:
              price.service.name,
            quantity:
              dto.quantity,
            unitPrice:
              price.price,
            taxRate:
              0,
            taxAmount:
              0,
            lineTotal:
              Number(
                price.price,
              ) *
              dto.quantity,
            status:
              'ACTIVE',
          },
        });

      await tx.orderEvent.create({
        data: {
          orderId,
          type:
            'SERVICE_ADDED',
          title:
            'Servicio adicional agregado',
          description:
            `${price.service.name} × ${dto.quantity}, asignado a ${employee.fullName}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'ADD_ORDER_SERVICE',
          entityType:
            'SERVICE_ORDER',
          entityId:
            order.id,
          newValues: {
            orderItemId:
              item.id,
            serviceId:
              dto.serviceId,
            employeeId:
              dto.employeeId,
            quantity:
              dto.quantity,
            lineTotal:
              Number(
                item.lineTotal,
              ),
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return {
        orderId,
        itemId:
          item.id,
        serviceName:
          price.service.name,
        operationalAreaCode:
          price.service.category.operationalArea?.code ??
          'SIN_AREA',
        quantity:
          dto.quantity,
        lineTotal:
          Number(
            item.lineTotal,
          ),
        message:
          'Servicio agregado correctamente.',
      };
    });
  }

  async create(
    dto: CreateOrderDto,
    actor: OrderAuditActor,
  ): Promise<CreatedOrderResponse> {
    return this.prisma.$transaction(async (tx) => {
      const pointOfSale =
        await tx.pointOfSale.findFirst({
          where: {
            id:
              dto.pointOfSaleId,
            companyId:
              actor.companyId,
            active:
              true,
            branch: {
              ...this.branchWhere(actor),
              active:
                true,
            },
          },
          include: {
            branch:
              true,
          },
        });

      if (!pointOfSale) {
        throw new BadRequestException(
          'El punto operativo seleccionado no está disponible para esta empresa o sucursal.',
        );
      }

      const [
        companyModule,
        branchModule,
      ] =
        await Promise.all([
          tx.companyModule.findFirst({
            where: {
              companyId:
                actor.companyId,
              module:
                'CAR_WASH',
              enabled:
                true,
            },
          }),
          tx.branchModule.findFirst({
            where: {
              companyId:
                actor.companyId,
              branchId:
                pointOfSale.branchId,
              module:
                'CAR_WASH',
              enabled:
                true,
            },
          }),
        ]);

      if (
        !companyModule ||
        !branchModule
      ) {
        throw new BadRequestException(
          'CarWash no está habilitado para la empresa o sucursal seleccionada.',
        );
      }

      const branch =
        pointOfSale.branch;

      const branchDocumentCode =
        branch.code
          .trim()
          .toUpperCase();

      if (
        !branchDocumentCode ||
        branchDocumentCode.length >
          17 ||
        !/^[A-Z0-9]+$/.test(
          branchDocumentCode,
        )
      ) {
        throw new BadRequestException(
          'El código de la sucursal debe usar solo letras y números y tener un máximo de 17 caracteres para generar órdenes.',
        );
      }

      const vehicleType =
        await tx.vehicleType.findFirst({
          where: {
            id:
              dto.vehicleTypeId,
            active:
              true,
          },
          select: {
            id:
              true,
          },
        });

      if (!vehicleType) {
        throw new BadRequestException(
          'El tipo de vehículo seleccionado no está disponible.',
        );
      }

      if (dto.customerId) {
        const customer =
          await tx.customer.findFirst({
            where: {
              id:
                dto.customerId,
              companyId:
                actor.companyId,
              active:
                true,
            },
            select: {
              id:
                true,
            },
          });

        if (!customer) {
          throw new BadRequestException(
            'El cliente seleccionado no pertenece a la empresa o no está activo.',
          );
        }
      }

      const employeeIds = [
        ...new Set(
          dto.items.map(
            (item) =>
              item.employeeId,
          ),
        ),
      ];

      const employees =
        await tx.employee.findMany({
          where: {
            id: {
              in:
                employeeIds,
            },
            companyId:
              actor.companyId,
            branchId:
              branch.id,
            active:
              true,
          },
          select: {
            id:
              true,
          },
        });

      if (
        employees.length !==
        employeeIds.length
      ) {
        throw new BadRequestException(
          'Uno o más empleados no pertenecen a la sucursal seleccionada o están inactivos.',
        );
      }

      const serviceIds = [
        ...new Set(
          dto.items.map(
            (item) =>
              item.serviceId,
          ),
        ),
      ];

      const requestedServices =
        await tx.servicePrice.findMany({
          where: {
            branchId:
              branch.id,
            vehicleTypeId:
              dto.vehicleTypeId,
            serviceId: {
              in:
                serviceIds,
            },
            active:
              true,
            service: {
              companyId:
                actor.companyId,
              active:
                true,
            },
          },
          include: {
            service:
              true,
          },
        });

      if (
        requestedServices.length !==
        serviceIds.length
      ) {
        throw new BadRequestException(
          'Uno o más servicios no tienen una tarifa activa para la sucursal y el vehículo seleccionados.',
        );
      }

      const priceByService =
        new Map(
          requestedServices.map(
            (row) => [
              row.serviceId,
              row,
            ],
          ),
        );

      const sequence =
        await tx.numberSequence.upsert({
          where: {
            branchId_documentType: {
              branchId:
                branch.id,
              documentType:
                'SERVICE_ORDER',
            },
          },
          update: {
            currentValue: {
              increment:
                1,
            },
          },
          create: {
            companyId:
              actor.companyId,
            branchId:
              branch.id,
            documentType:
              'SERVICE_ORDER',
            prefix:
              'ORD',
            currentValue:
              1,
            padding:
              8,
          },
        });

      const orderNumber =
        `${sequence.prefix}-${branchDocumentCode}-${String(
          sequence.currentValue,
        ).padStart(
          sequence.padding,
          '0',
        )}`;

      const vehicle =
        await tx.vehicle.create({
          data: {
            customerId:
              dto.customerId,
            vehicleTypeId:
              dto.vehicleTypeId,
            plate:
              dto.plate?.trim() ||
              null,
            description:
              dto.vehicleDescription.trim(),
          },
        });

      const order =
        await tx.serviceOrder.create({
          data: {
            branchId:
              branch.id,
            customerId:
              dto.customerId,
            customerAlias:
              dto.customerAlias.trim(),
            vehicleId:
              vehicle.id,
            orderNumber,
            qrToken:
              randomUUID(),
            operationalStatus:
              'IN_PROGRESS',
            financialStatus:
              'PENDING',

            items: {
              create:
                dto.items.map(
                  (item) => {
                    const price =
                      priceByService.get(
                        item.serviceId,
                      );

                    if (!price) {
                      throw new BadRequestException(
                        `No existe tarifa activa para el servicio ${item.serviceId}.`,
                      );
                    }

                    return {
                      itemType:
                        'SERVICE' as const,
                      serviceId:
                        item.serviceId,
                      pointOfSaleId:
                        pointOfSale.id,
                      employeeId:
                        item.employeeId,
                      descriptionSnapshot:
                        price.service.name,
                      quantity:
                        item.quantity,
                      unitPrice:
                        price.price,
                      taxRate:
                        0,
                      taxAmount:
                        0,
                      lineTotal:
                        Number(
                          price.price,
                        ) *
                        item.quantity,
                      status:
                        'ACTIVE' as const,
                    };
                  },
                ),
            },

            events: {
              create: [
                {
                  type:
                    'ORDER_CREATED',
                  title:
                    'Orden creada',
                  description:
                    'La orden fue creada e inició automáticamente.',
                },
                {
                  type:
                    'STATUS_CHANGED',
                  title:
                    'Trabajo iniciado',
                  description:
                    'Estado operativo cambiado a IN_PROGRESS.',
                },
              ],
            },

            checklistItems: {
              create:
                initialChecklist.map(
                  ([
                    code,
                    label,
                  ]) => ({
                    code,
                    label,
                    checked:
                      false,
                  }),
                ),
            },
          },

          include: {
            vehicle: {
              include: {
                vehicleType:
                  true,
              },
            },
            items:
              true,
          },
        });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'CREATE_SERVICE_ORDER',
          entityType:
            'SERVICE_ORDER',
          entityId:
            order.id,
          newValues: {
            orderNumber:
              order.orderNumber,
            branchId:
              branch.id,
            pointOfSaleId:
              pointOfSale.id,
            customerId:
              dto.customerId ??
              null,
            vehicleTypeId:
              dto.vehicleTypeId,
            operationalStatus:
              order.operationalStatus,
            financialStatus:
              order.financialStatus,
            items:
              dto.items.map(
                (item) => ({
                  serviceId:
                    item.serviceId,
                  employeeId:
                    item.employeeId,
                  quantity:
                    item.quantity,
                }),
              ),
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return {
        id:
          order.id,
        orderNumber:
          order.orderNumber,
        customerAlias:
          order.customerAlias,
        vehicle:
          order.vehicle.description,
        vehicleType:
          order.vehicle.vehicleType.name,
        operationalStatus:
          order.operationalStatus,
        financialStatus:
          order.financialStatus,
        total:
          order.items.reduce(
            (sum, item) =>
              sum +
              Number(
                item.lineTotal,
              ),
            0,
          ),
        qrToken:
          order.qrToken,
        createdAt:
          order.createdAt.toISOString(),
      };
    });
  }

  async updateStatus(
    orderId: string,
    nextStatus: OrderOperationalStatus,
    actor: OrderAuditActor,
  ): Promise<UpdateOrderStatusResponse> {
    return this.prisma.$transaction(async (tx) => {
      const lockedOrder =
        await tx.$queryRaw<
          Array<{
            id: string;
            branchId: string;
          }>
        >`
          SELECT
            so.id,
            so.branch_id AS branchId
          FROM service_orders so
          INNER JOIN branches b
            ON b.id = so.branch_id
          WHERE so.id = ${orderId}
            AND b.company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedOrder.length === 0) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      this.assertBranchAccess(
        actor,
        lockedOrder[0].branchId,
      );

      const order =
        await tx.serviceOrder.findFirst({
          where: {
            id:
              orderId,
            branch:
              this.branchWhere(actor),
          },
          select: {
            id:
              true,
            orderNumber:
              true,
            operationalStatus:
              true,
            financialStatus:
              true,
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Order not found.',
        );
      }

      const allowed =
        transitions[
          order.operationalStatus
        ];

      if (
        !allowed.includes(
          nextStatus,
        )
      ) {
        throw new BadRequestException(
          `Transition from ${order.operationalStatus} to ${nextStatus} is not allowed.`,
        );
      }

      if (
        nextStatus ===
          'DELIVERED' &&
        ![
          'PAID',
          'CREDIT',
        ].includes(
          order.financialStatus,
        )
      ) {
        throw new BadRequestException(
          'The vehicle cannot be delivered while the invoice has a pending balance.',
        );
      }

      const data: {
        operationalStatus:
          OrderOperationalStatus;
        servicesCompletedAt?:
          Date;
        deliveredAt?:
          Date;
        events: {
          create: {
            type:
              'STATUS_CHANGED';
            title:
              string;
            description:
              string;
          };
        };
      } = {
        operationalStatus:
          nextStatus,
        events: {
          create: {
            type:
              'STATUS_CHANGED',
            title:
              'Estado actualizado',
            description:
              `Estado cambiado de ${order.operationalStatus} a ${nextStatus}.`,
          },
        },
      };

      if (
        nextStatus ===
        'SERVICES_COMPLETED'
      ) {
        data.servicesCompletedAt =
          new Date();
      }

      if (
        nextStatus ===
        'DELIVERED'
      ) {
        data.deliveredAt =
          new Date();
      }

      const updated =
        await tx.serviceOrder.update({
          where: {
            id:
              orderId,
          },
          data,
          select: {
            id:
              true,
            orderNumber:
              true,
            operationalStatus:
              true,
            updatedAt:
              true,
          },
        });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'UPDATE_ORDER_STATUS',
          entityType:
            'SERVICE_ORDER',
          entityId:
            order.id,
          oldValues: {
            operationalStatus:
              order.operationalStatus,
          },
          newValues: {
            operationalStatus:
              updated.operationalStatus,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return {
        id:
          updated.id,
        orderNumber:
          updated.orderNumber,
        operationalStatus:
          updated.operationalStatus,
        updatedAt:
          updated.updatedAt.toISOString(),
      };
    });
  }

  async updateChecklist(
    orderId: string,
    dto: UpdateChecklistItemDto,
    actor: OrderAuditActor,
  ): Promise<OrderChecklistItemResponse> {
    return this.prisma.$transaction(async (tx) => {
      const order =
        await tx.serviceOrder.findFirst({
          where: {
            id:
              orderId,
            branch:
              this.branchWhere(actor),
          },
          select: {
            id:
              true,
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      const existing =
        await tx.orderChecklistItem.findUnique({
          where: {
            orderId_code: {
              orderId,
              code:
                dto.code,
            },
          },
        });

      const item =
        await tx.orderChecklistItem.upsert({
          where: {
            orderId_code: {
              orderId,
              code:
                dto.code,
            },
          },
          update: {
            label:
              dto.label,
            checked:
              dto.checked,
            notes:
              dto.notes?.trim() ||
              null,
          },
          create: {
            orderId,
            code:
              dto.code,
            label:
              dto.label,
            checked:
              dto.checked,
            notes:
              dto.notes?.trim() ||
              null,
          },
        });

      await tx.orderEvent.create({
        data: {
          orderId,
          type:
            'CHECKLIST_UPDATED',
          title:
            'Checklist actualizado',
          description:
            `${dto.label}: ${dto.checked ? 'completado' : 'pendiente'}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'UPDATE_ORDER_CHECKLIST',
          entityType:
            'SERVICE_ORDER',
          entityId:
            order.id,
          ...(existing
            ? {
                oldValues: {
                  code:
                    existing.code,
                  label:
                    existing.label,
                  checked:
                    existing.checked,
                  notes:
                    existing.notes,
                },
              }
            : {}),
          newValues: {
            code:
              item.code,
            label:
              item.label,
            checked:
              item.checked,
            notes:
              item.notes,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return {
        id:
          item.id,
        code:
          item.code,
        label:
          item.label,
        checked:
          item.checked,
        notes:
          item.notes,
        updatedAt:
          item.updatedAt.toISOString(),
      };
    });
  }

  async addNote(
    orderId: string,
    dto: CreateOrderNoteDto,
    actor: OrderAuditActor,
  ): Promise<OrderNoteResponse> {
    return this.prisma.$transaction(async (tx) => {
      const order =
        await tx.serviceOrder.findFirst({
          where: {
            id:
              orderId,
            branch:
              this.branchWhere(actor),
          },
          select: {
            id:
              true,
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Orden no encontrada.',
        );
      }

      const content =
        dto.content.trim();

      if (!content) {
        throw new BadRequestException(
          'La observación no puede estar vacía.',
        );
      }

      const note =
        await tx.orderNote.create({
          data: {
            orderId,
            visibility:
              dto.visibility,
            content,
          },
        });

      await tx.orderEvent.create({
        data: {
          orderId,
          type:
            'NOTE_ADDED',
          title:
            dto.visibility ===
            'INTERNAL'
              ? 'Observación interna agregada'
              : 'Observación para el cliente agregada',
          description:
            content,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'ADD_ORDER_NOTE',
          entityType:
            'SERVICE_ORDER',
          entityId:
            order.id,
          newValues: {
            noteId:
              note.id,
            visibility:
              note.visibility,
            content:
              note.content,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return {
        id:
          note.id,
        visibility:
          note.visibility,
        content:
          note.content,
        createdAt:
          note.createdAt.toISOString(),
      };
    });
  }
}