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
} from '@cactus/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { AddOrderServiceDto } from './dto/add-order-service.dto';
import { CreateOrderNoteDto } from './dto/create-order-note.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

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

  async list(): Promise<OrderListItemResponse[]> {
    const orders = await this.prisma.serviceOrder.findMany({
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

  async detail(orderId: string): Promise<OrderDetailResponse> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: {
        id: orderId,
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

      return this.detail(orderId);
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


  async tickets(orderId: string): Promise<OperationalTicketResponse[]> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        vehicle: { include: { vehicleType: true } },
        items: {
          where: { status: { not: 'VOIDED' }, itemType: 'SERVICE' },
          include: {
            employee: true,
            service: {
              include: {
                category: {
                  include: { operationalArea: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada.');
    }

    const grouped = new Map<string, OperationalTicketResponse>();

    for (const item of order.items) {
      const area = item.service?.category.operationalArea;

      if (!area) {
        continue;
      }

      const ticketCode = `${order.orderNumber}-${area.ticketPrefix}`;

      const current = grouped.get(area.id) ?? {
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
        vehicleDescription: order.vehicle.description,
        vehicleType: order.vehicle.vehicleType.name,
        plate: order.vehicle.plate,
        createdAt: order.createdAt.toISOString(),
        lines: [],
        total: 0,
      };

      current.lines.push({
        id: item.id,
        serviceName: item.descriptionSnapshot,
        employeeName: item.employee?.fullName ?? null,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      });

      current.total += Number(item.lineTotal);
      grouped.set(area.id, current);
    }

    return [...grouped.values()];
  }

  async registerTicketPrint(
    orderId: string,
    areaCode: string,
    reprint: boolean,
    printedBy?: string,
  ): Promise<TicketPrintLogResponse> {
    const area = await this.prisma.operationalArea.findFirst({
      where: { code: areaCode, active: true },
    });

    if (!area) {
      throw new NotFoundException('Área operativa no encontrada.');
    }

    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada.');
    }

    const previousCopies = await this.prisma.ticketPrintLog.count({
      where: { orderId, operationalAreaId: area.id },
    });

    const log = await this.prisma.ticketPrintLog.create({
      data: {
        orderId,
        operationalAreaId: area.id,
        ticketCode: `${order.orderNumber}-${area.ticketPrefix}`,
        printType: reprint || previousCopies > 0 ? 'REPRINT' : 'ORIGINAL',
        copyNumber: previousCopies + 1,
        printedBy: printedBy?.trim() || null,
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        type: 'STATUS_CHANGED',
        title: reprint ? 'Ticket reimpreso' : 'Ticket impreso',
        description: `${area.name}: copia ${log.copyNumber}.`,
      },
    });

    return {
      id: log.id,
      ticketCode: log.ticketCode,
      printType: log.printType,
      copyNumber: log.copyNumber,
      printedAt: log.printedAt.toISOString(),
    };
  }


  async pay(orderId: string, dto: PayOrderDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: { items: { where: { status: 'ACTIVE' } } },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada.');
    }

    if (order.financialStatus === 'PAID') {
      throw new BadRequestException('La orden ya está pagada.');
    }

    const register = await this.prisma.cashRegister.findFirst({
      where: {
        id: dto.cashRegisterId,
        branchId: order.branchId,
        active: true,
      },
    });

    if (!register) {
      throw new BadRequestException(
        'La caja seleccionada no corresponde a esta sucursal.',
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

    const method = await this.prisma.paymentMethod.findFirst({
      where: { id: dto.paymentMethodId, active: true },
    });

    if (!method) {
      throw new BadRequestException('Método de pago no disponible.');
    }

    const amount = order.items.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          paymentMethodId: method.id,
          cashSessionId: session.id,
          amount,
          reference: dto.reference?.trim() || null,
          sourceType: 'SERVICE_ORDER',
          sourceId: order.id,
          description: `Cobro de orden ${order.orderNumber}.`,
        },
      });

     await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          type: 'COLLECTION',
          amount,
          description: `Cobro de orden ${order.orderNumber} por ${method.name}.`,
          externalReference: dto.reference?.trim() || null,
          referenceType: 'SERVICE_ORDER',
          referenceId: order.id,
        },
      });

      await tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          financialStatus: 'PAID',
          paidAt: new Date(),
        },
      });
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      financialStatus: 'PAID' as const,
      message: 'Orden cobrada correctamente.',
    };
  }

  async addService(
    orderId: string,
    dto: AddOrderServiceDto,
  ): Promise<AddOrderServiceResponse> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        vehicle: true,
        branch: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada.');
    }

    if (['DELIVERED', 'CANCELLED'].includes(order.operationalStatus)) {
      throw new BadRequestException(
        'No se pueden agregar servicios a una orden cerrada.',
      );
    }

    const price = await this.prisma.servicePrice.findFirst({
      where: {
        serviceId: dto.serviceId,
        vehicleTypeId: order.vehicle.vehicleTypeId,
        branchId: order.branchId,
        active: true,
        service: { active: true },
      },
      include: {
        service: {
          include: {
            category: {
              include: { operationalArea: true },
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

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, active: true },
    });

    if (!employee) {
      throw new BadRequestException('El empleado seleccionado no está disponible.');
    }

    const item = await this.prisma.serviceOrderItem.create({
      data: {
        serviceOrderId: order.id,
        itemType: 'SERVICE',
        serviceId: dto.serviceId,
        employeeId: dto.employeeId,
        descriptionSnapshot: price.service.name,
        quantity: dto.quantity,
        unitPrice: price.price,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: Number(price.price) * dto.quantity,
        status: 'ACTIVE',
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        type: 'SERVICE_ADDED',
        title: 'Servicio adicional agregado',
        description: `${price.service.name} × ${dto.quantity}, asignado a ${employee.fullName}.`,
      },
    });

    return {
      orderId,
      itemId: item.id,
      serviceName: price.service.name,
      operationalAreaCode:
        price.service.category.operationalArea?.code ?? 'SIN_AREA',
      quantity: dto.quantity,
      lineTotal: Number(item.lineTotal),
      message: 'Servicio agregado correctamente.',
    };
  }

  async create(dto: CreateOrderDto): Promise<CreatedOrderResponse> {
    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: {
          companyId: COMPANY_ID,
          active: true,
        },
      });

      if (!branch) {
        throw new BadRequestException('No active branch configured.');
      }

      const sequence = await tx.numberSequence.upsert({
        where: {
          branchId_documentType: {
            branchId: branch.id,
            documentType: 'SERVICE_ORDER',
          },
        },
        update: {
          currentValue: {
            increment: 1,
          },
        },
        create: {
          companyId: COMPANY_ID,
          branchId: branch.id,
          documentType: 'SERVICE_ORDER',
          prefix: 'ORD',
          currentValue: 1,
          padding: 8,
        },
      });

      const orderNumber = `${sequence.prefix}-${String(
        sequence.currentValue,
      ).padStart(sequence.padding, '0')}`;

      const vehicle = await tx.vehicle.create({
        data: {
          customerId: dto.customerId,
          vehicleTypeId: dto.vehicleTypeId,
          plate: dto.plate?.trim() || null,
          description: dto.vehicleDescription.trim(),
        },
      });

      const serviceIds = [...new Set(dto.items.map((item) => item.serviceId))];

      const requestedServices = await tx.servicePrice.findMany({
        where: {
          branchId: branch.id,
          vehicleTypeId: dto.vehicleTypeId,
          serviceId: {
            in: serviceIds,
          },
          active: true,
          service: {
            active: true,
          },
        },
        include: {
          service: true,
        },
      });

      if (requestedServices.length !== serviceIds.length) {
        throw new BadRequestException(
          'One or more selected services do not have an active price.',
        );
      }

      const priceByService = new Map(
        requestedServices.map((row) => [row.serviceId, row]),
      );

      const order = await tx.serviceOrder.create({
        data: {
          branchId: branch.id,
          customerId: dto.customerId,
          customerAlias: dto.customerAlias.trim(),
          vehicleId: vehicle.id,
          orderNumber,
          qrToken: randomUUID(),
          operationalStatus: 'IN_PROGRESS',
          financialStatus: 'PENDING',
          items: {
            create: dto.items.map((item) => {
              const price = priceByService.get(item.serviceId);

              if (!price) {
                throw new BadRequestException(
                  `No active price for service ${item.serviceId}.`,
                );
              }

              return {
                itemType: 'SERVICE',
                serviceId: item.serviceId,
                employeeId: item.employeeId,
                descriptionSnapshot: price.service.name,
                quantity: item.quantity,
                unitPrice: price.price,
                taxRate: 0,
                taxAmount: 0,
                lineTotal: Number(price.price) * item.quantity,
                status: 'ACTIVE',
              };
            }),
          },
          events: {
            create: [
              {
                type: 'ORDER_CREATED',
                title: 'Orden creada',
                description: 'La orden fue creada e inició automáticamente.',
              },
              {
                type: 'STATUS_CHANGED',
                title: 'Trabajo iniciado',
                description: 'Estado operativo cambiado a IN_PROGRESS.',
              },
            ],
          },
          checklistItems: {
            create: initialChecklist.map(([code, label]) => ({
              code,
              label,
              checked: false,
            })),
          },
        },
        include: {
          vehicle: {
            include: {
              vehicleType: true,
            },
          },
          items: true,
        },
      });

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerAlias: order.customerAlias,
        vehicle: order.vehicle.description,
        vehicleType: order.vehicle.vehicleType.name,
        operationalStatus: order.operationalStatus,
        financialStatus: order.financialStatus,
        total: order.items.reduce(
          (sum, item) => sum + Number(item.lineTotal),
          0,
        ),
        qrToken: order.qrToken,
        createdAt: order.createdAt.toISOString(),
      };
    });
  }

  async updateStatus(
    orderId: string,
    nextStatus: OrderOperationalStatus,
  ): Promise<UpdateOrderStatusResponse> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        operationalStatus: true,
        financialStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const allowed = transitions[order.operationalStatus];

    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Transition from ${order.operationalStatus} to ${nextStatus} is not allowed.`,
      );
    }

    if (
      nextStatus === 'DELIVERED' &&
      !['PAID', 'CREDIT'].includes(order.financialStatus)
    ) {
      throw new BadRequestException(
        'The vehicle cannot be delivered while the invoice has a pending balance.',
      );
    }

    const data: {
      operationalStatus: OrderOperationalStatus;
      servicesCompletedAt?: Date;
      deliveredAt?: Date;
      events: {
        create: {
          type: 'STATUS_CHANGED';
          title: string;
          description: string;
        };
      };
    } = {
      operationalStatus: nextStatus,
      events: {
        create: {
          type: 'STATUS_CHANGED',
          title: 'Estado actualizado',
          description: `Estado cambiado de ${order.operationalStatus} a ${nextStatus}.`,
        },
      },
    };

    if (nextStatus === 'SERVICES_COMPLETED') {
      data.servicesCompletedAt = new Date();
    }

    if (nextStatus === 'DELIVERED') {
      data.deliveredAt = new Date();
    }

    const updated = await this.prisma.serviceOrder.update({
      where: {
        id: orderId,
      },
      data,
      select: {
        id: true,
        orderNumber: true,
        operationalStatus: true,
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      orderNumber: updated.orderNumber,
      operationalStatus: updated.operationalStatus,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async updateChecklist(
    orderId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<OrderChecklistItemResponse> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const item = await this.prisma.orderChecklistItem.upsert({
      where: {
        orderId_code: {
          orderId,
          code: dto.code,
        },
      },
      update: {
        label: dto.label,
        checked: dto.checked,
        notes: dto.notes?.trim() || null,
      },
      create: {
        orderId,
        code: dto.code,
        label: dto.label,
        checked: dto.checked,
        notes: dto.notes?.trim() || null,
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        type: 'CHECKLIST_UPDATED',
        title: 'Checklist actualizado',
        description: `${dto.label}: ${dto.checked ? 'completado' : 'pendiente'}.`,
      },
    });

    return {
      id: item.id,
      code: item.code,
      label: item.label,
      checked: item.checked,
      notes: item.notes,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async addNote(
    orderId: string,
    dto: CreateOrderNoteDto,
  ): Promise<OrderNoteResponse> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const note = await this.prisma.orderNote.create({
      data: {
        orderId,
        visibility: dto.visibility,
        content: dto.content.trim(),
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        type: 'NOTE_ADDED',
        title:
          dto.visibility === 'INTERNAL'
            ? 'Observación interna agregada'
            : 'Observación para el cliente agregada',
        description: dto.content.trim(),
      },
    });

    return {
      id: note.id,
      visibility: note.visibility,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
    };
  }
}
