import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ERP_PERMISSIONS, POS_REPORTING_PERMISSIONS } from "@cactus/shared";
import type {
  BranchModuleResponse,
  BusinessModuleType,
  CashRegisterResponse,
  CompanyModuleResponse,
  CreatePosMovementResponse,
  InventoryMovementResponse,
  InventoryKardexEntryResponse,
  InventoryTransferResponse,
  InventoryOverviewProductResponse,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PosAccountResponse,
  PosCapabilityResponse,
  PosCapabilityType,
  PreparationStationResponse,
  ProductCategoryResponse,
  ProductResponse,
  PosFinancialConfigurationResponse,
  PosDailySalesReportResponse,
  PosSalesTransactionsReportResponse,
  PosIssuedSalesDocumentDetailResponse,
  PosIssuedSalesDocumentListResponse,
  PosIssuedSalesDocumentSource,
  PosIssuedSalesDocumentVoidResponse,
  PosSalesComparisonResponse,
  PosSalesTrendResponse,
  PosProfitabilityReportResponse,
  PosProfitabilityTrendResponse,
  PosProfitabilityPolicyResponse,
  PosProfitabilityEvaluationResponse,
  PosOperationalProfitabilityReportResponse,
  PosProfitabilityByPointReportResponse,
} from "@cactus/shared";
import { diskStorage } from "multer";
import { extname } from "node:path";
import type { Express } from "express";

import { AddPosAccountItemsDto } from "./dto/add-pos-account-items.dto";
import { CreateDirectPosPaymentDto } from "./dto/create-direct-pos-payment.dto";
import type { AuthenticatedRequestUser } from "../auth/auth.types";
import { CreateInventoryMovementDto } from "./dto/create-inventory-movement.dto";
import { CreateInventoryTransferDto } from "./dto/create-inventory-transfer.dto";
import { CreatePosMovementDto } from "./dto/create-pos-movement.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { CreatePreparationStationDto } from "./dto/create-preparation-station.dto";
import { UpdatePreparationStationDto } from "./dto/update-preparation-station.dto";
import { OpenPosAccountDto } from "./dto/open-pos-account.dto";
import { PayPosAccountDto } from "./dto/pay-pos-account.dto";
import { SendToKitchenDto } from "./dto/send-to-kitchen.dto";
import { UpdateKitchenTicketStatusDto } from "./dto/update-kitchen-ticket-status.dto";
import { UpdateKitchenTicketItemStatusDto } from "./dto/update-kitchen-ticket-item-status.dto";
import { CancelKitchenTicketItemDto } from "./dto/cancel-kitchen-ticket-item.dto";
import { CancelKitchenTicketDto } from "./dto/cancel-kitchen-ticket.dto";
import { UpdatePosAccountDto } from "./dto/update-pos-account.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { UpdateBusinessModuleDto } from "./dto/update-business-module.dto";
import { UpdatePosCapabilityDto } from "./dto/update-pos-capability.dto";
import { UpdatePosFinancialConfigurationDto } from "./dto/update-pos-financial-configuration.dto";
import { UpdatePosProfitabilityPolicyDto } from "./dto/update-pos-profitability-policy.dto";
import { AssignProductToPointDto } from "./dto/assign-product-to-point.dto";
import { BulkAssignProductsToPointDto } from "./dto/bulk-assign-products-to-point.dto";
import type {
  KitchenHistoryResponse,
  KitchenMetricsResponse,
  KitchenTicketResponse,
  KitchenTicketStatusValue,
} from "./kitchen-ticket.types";
import { VoidIssuedSalesDocumentDto } from "./dto/void-issued-sales-document.dto";
import { PosService } from "./pos.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireAnyPermissions } from "../auth/decorators/require-any-permissions.decorator";

type PosAuthenticatedRequest = {
  user: AuthenticatedRequestUser;
  ip?: string;
};

@Controller("pos")
export class PosController {
  constructor(private readonly posService: PosService) {}

