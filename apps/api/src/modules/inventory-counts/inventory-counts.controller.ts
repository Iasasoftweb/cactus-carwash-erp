import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ERP_PERMISSIONS } from '@cactus/shared';
import type { InventoryAuditEntryResponse, InventoryCountResponse } from '@cactus/shared';
import type { Request } from 'express';
import type { AuthenticatedRequestUser } from '../auth/auth.types';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { UpdateInventoryCountItemsDto } from './dto/update-inventory-count-items.dto';
import { InventoryCountsService } from './inventory-counts.service';

type AuthenticatedRequest = Request & { user: AuthenticatedRequestUser };

@Controller('inventory-counts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryCountsController {
  constructor(private readonly service: InventoryCountsService) {}

  @Get('audit')
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryView, ERP_PERMISSIONS.inventoryManage)
  audit(@Req() request: AuthenticatedRequest, @Query('branchId') branchId?: string): Promise<InventoryAuditEntryResponse[]> {
    return this.service.audit(request.user, branchId);
  }

  @Get()
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryView, ERP_PERMISSIONS.inventoryManage)
  list(@Req() request: AuthenticatedRequest, @Query('branchId') branchId?: string): Promise<InventoryCountResponse[]> {
    return this.service.list(request.user, branchId);
  }

  @Get(':id')
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryView, ERP_PERMISSIONS.inventoryManage)
  detail(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<InventoryCountResponse> {
    return this.service.detail(id, request.user);
  }

  @Post()
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryManage)
  create(@Body() dto: CreateInventoryCountDto, @Req() request: AuthenticatedRequest): Promise<InventoryCountResponse> {
    return this.service.create(dto, request.user, request.ip ?? null);
  }

  @Patch(':id/items')
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryManage)
  updateItems(@Param('id') id: string, @Body() dto: UpdateInventoryCountItemsDto, @Req() request: AuthenticatedRequest): Promise<InventoryCountResponse> {
    return this.service.updateItems(id, dto, request.user);
  }

  @Post(':id/confirm')
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryManage)
  confirm(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<InventoryCountResponse> {
    return this.service.confirm(id, request.user, request.ip ?? null);
  }

  @Post(':id/cancel')
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryManage)
  cancel(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<InventoryCountResponse> {
    return this.service.cancel(id, request.user, request.ip ?? null);
  }
}
