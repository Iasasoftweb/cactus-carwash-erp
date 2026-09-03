import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  OperationalAreaResponse,
} from '@cactus/shared';

import type {
  AuthenticatedRequestUser,
} from '../auth/auth.types';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { OperationalAreasService } from './operational-areas.service';

type OperationalAreasAuthenticatedRequest = {
  user: AuthenticatedRequestUser;
};

@Controller('operational-areas')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class OperationalAreasController {
  constructor(
    private readonly operationalAreasService: OperationalAreasService,
  ) {}

  @Get()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.orderView,
    ERP_PERMISSIONS.orderCreate,
    ERP_PERMISSIONS.orderManage,
    ERP_PERMISSIONS.posKitchenView,
    ERP_PERMISSIONS.posKitchenManage,
    ERP_PERMISSIONS.cashView,
    ERP_PERMISSIONS.cashManage,
  )
  list(
    @Req()
    request: OperationalAreasAuthenticatedRequest,
    @Query('branchId')
    branchId?: string,
  ): Promise<OperationalAreaResponse[]> {
    return this.operationalAreasService.list(
      request.user.companyId,
      branchId,
    );
  }
}