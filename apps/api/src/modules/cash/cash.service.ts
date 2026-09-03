import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@cactus/database";
import type {
  CashCloseReportResponse,
  CashRegisterSummaryResponse,
  CashSessionResponse,
} from "@cactus/shared";

import type { BranchAccessContext } from "../auth/branch-access";

import { CloseCashSessionDto } from "./dto/close-cash-session.dto";
import { CreateCashMovementDto } from "./dto/create-cash-movement.dto";
import { OpenCashSessionDto } from "./dto/open-cash-session.dto";
import { RegisterCashPrintDto } from "./dto/register-cash-print.dto";

type CashAuditActor = {
  userId: string;
  companyId: string;
  username: string;
  branchAccessMode: "ALL" | "ASSIGNED";
  branchIds: string[];
  ipAddress: string | null;
};

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async registers(
    access: BranchAccessContext,
  ): Promise<CashRegisterSummaryResponse[]> {
    const rows = await this.prisma.cashRegister.findMany({
      where: {
        active: true,
        branch: {
          companyId: access.companyId,
          ...(access.branchAccessMode === "ASSIGNED"
            ? {
                id: {
                  in: access.branchIds,
                },
              }
            : {}),
        },
      },
      include: {
        pointOfSale: true,
        sessions: {
          where: {
            status: "OPEN",
          },
          include: {
            employee: true,
            movements: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          take: 1,
          orderBy: {
            openedAt: "desc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return rows.map((register) => ({
      id: register.id,
      code: register.code,
      name: register.name,
      pointOfSaleName: register.pointOfSale?.name ?? null,
      active: register.active,
      openSession: register.sessions[0]
        ? this.mapSession(
            register.sessions[0],
            register.name,
          )
        : null,
    }));
  }

  async session(
    sessionId: string,
    access: BranchAccessContext,
  ): Promise<CashSessionResponse> {
    const session =
      await this.prisma.cashSession.findFirst({
        where: {
          id: sessionId,
          cashRegister: {
            branch: {
              companyId: access.companyId,
              ...(access.branchAccessMode === "ASSIGNED"
                ? {
                    id: {
                      in: access.branchIds,
                    },
                  }
                : {}),
            },
          },
        },
        include: {
          cashRegister: true,
          employee: true,
          movements: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (!session) {
      throw new NotFoundException(
        "Sesión de caja no encontrada.",
      );
    }

    return this.mapSession(
      session,
      session.cashRegister.name,
    );
  }

  async open(
    dto: OpenCashSessionDto,
    actor: CashAuditActor,
  ): Promise<CashSessionResponse> {
    return this.prisma.$transaction(async (tx) => {
      /*
       * MySQL no ofrece índices parciales para imponer
       * "una sola sesión OPEN por caja".
       *
       * Bloqueamos CashRegister para serializar aperturas
       * concurrentes. Después del lock hacemos la
       * autorización de sucursal sobre la fila cargada.
       */
      const lockedRegister =
        await tx.$queryRaw<Array<{ id: string }>>`
          SELECT cr.id
          FROM cash_registers cr
          INNER JOIN branches b
            ON b.id = cr.branch_id
          WHERE cr.id = ${dto.cashRegisterId}
            AND cr.active = 1
            AND b.company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedRegister.length === 0) {
        throw new NotFoundException(
          "Caja no encontrada.",
        );
      }

      const register =
        await tx.cashRegister.findFirst({
          where: {
            id: dto.cashRegisterId,
            active: true,
            branch: {
              companyId: actor.companyId,
            },
          },
          include: {
            branch: true,
          },
        });

      if (!register) {
        throw new NotFoundException(
          "Caja no encontrada.",
        );
      }

      if (
        actor.branchAccessMode === "ASSIGNED" &&
        !actor.branchIds.includes(register.branchId)
      ) {
        throw new NotFoundException(
          "Caja no encontrada.",
        );
      }

      const employee =
        await tx.employee.findFirst({
          where: {
            id: dto.employeeId,
            companyId: actor.companyId,
            branchId: register.branchId,
            active: true,
            canOperateCash: true,
          },
          include: {
            user: {
              select: {
                id: true,
                status: true,
                branchAccessMode: true,
                userBranches: {
                  select: { branchId: true },
                },
                userRoles: {
                  where: {
                    role: {
                      code: "CASHIER",
                      active: true,
                    },
                  },
                  select: { roleId: true },
                },
              },
            },
          },
        });

      if (
        !employee ||
        !employee.user ||
        employee.user.status !== "ACTIVE" ||
        employee.user.userRoles.length === 0 ||
        employee.user.branchAccessMode !== "ASSIGNED" ||
        !employee.user.userBranches.some(
          (row) => row.branchId === register.branchId,
        )
      ) {
        throw new BadRequestException(
          "El empleado seleccionado no está autorizado para operar caja.",
        );
      }

      const existing =
        await tx.cashSession.findFirst({
          where: {
            cashRegisterId: register.id,
            status: "OPEN",
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        throw new BadRequestException(
          "Esta caja ya tiene una sesión abierta.",
        );
      }

      const created =
        await tx.cashSession.create({
          data: {
            cashRegisterId: register.id,
            userId: employee.user.id,
            employeeId: employee.id,
            cashierNameSnapshot: employee.fullName,
            openingAmount: dto.openingAmount,
            expectedAmount: dto.openingAmount,
          },
        });

      await tx.cashMovement.create({
        data: {
          cashSessionId: created.id,
          type: "OPENING",
          amount: dto.openingAmount,
          description: "Fondo inicial de caja.",
          beneficiary: employee.fullName,
          referenceType: "CASH_SESSION_OPENING",
          referenceId: created.id,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "OPEN_CASH_SESSION",
          entityType: "CASH_SESSION",
          entityId: created.id,
          reason: null,
          newValues: {
            cashRegisterId: register.id,
            branchId: register.branchId,
            employeeId: employee.id,
            openingAmount: dto.openingAmount,
            openedBy: actor.username,
          },
          ipAddress: actor.ipAddress,
        },
      });

      const session =
        await tx.cashSession.findUniqueOrThrow({
          where: {
            id: created.id,
          },
          include: {
            employee: true,
            movements: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      return this.mapSession(
        session,
        register.name,
      );
    });
  }

  async addMovement(
    sessionId: string,
    dto: CreateCashMovementDto,
    actor: CashAuditActor,
  ): Promise<CashSessionResponse> {
    await this.prisma.$transaction(async (tx) => {
      /*
       * El lock serializa addMovement() y close().
       * Company sigue siendo la primera frontera.
       */
      const locked =
        await tx.$queryRaw<Array<{
          id: string;
          branchId: string;
        }>>`
          SELECT
            cs.id,
            cr.branch_id AS branchId
          FROM cash_sessions cs
          INNER JOIN cash_registers cr
            ON cr.id = cs.cash_register_id
          INNER JOIN branches b
            ON b.id = cr.branch_id
          WHERE cs.id = ${sessionId}
            AND b.company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (locked.length === 0) {
        throw new NotFoundException(
          "Sesión de caja no encontrada.",
        );
      }

      if (
        actor.branchAccessMode === "ASSIGNED" &&
        !actor.branchIds.includes(
          locked[0].branchId,
        )
      ) {
        throw new NotFoundException(
          "Sesión de caja no encontrada.",
        );
      }

      const session =
        await tx.cashSession.findFirst({
          where: {
            id: sessionId,
            cashRegister: {
              branch: {
                companyId: actor.companyId,
                ...(actor.branchAccessMode === "ASSIGNED"
                  ? {
                      id: {
                        in: actor.branchIds,
                      },
                    }
                  : {}),
              },
            },
          },
        });

      if (!session) {
        throw new NotFoundException(
          "Sesión de caja no encontrada.",
        );
      }

      if (session.status !== "OPEN") {
        throw new BadRequestException(
          "La caja se encuentra cerrada.",
        );
      }

      const movement =
        await tx.cashMovement.create({
          data: {
            cashSessionId: session.id,
            type: dto.type,
            amount: dto.amount,
            description: dto.description.trim(),
            beneficiary: dto.beneficiary.trim(),
            externalReference:
              dto.externalReference?.trim() || null,
            referenceType:
              dto.type === "WITHDRAWAL"
                ? "CASH_WITHDRAWAL"
                : "CASH_EXPENSE",
          },
        });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CREATE_CASH_MOVEMENT",
          entityType: "CASH_MOVEMENT",
          entityId: movement.id,
          reason: null,
          newValues: {
            cashSessionId: session.id,
            type: movement.type,
            amount: Number(movement.amount),
            description: movement.description,
            beneficiary: movement.beneficiary,
            externalReference:
              movement.externalReference,
            createdBy: actor.username,
          },
          ipAddress: actor.ipAddress,
        },
      });
    });

    return this.session(
      sessionId,
      actor,
    );
  }

  async close(
    sessionId: string,
    dto: CloseCashSessionDto,
    actor: CashAuditActor,
  ): Promise<CashSessionResponse> {
    await this.prisma.$transaction(async (tx) => {
      const locked =
        await tx.$queryRaw<Array<{
          id: string;
          branchId: string;
        }>>`
          SELECT
            cs.id,
            cr.branch_id AS branchId
          FROM cash_sessions cs
          INNER JOIN cash_registers cr
            ON cr.id = cs.cash_register_id
          INNER JOIN branches b
            ON b.id = cr.branch_id
          WHERE cs.id = ${sessionId}
            AND b.company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (locked.length === 0) {
        throw new NotFoundException(
          "Sesión de caja no encontrada.",
        );
      }

      if (
        actor.branchAccessMode === "ASSIGNED" &&
        !actor.branchIds.includes(
          locked[0].branchId,
        )
      ) {
        throw new NotFoundException(
          "Sesión de caja no encontrada.",
        );
      }

      const session =
        await tx.cashSession.findFirst({
          where: {
            id: sessionId,
            cashRegister: {
              branch: {
                companyId: actor.companyId,
                ...(actor.branchAccessMode === "ASSIGNED"
                  ? {
                      id: {
                        in: actor.branchIds,
                      },
                    }
                  : {}),
              },
            },
          },
          include: {
            movements: true,
            cashRegister: true,
          },
        });

      if (!session) {
        throw new NotFoundException(
          "Sesión de caja no encontrada.",
        );
      }

      if (session.status !== "OPEN") {
        throw new BadRequestException(
          "La caja ya fue cerrada.",
        );
      }

      const expected =
        this.calculateExpected(
          Number(session.openingAmount),
          session.movements,
        );

      const difference =
        dto.countedAmount - expected;

      const closedAt = new Date();

      await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          type: "CLOSING",
          amount: dto.countedAmount,
          description:
            "Conteo final y cierre de caja.",
          beneficiary:
            session.cashierNameSnapshot,
          referenceType:
            "CASH_SESSION_CLOSING",
          referenceId: session.id,
        },
      });

      await tx.cashSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: "CLOSED",
          expectedAmount: expected,
          countedAmount: dto.countedAmount,
          difference,
          closedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action: "CLOSE_CASH_SESSION",
          entityType: "CASH_SESSION",
          entityId: session.id,
          reason: null,
          oldValues: {
            status: session.status,
          },
          newValues: {
            status: "CLOSED",
            cashRegisterId:
              session.cashRegisterId,
            expectedAmount: expected,
            countedAmount:
              dto.countedAmount,
            difference,
            closedAt:
              closedAt.toISOString(),
            closedBy: actor.username,
          },
          ipAddress: actor.ipAddress,
        },
      });
    });

    return this.session(
      sessionId,
      actor,
    );
  }

  async report(
    sessionId: string,
    access: BranchAccessContext,
  ): Promise<CashCloseReportResponse> {
    const row =
      await this.prisma.cashSession.findFirst({
        where: {
          id: sessionId,
          cashRegister: {
            branch: {
              companyId: access.companyId,
              ...(access.branchAccessMode === "ASSIGNED"
                ? {
                    id: {
                      in: access.branchIds,
                    },
                  }
                : {}),
            },
          },
        },
        include: {
          cashRegister: {
            include: {
              branch: true,
              pointOfSale: true,
            },
          },
          employee: true,
          movements: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (!row) {
      throw new NotFoundException(
        "Sesión de caja no encontrada.",
      );
    }

    const session =
      this.mapSession(
        row,
        row.cashRegister.name,
      );

    /*
     * Payment.cashSessionId es la fuente autoritativa
     * del universo financiero del turno.
     */
    const payments =
      await this.prisma.payment.findMany({
        where: {
          cashSessionId: row.id,
        },
        include: {
          method: true,
        },
      });

    const paymentMap = new Map<
      string,
      {
        methodCode: string;
        methodName: string;
        amount: number;
        affectsCash: boolean;
      }
    >();

    for (const payment of payments) {
      const current =
        paymentMap.get(payment.method.code);

      const amount =
        Number(payment.amount);

      if (current) {
        current.amount += amount;
      } else {
        paymentMap.set(
          payment.method.code,
          {
            methodCode:
              payment.method.code,
            methodName:
              payment.method.name,
            amount,
            affectsCash:
              payment.method.type === "CASH",
          },
        );
      }
    }

    const directIds = [
      ...new Set(
        payments
          .filter(
            (payment) =>
              payment.sourceType === "POS_DIRECT" &&
              Boolean(payment.sourceId),
          )
          .map(
            (payment) =>
              payment.sourceId as string,
          ),
      ),
    ];

    const accountIds = [
      ...new Set(
        payments
          .filter(
            (payment) =>
              payment.sourceType === "POS_ACCOUNT" &&
              Boolean(payment.sourceId),
          )
          .map(
            (payment) =>
              payment.sourceId as string,
          ),
      ),
    ];

    const orderIds = [
      ...new Set(
        payments
          .filter(
            (payment) =>
              payment.sourceType === "SERVICE_ORDER" &&
              Boolean(payment.sourceId),
          )
          .map(
            (payment) =>
              payment.sourceId as string,
          ),
      ),
    ];

    const [
      directSales,
      accountSales,
      orderItems,
    ] = await Promise.all([
      directIds.length > 0
        ? this.prisma.posMovement.findMany({
            where: {
              id: {
                in: directIds,
              },
              pointOfSale: {
                companyId:
                  access.companyId,
              },
              ...(row.cashRegister.pointOfSaleId
                ? {
                    pointOfSaleId:
                      row.cashRegister
                        .pointOfSaleId,
                  }
                : {}),
            },
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          })
        : [],

      accountIds.length > 0
        ? this.prisma.posAccount.findMany({
            where: {
              id: {
                in: accountIds,
              },
              pointOfSale: {
                companyId:
                  access.companyId,
              },
              cashRegisterId:
                row.cashRegisterId,
            },
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          })
        : [],

      orderIds.length > 0
        ? this.prisma.serviceOrderItem.findMany({
            where: {
              serviceOrderId: {
                in: orderIds,
              },
              status: "ACTIVE",
              order: {
                branchId:
                  row.cashRegister.branchId,
                branch: {
                  companyId:
                    access.companyId,
                },
              },
            },
            include: {
              service: true,
              product: true,
            },
          })
        : [],
    ]);

    const lineMap = new Map<
      string,
      {
        kind: "SERVICE" | "PRODUCT";
        description: string;
        quantity: number;
        total: number;
      }
    >();

    const addLine = (
      key: string,
      kind: "SERVICE" | "PRODUCT",
      description: string,
      quantity: number,
      total: number,
    ): void => {
      const current =
        lineMap.get(key);

      if (current) {
        current.quantity += quantity;
        current.total += total;
        return;
      }

      lineMap.set(key, {
        kind,
        description,
        quantity,
        total,
      });
    };

    for (const movement of directSales) {
      for (const item of movement.items) {
        addLine(
          `PRODUCT:${item.productId}`,
          "PRODUCT",
          item.product.name,
          Number(item.quantity),
          Number(item.lineTotal),
        );
      }
    }

    for (const account of accountSales) {
      for (const item of account.items) {
        addLine(
          `PRODUCT:${item.productId}`,
          "PRODUCT",
          item.product.name,
          Number(item.quantity),
          Number(item.lineTotal),
        );
      }
    }

    for (const item of orderItems) {
      const kind =
        item.itemType === "SERVICE"
          ? "SERVICE"
          : "PRODUCT";

      const description =
        item.service?.name ??
        item.product?.name ??
        item.descriptionSnapshot;

      addLine(
        `${kind}:${
          item.serviceId ??
          item.productId ??
          description
        }`,
        kind,
        description,
        Number(item.quantity),
        Number(item.lineTotal),
      );
    }

    const sales =
      [...lineMap.values()];

    const totalServices =
      sales
        .filter(
          (line) =>
            line.kind === "SERVICE",
        )
        .reduce(
          (sum, line) =>
            sum + line.total,
          0,
        );

    const totalProducts =
      sales
        .filter(
          (line) =>
            line.kind === "PRODUCT",
        )
        .reduce(
          (sum, line) =>
            sum + line.total,
          0,
        );

    const printCount =
      await this.prisma.cashPrintLog.count({
        where: {
          cashSessionId: row.id,
        },
      });

    const paymentRows =
      [...paymentMap.values()];

    return {
      session,
      payments: paymentRows,
      sales,
      totalSales:
        paymentRows.reduce(
          (sum, payment) =>
            sum + payment.amount,
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
    actor: CashAuditActor,
  ): Promise<{ ok: true }> {
    await this.prisma.$transaction(async (tx) => {
      const session =
        await tx.cashSession.findFirst({
          where: {
            id: sessionId,
            cashRegister: {
              branch: {
                companyId:
                  actor.companyId,
                ...(actor.branchAccessMode === "ASSIGNED"
                  ? {
                      id: {
                        in: actor.branchIds,
                      },
                    }
                  : {}),
              },
            },
          },
          select: {
            id: true,
          },
        });

      if (!session) {
        throw new NotFoundException(
          "Sesión de caja no encontrada.",
        );
      }

      const printLog =
        await tx.cashPrintLog.create({
          data: {
            cashSessionId: sessionId,
            documentType:
              dto.documentType,
            reprint: dto.reprint,
            printedBy:
              actor.username.trim(),
          },
        });

      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          action:
            dto.reprint
              ? "REPRINT_CASH_DOCUMENT"
              : "PRINT_CASH_DOCUMENT",
          entityType: "CASH_PRINT_LOG",
          entityId: printLog.id,
          reason: null,
          newValues: {
            cashSessionId: sessionId,
            documentType:
              dto.documentType,
            reprint: dto.reprint,
            printedBy:
              actor.username,
          },
          ipAddress: actor.ipAddress,
        },
      });
    });

    return {
      ok: true,
    };
  }

  private calculateExpected(
    openingAmount: number,
    movements: Array<{
      type: string;
      amount: unknown;
    }>,
  ): number {
    return movements.reduce(
      (total, movement) => {
        if (
          movement.type === "OPENING" ||
          movement.type === "CLOSING" ||
          movement.type === "CREDIT_SALE"
        ) {
          return total;
        }

        const amount =
          Number(movement.amount);

        if (
          movement.type === "WITHDRAWAL" ||
          movement.type === "EXPENSE"
        ) {
          return total - amount;
        }

        return total + amount;
      },
      openingAmount,
    );
  }

  private mapSession(
    session: {
      id: string;
      cashRegisterId: string;
      employeeId: string;
      cashierNameSnapshot: string;
      status: "OPEN" | "CLOSED";
      openingAmount: unknown;
      expectedAmount: unknown;
      countedAmount: unknown;
      difference: unknown;
      openedAt: Date;
      closedAt: Date | null;
      employee: {
        fullName: string;
      };
      movements: Array<{
        id: string;
        type:
          | "OPENING"
          | "SALE"
          | "COLLECTION"
          | "CREDIT_SALE"
          | "EXPENSE"
          | "WITHDRAWAL"
          | "DEPOSIT"
          | "ADJUSTMENT"
          | "CLOSING";
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
      session.status === "OPEN"
        ? this.calculateExpected(
            Number(
              session.openingAmount,
            ),
            session.movements,
          )
        : Number(
            session.expectedAmount ?? 0,
          );

    return {
      id: session.id,
      cashRegisterId:
        session.cashRegisterId,
      cashRegisterName,
      employeeId:
        session.employeeId,
      cashierName:
        session.cashierNameSnapshot ||
        session.employee.fullName,
      status: session.status,
      openingAmount:
        Number(session.openingAmount),
      expectedAmount: expected,
      countedAmount:
        session.countedAmount === null
          ? null
          : Number(
              session.countedAmount,
            ),
      difference:
        session.difference === null
          ? null
          : Number(
              session.difference,
            ),
      openedAt:
        session.openedAt.toISOString(),
      closedAt:
        session.closedAt?.toISOString() ??
        null,
      movements:
        session.movements.map(
          (movement) => ({
            id: movement.id,
            type: movement.type,
            amount:
              Number(movement.amount),
            description:
              movement.description,
            beneficiary:
              movement.beneficiary,
            externalReference:
              movement.externalReference,
            createdAt:
              movement.createdAt.toISOString(),
          }),
        ),
    };
  }
}
