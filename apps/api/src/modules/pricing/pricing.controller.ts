import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ERP_PERMISSIONS } from '@cactus/shared';
import type {
  CustomerPriceLevelSummaryResponse,
  CustomerPriceLevelAssignmentResponse,
  PriceLevelResponse,
  ProductPricingResponse,
} from '@cactus/shared';
import type { AuthenticatedRequestUser } from '../auth/auth.types';
import { RequireAnyPermissions } from '../auth/decorators/require-any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreatePriceLevelDto } from './dto/create-price-level.dto';
import { UpdateCustomerPriceLevelDto } from './dto/update-customer-price-level.dto';
import { UpdatePriceLevelDto } from './dto/update-price-level.dto';
import { UpdateProductPricesDto } from './dto/update-product-prices.dto';
import { PricingService } from './pricing.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

@Controller('pricing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('levels')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
  )
  levels(
    @Req() request: AuthenticatedRequest,
  ): Promise<PriceLevelResponse[]> {
    return this.pricingService.levels(request.user.companyId);
  }

  @Post('levels')
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  createLevel(
    @Body() dto: CreatePriceLevelDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PriceLevelResponse> {
    return this.pricingService.createLevel(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      ipAddress: request.ip ?? null,
    });
  }

  @Patch('levels/:id')
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  updateLevel(
    @Param('id') id: string,
    @Body() dto: UpdatePriceLevelDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PriceLevelResponse> {
    return this.pricingService.updateLevel(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      ipAddress: request.ip ?? null,
    });
  }

  @Get('products/:productId')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
  )
  productPricing(
    @Param('productId') productId: string,
    @Query('pointOfSaleId') pointOfSaleId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductPricingResponse> {
    return this.pricingService.productPricing(
      productId,
      pointOfSaleId,
      request.user,
    );
  }

  @Put('products/:productId')
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  updateProductPricing(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductPricesDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductPricingResponse> {
    return this.pricingService.updateProductPricing(productId, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @Patch('customers/:customerId/price-level')
  @RequireAnyPermissions(ERP_PERMISSIONS.customerManage)
  updateCustomerPriceLevel(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerPriceLevelDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CustomerPriceLevelAssignmentResponse> {
    return this.pricingService.updateCustomerPriceLevel(
      customerId,
      dto.priceLevelId,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @Get('customers')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
  )
  customerLevels(
    @Req() request: AuthenticatedRequest,
  ): Promise<CustomerPriceLevelSummaryResponse[]> {
    return this.pricingService.customerLevels(request.user.companyId);
  }
}

