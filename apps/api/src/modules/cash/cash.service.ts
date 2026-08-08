import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  CashCloseReportResponse,
  CashRegisterSummaryResponse,
  CashSessionResponse,
} from '@cactus/shared';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { RegisterCashPrintDto } from './dto/register-cash-print.dto';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async registers(): Promise<CashRegisterSummaryResponse[]> {
    const rows = await this.prisma.cashRegister.findMany({
      where: { active: true },
      include: {
        pointOfSale: true,
        sessions: {
          where: { status: 'OPEN' },
          include: {
            employee: true,
            movements: { orderBy: { createdAt: 'asc' } },
          },
          take: 1,
          orderBy: { openedAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((register) => ({
      id: register.id,
      code: register.code,
      name: register.name,
      pointOfSaleName: register.pointOfSale?.name ?? null,
      active: register.active,
      openSession: register.sessions[0]
        ? this.mapSession(register.sessions[0], register.name)
        : null,
    }));
  }

  async session(sessionId: string): Promise<CashSessionResponse> {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        cashRegister: true,
        employee: true,
        movements: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }

    return this.mapSession(session, session.cashRegister.name);
  }

  async open(dto: OpenCashSessionDto): Promise<CashSessionResponse> {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id: dto.cashRegisterId, active: true },
      include: { branch: true },
    });

    if (!register) {
      throw new NotFoundException('Caja no encontrada.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        branchId: register.branchId,
        active: true,
        canOperateCash: true,
      },
    });

    if (!employee) {
      throw new BadRequestException(
        'El empleado seleccionado no está autorizado para operar caja.',
      );
    }

    const existing = await this.prisma.cashSession.findFirst({
      where: {
        cashRegisterId: register.id,
        status: 'OPEN',
      },
    });

    if (existing) {
      throw new BadRequestException('Esta caja ya tiene una sesión abierta.');
    }

    const username = `cashier-${employee.employeeNo.toLowerCase()}`;
    const user = await this.prisma.user.upsert({
      where: {
        companyId_username: {
          companyId: register.branch.companyId,
          username,
        },
      },
      update: {
        fullName: employee.fullName,
        status: 'ACTIVE',
      },
      create: {
        companyId: register.branch.companyId,
        username,
        fullName: employee.fullName,
        passwordHash: 'LOCAL_CASHIER_PROFILE',
        status: 'ACTIVE',
      },
    });

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cashSession.create({
        data: {
          cashRegisterId: register.id,
          userId: user.id,
          employeeId: employee.id,
          cashierNameSnapshot: employee.fullName,
          openingAmount: dto.openingAmount,
          expectedAmount: dto.openingAmount,
        },
      });

      await tx.cashMovement.create({
        data: {
          cashSessionId: created.id,
          type: 'OPENING',
          amount: dto.openingAmount,
          description: 'Fondo inicial de caja.',
          beneficiary: employee.fullName,
        },
      });

      return tx.cashSession.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          employee: true,
          movements: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    return this.mapSession(session, register.name);
  }

  async addMovement(
    sessionId: string,
    dto: CreateCashMovementDto,
  ): Promise<CashSessionResponse> {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }

    if (session.status !== 'OPEN') {
      throw new BadRequestException('La caja se encuentra cerrada.');
    }

    await this.prisma.cashMovement.create({
      data: {
        cashSessionId: session.id,
        type: dto.type,
        amount: dto.amount,
        description: dto.description.trim(),
        beneficiary: dto.beneficiary.trim(),
        externalReference: dto.externalReference?.trim() || null,
        referenceType:
          dto.type === 'WITHDRAWAL' ? 'CASH_WITHDRAWAL' : 'CASH_EXPENSE',
      },
    });

    return this.session(session.id);
  }

  async close(
    sessionId: string,
    dto: CloseCashSessionDto,
  ): Promise<CashSessionResponse> {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: { movements: true },
    });

    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }

    if (session.status !== 'OPEN') {
      throw new BadRequestException('La caja ya fue cerrada.');
    }

    const expected = this.calculateExpected(
      Number(session.openingAmount),
      session.movements,
    );
    const difference = dto.countedAmount - expected;

    await this.prisma.$transaction(async (tx) => {
      await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          type: 'CLOSING',
          amount: dto.countedAmount,
          description: 'Conteo final y cierre de caja.',
          beneficiary: session.cashierNameSnapshot,
        },
      });

      await tx.cashSession.update({
        where: { id: session.id },
        data: {
          status: 'CLOSED',
          expectedAmount: expected,
          countedAmount: dto.countedAmount,
          difference,
          closedAt: new Date(),
        },
      });
    });

    return this.session(session.id);
  }


  async report(sessionId: string): Promise<CashCloseReportResponse> {
    const session = await this.session(sessionId);
    const end = session.closedAt ? new Date(session.closedAt) : new Date();

    const payments = await this.prisma.payment.findMany({
      where: {
        cashSessionId: session.id,
        receivedAt: {
          gte: new Date(session.openedAt),
          lte: end,
        },
      },
      include: { method: true },
    });

    const paymentMap = new Map<
      string,
      { methodCode: string; methodName: string; amount: number; affectsCash: boolean }
    >();

    for (const payment of payments) {
      const current = paymentMap.get(payment.method.code);
      const amount = Number(payment.amount);

      if (current) {
        current.amount += amount;
      } else {
        paymentMap.set(payment.method.code, {
          methodCode: payment.method.code,
          methodName: payment.method.name,
          amount,
          affectsCash: payment.method.type === 'CASH',
        });
      }
    }

    const posMovements = await this.prisma.posMovement.findMany({
      where: {
        createdAt: {
          gte: new Date(session.openedAt),
          lte: end,
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    const orderItems = await this.prisma.serviceOrderItem.findMany({
      where: {
        order: {
          paidAt: {
            gte: new Date(session.openedAt),
            lte: end,
          },
        },
        status: 'ACTIVE',
      },
      include: {
        service: true,
        product: true,
      },
    });

    const lineMap = new Map<
      string,
      { kind: 'SERVICE' | 'PRODUCT'; description: string; quantity: number; total: number }
    >();

    for (const movement of posMovements) {
      for (const item of movement.items) {
        const key = `PRODUCT:${item.productId}`;
        const current = lineMap.get(key);
        if (current) {
          current.quantity += Number(item.quantity);
          current.total += Number(item.lineTotal);
        } else {
          lineMap.set(key, {
            kind: 'PRODUCT',
            description: item.product.name,
            quantity: Number(item.quantity),
            total: Number(item.lineTotal),
          });
        }
      }
    }

    for (const item of orderItems) {
      const kind = item.itemType === 'SERVICE' ? 'SERVICE' : 'PRODUCT';
      const description =
        item.service?.name ??
        item.product?.name ??
        item.descriptionSnapshot;
      const key = `${kind}:${item.serviceId ?? item.productId ?? description}`;
      const current = lineMap.get(key);

      if (current) {
        current.quantity += Number(item.quantity);
        current.total += Number(item.lineTotal);
      } else {
        lineMap.set(key, {
          kind,
          description,
          quantity: Number(item.quantity),
          total: Number(item.lineTotal),
        });
      }
    }

    const sales = [...lineMap.values()];
    const totalServices = sales
      .filter((line) => line.kind === 'SERVICE')
      .reduce((sum, line) => sum + line.total, 0);
    const totalProducts = sales
      .filter((line) => line.kind === 'PRODUCT')
      .reduce((sum, line) => sum + line.total, 0);
    const printCount = await this.prisma.cashPrintLog.count({
      where: { cashSessionId: session.id },
    });

    return {
      session,
      payments: [...paymentMap.values()],
      sales,
      totalSales: [...paymentMap.values()].reduce(
        (sum, payment) => sum + payment.amount,
        0,
      ),
      totalServices,
      totalProducts,
      printCount,
    };
  }

  async registerPrint(
    sessionId: string,
    dto: RegisterCashPrintDto,
  ): Promise<{ ok: true }> {
    await this.prisma.cashSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    await this.prisma.cashPrintLog.create({
      data: {
        cashSessionId: sessionId,
        documentType: dto.documentType,
        reprint: dto.reprint,
        printedBy: dto.printedBy.trim(),
      },
    });

    return { ok: true };
  }

  private calculateExpected(
    openingAmount: number,
    movements: Array<{ type: string; amount: unknown }>,
  ): number {
    return movements.reduce((total, movement) => {
      if (
        movement.type === 'OPENING' ||
        movement.type === 'CLOSING' ||
        movement.type === 'CREDIT_SALE'
      ) {
        return total;
      }

      const amount = Number(movement.amount);

      if (
        movement.type === 'WITHDRAWAL' ||
        movement.type === 'EXPENSE'
      ) {
        return total - amount;
      }

      return total + amount;
    }, openingAmount);
  }

  private mapSession(
    session: {
      id: string;
      cashRegisterId: string;
      employeeId: string;
      cashierNameSnapshot: string;
      status: 'OPEN' | 'CLOSED';
      openingAmount: unknown;
      expectedAmount: unknown;
      countedAmount: unknown;
      difference: unknown;
      openedAt: Date;
      closedAt: Date | null;
      employee: { fullName: string };
      movements: Array<{
        id: string;
        type:
          | 'OPENING'
          | 'SALE'
          | 'COLLECTION'
          | 'CREDIT_SALE'
          | 'EXPENSE'
          | 'WITHDRAWAL'
          | 'DEPOSIT'
          | 'ADJUSTMENT'
          | 'CLOSING';
        amount: unknown;
        description: string;
        beneficiary: string | null;
        externalReference: string | null;
        createdAt: Date;
      }>;
    },
    cashRegisterName: string,
  ): CashSessionResponse {
    const expected =
      session.status === 'OPEN'
        ? this.calculateExpected(
            Number(session.openingAmount),
            session.movements,
          )
        : Number(session.expectedAmount ?? 0);

    return {
      id: session.id,
      cashRegisterId: session.cashRegisterId,
      cashRegisterName,
      employeeId: session.employeeId,
      cashierName:
        session.cashierNameSnapshot || session.employee.fullName,
      status: session.status,
      openingAmount: Number(session.openingAmount),
      expectedAmount: expected,
      countedAmount:
        session.countedAmount === null
          ? null
          : Number(session.countedAmount),
      difference:
        session.difference === null
          ? null
          : Number(session.difference),
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      movements: session.movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        amount: Number(movement.amount),
        description: movement.description,
        beneficiary: movement.beneficiary,
        externalReference: movement.externalReference,
        createdAt: movement.createdAt.toISOString(),
      })),
    };
  }
}
