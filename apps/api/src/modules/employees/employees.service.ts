import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  CashierEmployeeResponse,
  EmployeeResponse,
} from '@cactus/shared';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<EmployeeResponse[]> {
    const rows = await this.prisma.employee.findMany({
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        phone: true,
        jobPosition: true,
        canOperateCash: true,
        active: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return rows;
  }

  async cashiers(): Promise<CashierEmployeeResponse[]> {
    return this.prisma.employee.findMany({
      where: { active: true, canOperateCash: true },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        jobPosition: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeResponse> {
    const branch = await this.prisma.branch.findFirst({
      where: { active: true },
    });

    if (!branch) {
      throw new BadRequestException('No existe una sucursal activa.');
    }

    const exists = await this.prisma.employee.findFirst({
      where: {
        companyId: branch.companyId,
        employeeNo: dto.employeeNo.trim(),
      },
    });

    if (exists) {
      throw new BadRequestException('El número de empleado ya existe.');
    }

    return this.prisma.employee.create({
      data: {
        companyId: branch.companyId,
        branchId: branch.id,
        employeeNo: dto.employeeNo.trim(),
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        jobPosition: dto.jobPosition?.trim() || null,
        canOperateCash: dto.canOperateCash,
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        phone: true,
        jobPosition: true,
        canOperateCash: true,
        active: true,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponse> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado.');
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        employeeNo: dto.employeeNo.trim(),
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        jobPosition: dto.jobPosition?.trim() || null,
        canOperateCash: dto.canOperateCash,
        active: dto.active,
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        phone: true,
        jobPosition: true,
        canOperateCash: true,
        active: true,
      },
    });
  }
}