  @UseGuards(JwtAuthGuard)
  @Get("company-modules")
  companyModules(
    @Req() request: PosAuthenticatedRequest,
  ): Promise<CompanyModuleResponse[]> {
    return this.posService.companyModules(request.user.companyId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.businessConfigurationManage,
  )
  @Patch("company-modules/:module")
  updateCompanyModule(
    @Param("module") module: BusinessModuleType,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdateBusinessModuleDto,
  ): Promise<CompanyModuleResponse> {
    return this.posService.updateCompanyModule(
      request.user.companyId,
      module,
      dto.enabled,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        username: request.user.username,
        ipAddress: request.ip ?? null,
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("branch-modules")
  branchModules(
    @Req() request: PosAuthenticatedRequest,
    @Query("branchId") branchId?: string,
  ): Promise<BranchModuleResponse[]> {
    return this.posService.branchModules(request.user.companyId, branchId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.businessConfigurationManage,
  )
  @Patch("branch-modules/:module")
  updateBranchModule(
    @Param("module") module: BusinessModuleType,
    @Query("branchId") branchId: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdateBusinessModuleDto,
  ): Promise<BranchModuleResponse> {
    return this.posService.updateBranchModule(branchId, module, dto.enabled, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.businessConfigurationView,
    ERP_PERMISSIONS.businessConfigurationManage,
  )
  @Get("points/:id/capabilities")
  posCapabilities(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PosCapabilityResponse[]> {
    return this.posService.posCapabilities(id, request.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.businessConfigurationManage,
  )
  @Patch("points/:id/capabilities/:capability")
  updatePosCapability(
    @Param("id") id: string,
    @Param("capability") capability: PosCapabilityType,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdatePosCapabilityDto,
  ): Promise<PosCapabilityResponse> {
    return this.posService.updatePosCapability(id, capability, dto.enabled, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      permissions: request.user.permissions,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("points/:id/financial-configuration")
  posFinancialConfiguration(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PosFinancialConfigurationResponse> {
    return this.posService.posFinancialConfiguration(
      id,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.businessConfigurationManage,
  )
  @Patch("points/:id/financial-configuration")
  updatePosFinancialConfiguration(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdatePosFinancialConfigurationDto,
  ): Promise<PosFinancialConfigurationResponse> {
    return this.posService.updatePosFinancialConfiguration(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewProfitability,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("points/:id/profitability-policy")
  posProfitabilityPolicy(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PosProfitabilityPolicyResponse> {
    return this.posService.posProfitabilityPolicy(id, request.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(POS_REPORTING_PERMISSIONS.manageProfitabilityPolicy)
  @Patch("points/:id/profitability-policy")
  updatePosProfitabilityPolicy(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdatePosProfitabilityPolicyDto,
  ): Promise<PosProfitabilityPolicyResponse> {
    return this.posService.updatePosProfitabilityPolicy(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.catalogView,
    ERP_PERMISSIONS.catalogManage,
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
    ERP_PERMISSIONS.inventoryView,
    ERP_PERMISSIONS.inventoryManage,
    ERP_PERMISSIONS.companyView,
    ERP_PERMISSIONS.companyManage,
    ERP_PERMISSIONS.businessConfigurationView,
    ERP_PERMISSIONS.businessConfigurationManage,
    ERP_PERMISSIONS.posKitchenView,
    ERP_PERMISSIONS.posKitchenManage,
    POS_REPORTING_PERMISSIONS.viewSalesReport,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
    POS_REPORTING_PERMISSIONS.viewProfitability,
    POS_REPORTING_PERMISSIONS.viewOperationalProfitability,
    POS_REPORTING_PERMISSIONS.comparePoints,
  )
  @Get("points")
  points(
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PointOfSaleResponse[]> {
    return this.posService.points(request.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.comparePoints,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/profitability-by-point")
  profitabilityByPoint(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleIds") pointOfSaleIds: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosProfitabilityByPointReportResponse> {
    return this.posService.profitabilityByPoint(
      pointOfSaleIds,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewOperationalProfitability,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/operational-profitability")
  operationalProfitability(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosOperationalProfitabilityReportResponse> {
    return this.posService.operationalProfitability(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewProfitability,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/profitability-evaluation")
  profitabilityEvaluation(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosProfitabilityEvaluationResponse> {
    return this.posService.profitabilityEvaluation(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewProfitability,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/profitability-trend")
  profitabilityTrend(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosProfitabilityTrendResponse> {
    return this.posService.profitabilityTrend(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewProfitability,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/profitability")
  profitabilityReport(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosProfitabilityReportResponse> {
    return this.posService.profitabilityReport(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(POS_REPORTING_PERMISSIONS.viewSalesReport)
  @Get("reports/daily-sales")
  dailySalesReport(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosDailySalesReportResponse> {
    return this.posService.dailySalesReport(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewSalesReport,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/sales-trend")
  salesTrend(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosSalesTrendResponse> {
    return this.posService.salesTrend(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewSalesReport,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/sales-comparison")
  salesComparison(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosSalesComparisonResponse> {
    return this.posService.salesComparison(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    POS_REPORTING_PERMISSIONS.viewSalesReport,
    POS_REPORTING_PERMISSIONS.viewExecutiveDashboard,
  )
  @Get("reports/sales-transactions")
  salesTransactionsReport(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ): Promise<PosSalesTransactionsReportResponse> {
    return this.posService.salesTransactionsReport(
      pointOfSaleId,
      request.user,
      dateFrom,
      dateTo,
    );
  }

  

  @Get("payment-methods")
  paymentMethods(): Promise<PaymentMethodResponse[]> {
    return this.posService.paymentMethods();
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.cashView,
    ERP_PERMISSIONS.cashManage,
  )
  @Get("cash-registers")
  cashRegisters(
    @Req()
    request: PosAuthenticatedRequest,
    @Query("pointOfSaleId")
    pointOfSaleId?: string,
  ): Promise<CashRegisterResponse[]> {
    return this.posService.cashRegisters(
      request.user.companyId,
      pointOfSaleId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.catalogView,
    ERP_PERMISSIONS.catalogManage,
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
    ERP_PERMISSIONS.posKitchenView,
    ERP_PERMISSIONS.posKitchenManage,
  )
  @Get("preparation-stations")
  preparationStations(
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PreparationStationResponse[]> {
    return this.posService.preparationStations(
      pointOfSaleId,
      request.user.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.catalogManage,
    ERP_PERMISSIONS.productManage,
    ERP_PERMISSIONS.posKitchenManage,
  )
  @Post("preparation-stations")
  createPreparationStation(
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CreatePreparationStationDto,
  ): Promise<PreparationStationResponse> {
    return this.posService.createPreparationStation(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.catalogManage,
    ERP_PERMISSIONS.productManage,
    ERP_PERMISSIONS.posKitchenManage,
  )
  @Patch("preparation-stations/:id")
  updatePreparationStation(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdatePreparationStationDto,
  ): Promise<PreparationStationResponse> {
    return this.posService.updatePreparationStation(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.catalogView,
    ERP_PERMISSIONS.catalogManage,
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
  )
  @Get("categories")
  categories(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId?: string,
  ): Promise<ProductCategoryResponse[]> {
    return this.posService.categories(request.user, pointOfSaleId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
    ERP_PERMISSIONS.catalogView,
    ERP_PERMISSIONS.catalogManage,
  )
  @Get("products")
  products(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId?: string,
    @Query("categoryId") categoryId?: string,
  ): Promise<ProductResponse[]> {
    return this.posService.products(
      request.user,
      pointOfSaleId,
      categoryId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
  )
  @Get("admin/catalog-products")
  catalogProducts(
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<ProductResponse[]> {
    return this.posService.catalogProducts(
      pointOfSaleId,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
    ERP_PERMISSIONS.catalogView,
    ERP_PERMISSIONS.catalogManage,
  )
  @Get("admin/products")
  adminProducts(
    @Query("pointOfSaleId")
    pointOfSaleId: string,

    @Req()
    request: PosAuthenticatedRequest,
  ): Promise<ProductResponse[]> {
    return this.posService.adminProducts(
      pointOfSaleId,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  @Post("products/:id/image")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: "./uploads/products",
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();

          const filename = `${Date.now()}-${Math.round(
            Math.random() * 1_000_000_000,
          )}${extension}`;

          callback(null, filename);
        },
      }),
      fileFilter: (_request, file, callback) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.mimetype)) {
          callback(
            new Error("Formato de imagen no permitido. Usa JPG, PNG o WEBP."),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadProductImage(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProductResponse> {
    return this.posService.updateProductImage(id, file, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.inventoryView,
    ERP_PERMISSIONS.inventoryManage,
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
  )
  @Get("products/:id/inventory-movements")
  inventoryMovements(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId?: string,
  ): Promise<InventoryMovementResponse[]> {
    return this.posService.inventoryMovements(
      id,
      request.user,
      pointOfSaleId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.inventoryView,
    ERP_PERMISSIONS.inventoryManage,
  )
  @Get("inventory/overview")
  inventoryOverview(
    @Req() request: PosAuthenticatedRequest,
  ): Promise<InventoryOverviewProductResponse[]> {
    return this.posService.inventoryOverview(request.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.inventoryView,
    ERP_PERMISSIONS.inventoryManage,
  )
  @Get("inventory/kardex")
  inventoryKardex(
    @Req() request: PosAuthenticatedRequest,
    @Query("branchId") branchId?: string,
    @Query("productId") productId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<InventoryKardexEntryResponse[]> {
    return this.posService.inventoryKardex(request.user, {
      branchId,
      productId,
      from,
      to,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryManage)
  @Post("inventory/transfers")
  transferInventory(
    @Body() dto: CreateInventoryTransferDto,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<InventoryTransferResponse> {
    return this.posService.transferInventory(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      permissions: request.user.permissions,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.inventoryManage)
  @Post("products/:id/inventory-movements")
  createInventoryMovement(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CreateInventoryMovementDto,
  ): Promise<InventoryMovementResponse> {
    return this.posService.createInventoryMovement(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.catalogView,
    ERP_PERMISSIONS.catalogManage,
  )
  @Get("admin/categories")
  adminCategories(
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<ProductCategoryResponse[]> {
    return this.posService.adminCategories(
      pointOfSaleId,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.catalogManage)
  @Post("admin/categories")
  createProductCategory(
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return this.posService.createProductCategory(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.catalogManage)
  @Patch("admin/categories/:id")
  updateProductCategory(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return this.posService.updateProductCategory(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  @Post("products/bulk-assign")
  bulkAssignProductsToPoint(
    @Body() dto: BulkAssignProductsToPointDto,
    @Req() request: PosAuthenticatedRequest,
  ) {
    return this.posService.bulkAssignProductsToPoint(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      permissions: request.user.permissions,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  @Post("products/:id/assign")
  assignProductToPoint(
    @Param("id") id: string,
    @Body() dto: AssignProductToPointDto,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<ProductResponse> {
    return this.posService.assignProductToPoint(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      permissions: request.user.permissions,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  @Post("products")
  createProduct(
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponse> {
    return this.posService.createProduct(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.productManage)
  @Patch("products/:id")
  updateProduct(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    return this.posService.updateProduct(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.productView,
    ERP_PERMISSIONS.productManage,
  )
  @Get("admin/products/:id")
  adminProduct(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId?: string,
  ): Promise<ProductResponse> {
    return this.posService.adminProduct(
      id,
      request.user,
      pointOfSaleId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.posHoldManage,
  )
  @Get("accounts")
  accounts(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId?: string,
  ): Promise<PosAccountResponse[]> {
    return this.posService.accounts(
      {
        companyId: request.user.companyId,
        branchAccessMode: request.user.branchAccessMode,
        branchIds: request.user.branchIds,
      },
      pointOfSaleId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posOperate)
  @Post("accounts")
  openAccount(
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: OpenPosAccountDto,
  ): Promise<PosAccountResponse> {
    return this.posService.openAccount(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posOperate,
    ERP_PERMISSIONS.posHoldManage,
  )
  @Patch("accounts/:id")
  updateAccount(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdatePosAccountDto,
  ): Promise<PosAccountResponse> {
    return this.posService.updateAccount(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posOperate)
  @Post("accounts/:id/items")
  addAccountItems(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: AddPosAccountItemsDto,
  ): Promise<PosAccountResponse> {
    return this.posService.addAccountItems(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      permissions: request.user.permissions,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posOperate)
  @Post("accounts/:id/pay")
  payAccount(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: PayPosAccountDto,
  ): Promise<PosAccountResponse> {
    return this.posService.payAccount(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posKitchenManage)
  @Post("accounts/:id/kitchen-tickets")
  sendToKitchen(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: SendToKitchenDto,
  ): Promise<KitchenTicketResponse[]> {
    return this.posService.sendToKitchen(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posKitchenView,
    ERP_PERMISSIONS.posKitchenManage,
  )
  @Get("kitchen-history")
  kitchenHistory(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("preparationStationId") preparationStationId?: string,
  ): Promise<KitchenHistoryResponse> {
    return this.posService.kitchenHistory(
      pointOfSaleId,
      dateFrom,
      dateTo,
      preparationStationId,
      request.user.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posKitchenView,
    ERP_PERMISSIONS.posKitchenManage,
  )
  @Get("kitchen-metrics")
  kitchenMetrics(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("preparationStationId") preparationStationId?: string,
  ): Promise<KitchenMetricsResponse> {
    return this.posService.kitchenMetrics(
      pointOfSaleId,
      preparationStationId,
      request.user.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(
    ERP_PERMISSIONS.posKitchenView,
    ERP_PERMISSIONS.posKitchenManage,
  )
  @Get("kitchen-tickets")
  kitchenTickets(
    @Req() request: PosAuthenticatedRequest,
    @Query("pointOfSaleId") pointOfSaleId: string,
    @Query("status") status?: KitchenTicketStatusValue,
    @Query("accountId") accountId?: string,
    @Query("preparationStationId") preparationStationId?: string,
  ): Promise<KitchenTicketResponse[]> {
    return this.posService.kitchenTickets(
      pointOfSaleId,
      status,
      accountId,
      preparationStationId,
      request.user.companyId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posKitchenManage)
  @Post("kitchen-ticket-items/:id/cancel")
  cancelKitchenTicketItem(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CancelKitchenTicketItemDto,
  ): Promise<KitchenTicketResponse> {
    return this.posService.cancelKitchenTicketItem(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posKitchenManage)
  @Post("kitchen-tickets/:id/cancel")
  cancelKitchenTicket(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CancelKitchenTicketDto,
  ): Promise<KitchenTicketResponse> {
    return this.posService.cancelKitchenTicket(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posKitchenManage)
  @Patch("kitchen-ticket-items/:id/status")
  updateKitchenTicketItemStatus(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdateKitchenTicketItemStatusDto,
  ): Promise<KitchenTicketResponse> {
    return this.posService.updateKitchenTicketItemStatus(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posKitchenManage)
  @Patch("kitchen-tickets/:id/status")
  updateKitchenTicketStatus(
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: UpdateKitchenTicketStatusDto,
  ): Promise<KitchenTicketResponse> {
    return this.posService.updateKitchenTicketStatus(id, dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
    });
  }



  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posOperate)
  @Post("direct-payments")
  directPayment(
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CreateDirectPosPaymentDto,
  ): Promise<CreatePosMovementResponse> {
    return this.posService.directPayment(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      permissions: request.user.permissions,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posOperate)
  @Post("movements")
  createMovement(
    @Req() request: PosAuthenticatedRequest,
    @Body() dto: CreatePosMovementDto,
  ): Promise<CreatePosMovementResponse> {
    return this.posService.createMovement(dto, {
      userId: request.user.id,
      companyId: request.user.companyId,
      username: request.user.username,
      ipAddress: request.ip ?? null,
      branchAccessMode: request.user.branchAccessMode,
      branchIds: request.user.branchIds,
      permissions: request.user.permissions,
    });
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(POS_REPORTING_PERMISSIONS.viewSalesReport)
  @Get("issued-sales-documents")
  issuedSalesDocuments(
    @Query("dateFrom") dateFrom: string | undefined,
    @Query("dateTo") dateTo: string | undefined,
    @Query("pointOfSaleId") pointOfSaleId: string | undefined,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PosIssuedSalesDocumentListResponse> {
    return this.posService.issuedSalesDocuments(
      request.user,
      dateFrom,
      dateTo,
      pointOfSaleId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(POS_REPORTING_PERMISSIONS.viewSalesReport)
  @Get("issued-sales-documents/:source/:id")
  issuedSalesDocument(
    @Param("source") source: PosIssuedSalesDocumentSource,
    @Param("id") id: string,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PosIssuedSalesDocumentDetailResponse> {
    return this.posService.issuedSalesDocument(
      source,
      id,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAnyPermissions(ERP_PERMISSIONS.posSaleVoid)
  @Post("issued-sales-documents/:source/:id/void")
  voidIssuedSalesDocument(
    @Param("source") source: PosIssuedSalesDocumentSource,
    @Param("id") id: string,
    @Body() dto: VoidIssuedSalesDocumentDto,
    @Req() request: PosAuthenticatedRequest,
  ): Promise<PosIssuedSalesDocumentVoidResponse> {
    return this.posService.voidIssuedSalesDocument(
      source,
      id,
      dto.reason,
      {
        userId: request.user.id,
        companyId: request.user.companyId,
        username: request.user.username,
        branchAccessMode: request.user.branchAccessMode,
        branchIds: request.user.branchIds,
        permissions: request.user.permissions,
        ipAddress: request.ip ?? null,
      },
    );
  }

}
