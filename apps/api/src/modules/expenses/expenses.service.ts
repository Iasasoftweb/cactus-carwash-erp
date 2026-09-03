import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  ExpenseCategoryResponse,
  ExpenseResponse,
} from '@cactus/shared';

import { CreateExpenseDto } from './dto/create-expense.dto';

type ExpenseActor = {
  userId: string;
  companyId: string;
  username: string;
  ipAddress: string | null;
};

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async categories(
    companyId: string,
  ): Promise<ExpenseCategoryResponse[]> {
    return this.prisma.expenseCategory.findMany({
      where: {
        companyId,
        active: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async list(
    companyId: string,
  ): Promise<ExpenseResponse[]> {
    const rows = await this.prisma.expense.findMany({
      where: {
        companyId,
      },
      include: {
        category: true,
        cashRegister: true,
        requestedBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rows.map(
      (row) => this.map(row),
    );
  }

  async create(
    dto: CreateExpenseDto,
    actor: ExpenseActor,
  ): Promise<ExpenseResponse> {
    return this.prisma.$transaction(async (tx) => {
      const register =
        await tx.cashRegister.findFirst({
          where: {
            id: dto.cashRegisterId,
            branch: {
              companyId: actor.companyId,
              active: true,
            },
          },
          include: {
            branch: true,
          },
        });

      if (!register) {
        throw new NotFoundException(
          'Caja no encontrada.',
        );
      }

      const category =
        await tx.expenseCategory.findFirst({
          where: {
            id: dto.categoryId,
            companyId: actor.companyId,
            active: true,
          },
        });

      if (!category) {
        throw new BadRequestException(
          'La categoría de gasto no está disponible.',
        );
      }

      const requestedBy =
        await tx.employee.findFirst({
          where: {
            id: dto.requestedById,
            companyId: actor.companyId,
            branchId: register.branchId,
            active: true,
          },
        });

      if (!requestedBy) {
        throw new BadRequestException(
          'El empleado solicitante no pertenece a la sucursal seleccionada o no está activo.',
        );
      }

      const beneficiary =
        dto.beneficiary.trim();

      const concept =
        dto.concept.trim();

      if (!beneficiary) {
        throw new BadRequestException(
          'El beneficiario es obligatorio.',
        );
      }

      if (!concept) {
        throw new BadRequestException(
          'El concepto del gasto es obligatorio.',
        );
      }

      if (dto.amount <= 0) {
        throw new BadRequestException(
          'El monto del gasto debe ser mayor que cero.',
        );
      }

      const created =
        await tx.expense.create({
          data: {
            companyId:
              actor.companyId,
            branchId:
              register.branchId,
            categoryId:
              category.id,
            cashRegisterId:
              register.id,
            requestedById:
              requestedBy.id,
            beneficiary,
            concept,
            amount:
              dto.amount,
            reference:
              dto.reference?.trim() || null,

            /*
             * La creación y la aprobación son
             * responsabilidades separadas.
             */
            status:
              'PENDING',
          },
          include: {
            category: true,
            cashRegister: true,
            requestedBy: true,
          },
        });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'CREATE_EXPENSE',
          entityType:
            'EXPENSE',
          entityId:
            created.id,
          reason:
            null,
          newValues: {
            status:
              created.status,
            branchId:
              register.branchId,
            cashRegisterId:
              register.id,
            categoryId:
              category.id,
            requestedById:
              requestedBy.id,
            beneficiary:
              created.beneficiary,
            concept:
              created.concept,
            amount:
              Number(created.amount),
            reference:
              created.reference,
            createdBy:
              actor.username,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return this.map(created);
    });
  }

  async approve(
    id: string,
    actor: ExpenseActor,
  ): Promise<ExpenseResponse> {
    return this.prisma.$transaction(async (tx) => {
      /*
       * Serializa las transiciones de estado del gasto.
       * El lock se adquiere antes de leer status para evitar
       * aprobaciones, emisiones o cancelaciones concurrentes.
       */
      const lockedExpense =
        await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM expenses
          WHERE id = ${id}
            AND company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedExpense.length === 0) {
        throw new NotFoundException(
          'Gasto no encontrado.',
        );
      }

      const expense =
        await tx.expense.findFirst({
          where: {
            id,
            companyId:
              actor.companyId,
          },
          include: {
            category: true,
            cashRegister: true,
            requestedBy: true,
          },
        });

      if (!expense) {
        throw new NotFoundException(
          'Gasto no encontrado.',
        );
      }

      if (expense.status !== 'PENDING') {
        throw new BadRequestException(
          'Solo los gastos pendientes pueden aprobarse.',
        );
      }

      const approvedAt = new Date();

      const updated =
        await tx.expense.update({
          where: {
            id: expense.id,
          },
          data: {
            status:
              'APPROVED',
            approvedAt,
          },
          include: {
            category: true,
            cashRegister: true,
            requestedBy: true,
          },
        });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'APPROVE_EXPENSE',
          entityType:
            'EXPENSE',
          entityId:
            expense.id,
          reason:
            null,
          oldValues: {
            status:
              expense.status,
          },
          newValues: {
            status:
              updated.status,
            approvedAt:
              approvedAt.toISOString(),
            approvedBy:
              actor.username,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return this.map(updated);
    });
  }

  async issue(
    id: string,
    actor: ExpenseActor,
  ): Promise<ExpenseResponse> {
    return this.prisma.$transaction(async (tx) => {
      /*
       * Serializa las transiciones de estado del gasto.
       * El lock se adquiere antes de leer status para evitar
       * aprobaciones, emisiones o cancelaciones concurrentes.
       */
      const lockedExpense =
        await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM expenses
          WHERE id = ${id}
            AND company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedExpense.length === 0) {
        throw new NotFoundException(
          'Gasto no encontrado.',
        );
      }

      const expense =
        await tx.expense.findFirst({
          where: {
            id,
            companyId:
              actor.companyId,
          },
          include: {
            category: true,
            cashRegister: {
              include: {
                branch: true,
              },
            },
            requestedBy: true,
          },
        });

      if (!expense) {
        throw new NotFoundException(
          'Gasto no encontrado.',
        );
      }

      if (
        expense.cashRegister.branch.companyId !==
        actor.companyId
      ) {
        throw new NotFoundException(
          'Gasto no encontrado.',
        );
      }

      if (expense.status !== 'APPROVED') {
        throw new BadRequestException(
          'Solo los gastos aprobados pueden emitirse.',
        );
      }

      const session =
        await tx.cashSession.findFirst({
          where: {
            cashRegisterId:
              expense.cashRegisterId,
            status:
              'OPEN',
            cashRegister: {
              branch: {
                companyId:
                  actor.companyId,
              },
            },
          },
        });

      if (!session) {
        throw new BadRequestException(
          'La caja seleccionada no tiene una sesión abierta.',
        );
      }

      const issuedAt = new Date();

      const movement =
        await tx.cashMovement.create({
          data: {
            cashSessionId:
              session.id,
            type:
              'EXPENSE',
            amount:
              expense.amount,
            description:
              expense.concept,
            beneficiary:
              expense.beneficiary,
            externalReference:
              expense.reference,
            referenceType:
              'EXPENSE',
            referenceId:
              expense.id,
          },
        });

      const updated =
        await tx.expense.update({
          where: {
            id: expense.id,
          },
          data: {
            status:
              'ISSUED',
            cashSessionId:
              session.id,
            issuedAt,
          },
          include: {
            category: true,
            cashRegister: true,
            requestedBy: true,
          },
        });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'ISSUE_EXPENSE',
          entityType:
            'EXPENSE',
          entityId:
            expense.id,
          reason:
            null,
          oldValues: {
            status:
              expense.status,
          },
          newValues: {
            status:
              updated.status,
            issuedAt:
              issuedAt.toISOString(),
            cashSessionId:
              session.id,
            cashMovementId:
              movement.id,
            amount:
              Number(expense.amount),
            issuedBy:
              actor.username,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return this.map(updated);
    });
  }

  async cancel(
    id: string,
    actor: ExpenseActor,
  ): Promise<ExpenseResponse> {
    return this.prisma.$transaction(async (tx) => {
      /*
       * Serializa las transiciones de estado del gasto.
       * El lock se adquiere antes de leer status para evitar
       * aprobaciones, emisiones o cancelaciones concurrentes.
       */
      const lockedExpense =
        await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM expenses
          WHERE id = ${id}
            AND company_id = ${actor.companyId}
          FOR UPDATE
        `;

      if (lockedExpense.length === 0) {
        throw new NotFoundException(
          'Gasto no encontrado.',
        );
      }

      const expense =
        await tx.expense.findFirst({
          where: {
            id,
            companyId:
              actor.companyId,
          },
          include: {
            category: true,
            cashRegister: true,
            requestedBy: true,
          },
        });

      if (!expense) {
        throw new NotFoundException(
          'Gasto no encontrado.',
        );
      }

      if (expense.status === 'ISSUED') {
        throw new BadRequestException(
          'Un gasto emitido no puede cancelarse desde esta pantalla.',
        );
      }

      if (expense.status === 'CANCELLED') {
        throw new BadRequestException(
          'El gasto ya se encuentra cancelado.',
        );
      }

      const cancelledAt = new Date();

      const updated =
        await tx.expense.update({
          where: {
            id: expense.id,
          },
          data: {
            status:
              'CANCELLED',
            cancelledAt,
          },
          include: {
            category: true,
            cashRegister: true,
            requestedBy: true,
          },
        });

      await tx.auditLog.create({
        data: {
          companyId:
            actor.companyId,
          userId:
            actor.userId,
          action:
            'CANCEL_EXPENSE',
          entityType:
            'EXPENSE',
          entityId:
            expense.id,
          reason:
            null,
          oldValues: {
            status:
              expense.status,
          },
          newValues: {
            status:
              updated.status,
            cancelledAt:
              cancelledAt.toISOString(),
            cancelledBy:
              actor.username,
          },
          ipAddress:
            actor.ipAddress,
        },
      });

      return this.map(updated);
    });
  }

  private map(row: {
    id: string;
    categoryId: string;
    cashRegisterId: string;
    requestedById: string;
    beneficiary: string;
    concept: string;
    amount: unknown;
    reference: string | null;
    status:
      | 'PENDING'
      | 'APPROVED'
      | 'ISSUED'
      | 'CANCELLED';
    createdAt: Date;
    issuedAt: Date | null;
    category: {
      name: string;
    };
    cashRegister: {
      name: string;
    };
    requestedBy: {
      fullName: string;
    };
  }): ExpenseResponse {
    return {
      id:
        row.id,
      categoryId:
        row.categoryId,
      categoryName:
        row.category.name,
      cashRegisterId:
        row.cashRegisterId,
      cashRegisterName:
        row.cashRegister.name,
      requestedById:
        row.requestedById,
      requestedByName:
        row.requestedBy.fullName,
      beneficiary:
        row.beneficiary,
      concept:
        row.concept,
      amount:
        Number(row.amount),
      reference:
        row.reference,
      status:
        row.status,
      createdAt:
        row.createdAt.toISOString(),
      issuedAt:
        row.issuedAt?.toISOString() ?? null,
    };
  }
}