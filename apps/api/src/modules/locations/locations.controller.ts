import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  LocationCashRegisterResponse,
  LocationPointOfSaleResponse,
} from '@cactus/shared';

import type {
  AuthenticatedRequestUser,
} from '../auth/auth.types';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { CreateLocationCashRegisterDto } from './dto/create-location-cash-register.dto';
import { CreateLocationPointDto } from './dto/create-location-point.dto';
import { LocationsService } from './locations.service';
import { UpdateLocationCashRegisterDto } from './dto/update-location-cash-register.dto';
import { UpdateLocationPointDto } from './dto/update-location-point.dto';

type LocationsAuthenticatedRequest = {
  user: AuthenticatedRequestUser;
  ip?: string;
};

@Controller('locations')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
  ) {}

  @Get('points')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
  )
  points(
    @Req()
    request: LocationsAuthenticatedRequest,
    @Query('branchId')
    branchId?: string,
  ): Promise<LocationPointOfSaleResponse[]> {
    return this.locationsService.points(
      request.user.companyId,
      branchId,
    );
  }

  @Get('points/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
  )
  point(
    @Param('id') id: string,
    @Req()
    request: LocationsAuthenticatedRequest,
  ): Promise<LocationPointOfSaleResponse> {
    return this.locationsService.point(
      id,
      request.user.companyId,
    );
  }

  @Post('points')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
  )
  createPoint(
    @Body() dto: CreateLocationPointDto,
    @Req()
    request: LocationsAuthenticatedRequest,
  ): Promise<LocationPointOfSaleResponse> {
    return this.locationsService.createPoint(
      dto,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Patch('points/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
  )
  updatePoint(
    @Param('id') id: string,
    @Body() dto: UpdateLocationPointDto,
    @Req()
    request: LocationsAuthenticatedRequest,
  ): Promise<LocationPointOfSaleResponse> {
    return this.locationsService.updatePoint(
      id,
      dto,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Get('cash-registers')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.cashView,
    ERP_PERMISSIONS.cashManage,
  )
  cashRegisters(
    @Req()
    request: LocationsAuthenticatedRequest,
    @Query('branchId')
    branchId?: string,
  ): Promise<LocationCashRegisterResponse[]> {
    return this.locationsService.cashRegisters(
      request.user.companyId,
      branchId,
    );
  }

  @Get('cash-registers/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.cashView,
    ERP_PERMISSIONS.cashManage,
  )
  cashRegister(
    @Param('id') id: string,
    @Req()
    request: LocationsAuthenticatedRequest,
  ): Promise<LocationCashRegisterResponse> {
    return this.locationsService.cashRegister(
      id,
      request.user.companyId,
    );
  }

  @Post('cash-registers')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.cashManage,
  )
  createCashRegister(
    @Body()
    dto: CreateLocationCashRegisterDto,
    @Req()
    request: LocationsAuthenticatedRequest,
  ): Promise<LocationCashRegisterResponse> {
    return this.locationsService.createCashRegister(
      dto,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Patch('cash-registers/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.cashManage,
  )
  updateCashRegister(
    @Param('id') id: string,
    @Body()
    dto: UpdateLocationCashRegisterDto,
    @Req()
    request: LocationsAuthenticatedRequest,
  ): Promise<LocationCashRegisterResponse> {
    return this.locationsService.updateCashRegister(
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