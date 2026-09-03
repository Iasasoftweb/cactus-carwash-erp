import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  AdminUserResponse,
  AuthUserResponse,
  PermissionSummaryResponse,
  UserBranchOptionResponse,
  UserRoleSummaryResponse,
} from '@cactus/shared';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserBranchAccessDto } from './dto/update-user-branch-access.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

type AuthenticatedUsersRequest = Request & {
  user: AuthUserResponse;
};

function auditActor(
  request: AuthenticatedUsersRequest,
) {
  return {
    userId: request.user.id,
    ipAddress: request.ip ?? null,
  };
}

@Controller('users')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('roles')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.roleView,
    ERP_PERMISSIONS.roleManage,
    ERP_PERMISSIONS.userRoleManage,
  )
  roles(): Promise<UserRoleSummaryResponse[]> {
    return this.usersService.roles();
  }

  @Get('permissions')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.roleView,
    ERP_PERMISSIONS.roleManage,
  )
  permissions(): Promise<PermissionSummaryResponse[]> {
    return this.usersService.permissions();
  }

  @Get('branch-options')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userView,
    ERP_PERMISSIONS.userManage,
  )
  branchOptions(
    @CurrentUser() user: AuthUserResponse,
  ): Promise<UserBranchOptionResponse[]> {
    return this.usersService.branchOptions(
      user.companyId,
    );
  }

  @Get()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userView,
    ERP_PERMISSIONS.userManage,
    ERP_PERMISSIONS.userRoleManage,
    ERP_PERMISSIONS.userPasswordReset,
  )
  list(
    @CurrentUser() user: AuthUserResponse,
  ): Promise<AdminUserResponse[]> {
    return this.usersService.list(
      user.companyId,
    );
  }

  @Get(':id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userView,
    ERP_PERMISSIONS.userManage,
    ERP_PERMISSIONS.userRoleManage,
    ERP_PERMISSIONS.userPasswordReset,
  )
  get(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
  ): Promise<AdminUserResponse> {
    return this.usersService.get(
      user.companyId,
      id,
    );
  }

  @Post()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userManage,
  )
  create(
    @Req() request: AuthenticatedUsersRequest,
    @Body() dto: CreateUserDto,
  ): Promise<AdminUserResponse> {
    return this.usersService.create(
      request.user.companyId,
      dto,
      auditActor(request),
    );
  }

  @Patch(':id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userManage,
  )
  update(
    @Req() request: AuthenticatedUsersRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<AdminUserResponse> {
    return this.usersService.update(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }

  @Patch(':id/status')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userManage,
  )
  updateStatus(
    @Req() request: AuthenticatedUsersRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<AdminUserResponse> {
    return this.usersService.updateStatus(
      request.user.companyId,
      id,
      auditActor(request),
      dto,
    );
  }

  @Patch(':id/branch-access')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userManage,
  )
  updateBranchAccess(
    @Req() request: AuthenticatedUsersRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserBranchAccessDto,
  ): Promise<AdminUserResponse> {
    return this.usersService.updateBranchAccess(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }

  @Patch(':id/password')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userPasswordReset,
  )
  resetPassword(
    @Req() request: AuthenticatedUsersRequest,
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
  ): Promise<{ ok: true }> {
    return this.usersService.resetPassword(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }

  @Put(':id/roles')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.userRoleManage,
  )
  updateRoles(
    @Req() request: AuthenticatedUsersRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ): Promise<AdminUserResponse> {
    return this.usersService.updateRoles(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }
}