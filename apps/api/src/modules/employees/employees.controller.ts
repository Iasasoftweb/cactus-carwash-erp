import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  CashierEmployeeResponse,
  EmployeeBranchResponse,
  EmployeeResponse,
} from '@cactus/shared';

import type { AuthenticatedRequestUser } from '../auth/auth.types';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

type EmployeesAuthenticatedRequest = {
  user: AuthenticatedRequestUser;
  ip?: string;
};

function employeeActor(request: EmployeesAuthenticatedRequest) {
  return {
    userId: request.user.id,
    companyId: request.user.companyId,
    username: request.user.username,
    branchAccessMode: request.user.branchAccessMode,
    branchIds: request.user.branchIds,
    ipAddress: request.ip ?? null,
  };
}

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
  ) {}

  @Get('branches')
  @RequireAnyPermissions('EMPLOYEE_VIEW', 'EMPLOYEE_MANAGE')
  branches(
    @Req() request: EmployeesAuthenticatedRequest,
  ): Promise<EmployeeBranchResponse[]> {
    return this.employeesService.branches(request.user);
  }

  @Get()
  @RequireAnyPermissions('EMPLOYEE_VIEW', 'EMPLOYEE_MANAGE')
  list(
    @Req() request: EmployeesAuthenticatedRequest,
  ): Promise<EmployeeResponse[]> {
    return this.employeesService.list(request.user);
  }

  @Get('cashiers')
  @RequireAnyPermissions(
    'EMPLOYEE_VIEW',
    'EMPLOYEE_MANAGE',
    'CASH_SESSION_OPERATE',
    'CASH_MANAGE',
  )
  cashiers(
    @Req() request: EmployeesAuthenticatedRequest,
  ): Promise<CashierEmployeeResponse[]> {
    return this.employeesService.cashiers(request.user);
  }

  @Post()
  @RequireAnyPermissions('EMPLOYEE_MANAGE')
  create(
    @Req() request: EmployeesAuthenticatedRequest,
    @Body() dto: CreateEmployeeDto,
  ): Promise<EmployeeResponse> {
    return this.employeesService.create(dto, employeeActor(request));
  }

  @Patch(':id')
  @RequireAnyPermissions('EMPLOYEE_MANAGE')
  update(
    @Param('id') id: string,
    @Req() request: EmployeesAuthenticatedRequest,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponse> {
    return this.employeesService.update(id, dto, employeeActor(request));
  }
}