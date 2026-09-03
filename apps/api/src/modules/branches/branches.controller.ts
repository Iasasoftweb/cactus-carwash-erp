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
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  BranchAdminResponse,
} from '@cactus/shared';

import type {
  AuthenticatedRequestUser,
} from '../auth/auth.types';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

type BranchesAuthenticatedRequest = {
  user: AuthenticatedRequestUser;
  ip?: string;
};

@Controller('branches')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
  ) {}

  @Get()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
  )
  list(
    @Req()
    request: BranchesAuthenticatedRequest,
  ): Promise<BranchAdminResponse[]> {
    return this.branchesService.list(
      request.user.companyId,
    );
  }

  @Get(':id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
  )
  findOne(
    @Param('id') id: string,
    @Req()
    request: BranchesAuthenticatedRequest,
  ): Promise<BranchAdminResponse> {
    return this.branchesService.findOne(
      id,
      request.user.companyId,
    );
  }

  @Post()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
  )
  create(
    @Body() dto: CreateBranchDto,
    @Req()
    request: BranchesAuthenticatedRequest,
  ): Promise<BranchAdminResponse> {
    return this.branchesService.create(
      dto,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Patch(':id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @Req()
    request: BranchesAuthenticatedRequest,
  ): Promise<BranchAdminResponse> {
    return this.branchesService.update(
      id,
      dto,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        ipAddress: request.ip ?? null,
      },
    );
  }
}