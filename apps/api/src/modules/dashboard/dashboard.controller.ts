import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  DashboardContextResponse,
  DashboardFinancialSummaryResponse,
} from '@cactus/shared';

import type { AuthenticatedRequestUser } from '../auth/auth.types';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { DashboardService } from './dashboard.service';

type DashboardRequest = Request & {
  user: AuthenticatedRequestUser;
};

function access(request: DashboardRequest) {
  return {
    companyId: request.user.companyId,
    branchAccessMode: request.user.branchAccessMode,
    branchIds: request.user.branchIds,
    permissions: request.user.permissions,
  };
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('context')
  @UseGuards(JwtAuthGuard)
  context(
    @Req() request: DashboardRequest,
  ): Promise<DashboardContextResponse> {
    return this.dashboardService.context(access(request));
  }

  @Get('financial-summary')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.financialDashboardView,
  )
  financialSummary(
    @Req() request: DashboardRequest,
    @Query('branchId') branchId?: string,
  ): Promise<DashboardFinancialSummaryResponse> {
    return this.dashboardService.financialSummary(
      access(request),
      branchId,
    );
  }
}
