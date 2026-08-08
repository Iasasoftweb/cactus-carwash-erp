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

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async categories(): Promise<ExpenseCategoryResponse[]> {
    return this.prisma.expenseCategory.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async list(): Promise<ExpenseResponse[]> {
    const rows = await this.prisma.expense.findMany({
      include: {
        category: true,
        cashRegister: true,
        requestedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.map(row));
  }

  async create(dto: CreateExpenseDto): Promise<ExpenseResponse> {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id: dto.cashRegisterId },
      include: { branch: true },
    });

    if (!register) {
      throw new NotFoundException('Caja no encontrada.');
    }

    const created = await this.prisma.expense.create({
      data: {
        companyId: register.branch.companyId,
        branchId: register.branchId,
        categoryId: dto.categoryId,
        cashRegisterId: register.id,
        requestedById: dto.requestedById,
        beneficiary: dto.beneficiary.trim(),
        concept: dto.concept.trim(),
        amount: dto.amount,
        reference: dto.reference?.trim() || null,
        status: 'APPROVED',
        approvedAt: new Date(),
      },
      include: {
        category: true,
        cashRegister: true,
        requestedBy: true,
      },
    });

    return this.map(created);
  }

  async issue(id: string): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        cashRegister: true,
        requestedBy: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Gasto no encontrado.');
    }

    if (expense.status !== 'APPROVED') {
      throw new BadRequestException(
        'Solo los gastos aprobados pueden emitirse.',
      );
    }

    const session = await this.prisma.cashSession.findFirst({
      where: {
        cashRegisterId: expense.cashRegisterId,
        status: 'OPEN',
      },
    });

    if (!session) {
      throw new BadRequestException(
        'La caja seleccionada no tiene una sesión abierta.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          type: 'EXPENSE',
          amount: expense.amount,
          description: expense.concept,
          beneficiary: expense.beneficiary,
          externalReference: expense.reference,
          referenceType: 'EXPENSE',
          referenceId: expense.id,
        },
      });

      return tx.expense.update({
        where: { id: expense.id },
        data: {
          status: 'ISSUED',
          cashSessionId: session.id,
          issuedAt: new Date(),
        },
        include: {
          category: true,
          cashRegister: true,
          requestedBy: true,
        },
      });
    });

    return this.map(updated);
  }

  async cancel(id: string): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      throw new NotFoundException('Gasto no encontrado.');
    }

    if (expense.status === 'ISSUED') {
      throw new BadRequestException(
        'Un gasto emitido no puede cancelarse desde esta pantalla.',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: {
        category: true,
        cashRegister: true,
        requestedBy: true,
      },
    });

    return this.map(updated);
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
    status: 'PENDING' | 'APPROVED' | 'ISSUED' | 'CANCELLED';
    createdAt: Date;
    issuedAt: Date | null;
    category: { name: string };
    cashRegister: { name: string };
    requestedBy: { fullName: string };
  }): ExpenseResponse {
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      cashRegisterId: row.cashRegisterId,
      cashRegisterName: row.cashRegister.name,
      requestedById: row.requestedById,
      requestedByName: row.requestedBy.fullName,
      beneficiary: row.beneficiary,
      concept: row.concept,
      amount: Number(row.amount),
      reference: row.reference,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      issuedAt: row.issuedAt?.toISOString() ?? null,
    };
  }
}
