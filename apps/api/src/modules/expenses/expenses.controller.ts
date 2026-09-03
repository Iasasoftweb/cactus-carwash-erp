import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  ExpenseCategoryResponse,
  ExpenseResponse,
} from '@cactus/shared';

import type {
  AuthenticatedRequestUser,
} from '../auth/auth.types';
import {
  RequireAnyPermissions,
} from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

@Controller('expenses')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
  ) {}

  @Get('categories')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.expenseView,
    ERP_PERMISSIONS.expenseCreate,
    ERP_PERMISSIONS.expenseApprove,
    ERP_PERMISSIONS.expenseManage,
  )
  categories(
    @Req() request: AuthenticatedRequest,
  ): Promise<ExpenseCategoryResponse[]> {
    return this.expensesService.categories(
      request.user.companyId,
    );
  }

  @Get()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.expenseView,
    ERP_PERMISSIONS.expenseCreate,
    ERP_PERMISSIONS.expenseApprove,
    ERP_PERMISSIONS.expenseManage,
  )
  list(
    @Req() request: AuthenticatedRequest,
  ): Promise<ExpenseResponse[]> {
    return this.expensesService.list(
      request.user.companyId,
    );
  }

  @Post()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.expenseCreate,
    ERP_PERMISSIONS.expenseManage,
  )
  create(
    @Body() dto: CreateExpenseDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExpenseResponse> {
    return this.expensesService.create(
      dto,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        username: request.user.username,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Post(':id/approve')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.expenseApprove,
    ERP_PERMISSIONS.expenseManage,
  )
  approve(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExpenseResponse> {
    return this.expensesService.approve(
      id,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        username: request.user.username,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Post(':id/issue')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.expenseApprove,
    ERP_PERMISSIONS.expenseManage,
  )
  issue(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExpenseResponse> {
    return this.expensesService.issue(
      id,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        username: request.user.username,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Post(':id/cancel')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.expenseManage,
  )
  cancel(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ExpenseResponse> {
    return this.expensesService.cancel(
      id,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        username: request.user.username,
        ipAddress: request.ip ?? null,
      },
    );
  }
}