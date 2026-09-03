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

import type { Request } from 'express';

import {
  ERP_PERMISSIONS,
} from '@cactus/shared';

import type {
  AccountsPayableReportResponse,
  AccountsPayableSummaryResponse,
  PurchaseOrderReceiptResponse,
  PurchaseOrderResponse,
  SupplierInvoiceResponse,
  SupplierPaymentResponse,
  SupplierResponse,
} from '@cactus/shared';

import type {
  AuthenticatedRequestUser,
} from '../auth/auth.types';

import {
  RequireAnyPermissions,
} from '../auth/decorators/require-any-permissions.decorator';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard';

import {
  CreatePurchaseOrderDto,
} from './dto/create-purchase-order.dto';

import {
  CreateSupplierInvoiceDto,
} from './dto/create-supplier-invoice.dto';

import {
  CreateSupplierPaymentDto,
} from './dto/create-supplier-payment.dto';

import {
  CreateSupplierDto,
} from './dto/create-supplier.dto';

import {
  ReceivePurchaseOrderDto,
} from './dto/receive-purchase-order.dto';

import {
  UpdateSupplierDto,
} from './dto/update-supplier.dto';

import {
  PurchasesService,
} from './purchases.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

type PurchaseAuditActor = {
  userId: string;
  username: string;
  ipAddress: string | null;
};

function auditActor(
  request: AuthenticatedRequest,
): PurchaseAuditActor {
  return {
    userId: request.user.id,
    username: request.user.username,
    ipAddress: request.ip ?? null,
  };
}

@Controller('purchases')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class PurchasesController {
  constructor(
    private readonly purchasesService:
      PurchasesService,
  ) {}

  /* =======================================================
     ACCOUNTS PAYABLE
     ======================================================= */

  @Get('accounts-payable/report')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.accountsPayableView,
    ERP_PERMISSIONS.accountsPayableManage,
  )
  accountsPayableReport(
    @Req()
    request: AuthenticatedRequest,

    @Query('branchId')
    branchId?: string,

    @Query('dateFrom')
    dateFrom?: string,

    @Query('dateTo')
    dateTo?: string,

    @Query('supplierId')
    supplierId?: string,
  ): Promise<AccountsPayableReportResponse> {
    return this.purchasesService
      .accountsPayableReport(
        request.user.companyId,
        branchId,
        dateFrom,
        dateTo,
        supplierId,
      );
  }

  @Get('accounts-payable/summary')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.accountsPayableView,
    ERP_PERMISSIONS.accountsPayableManage,
  )
  accountsPayableSummary(
    @Req()
    request: AuthenticatedRequest,

    @Query('branchId')
    branchId?: string,
  ): Promise<AccountsPayableSummaryResponse> {
    return this.purchasesService
      .accountsPayableSummary(
        request.user.companyId,
        branchId,
      );
  }

  /* =======================================================
     SUPPLIER PAYMENTS
     ======================================================= */

  @Get('supplier-payments')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.accountsPayableView,
    ERP_PERMISSIONS.accountsPayableManage,
  )
  supplierPayments(
    @Req()
    request: AuthenticatedRequest,

    @Query('branchId')
    branchId?: string,

    @Query('supplierId')
    supplierId?: string,
  ): Promise<SupplierPaymentResponse[]> {
    return this.purchasesService
      .supplierPayments(
        request.user.companyId,
        branchId,
        supplierId,
      );
  }

  @Post('supplier-payments')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.accountsPayableManage,
  )
  createSupplierPayment(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponse> {
    return this.purchasesService
      .createSupplierPayment(
        dto,
        request.user.companyId,
        auditActor(request),
      );
  }

  /* =======================================================
     SUPPLIERS
     ======================================================= */

  @Get('suppliers')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.supplierView,
    ERP_PERMISSIONS.supplierManage,
  )
  suppliers(
    @Req()
    request: AuthenticatedRequest,
  ): Promise<SupplierResponse[]> {
    return this.purchasesService
      .suppliers(request.user.companyId);
  }

  @Get('suppliers/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.supplierView,
    ERP_PERMISSIONS.supplierManage,
  )
  supplier(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<SupplierResponse> {
    return this.purchasesService
      .supplier(
        id,
        request.user.companyId,
      );
  }

  @Post('suppliers')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.supplierManage,
  )
  createSupplier(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreateSupplierDto,
  ): Promise<SupplierResponse> {
    return this.purchasesService
      .createSupplier(
        dto,
        request.user.companyId,
        auditActor(request),
      );
  }

  @Patch('suppliers/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.supplierManage,
  )
  updateSupplier(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: UpdateSupplierDto,
  ): Promise<SupplierResponse> {
    return this.purchasesService
      .updateSupplier(
        id,
        dto,
        request.user.companyId,
        auditActor(request),
      );
  }

  /* =======================================================
     PURCHASE ORDERS
     ======================================================= */

  @Get('orders')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.purchaseView,
    ERP_PERMISSIONS.purchaseManage,
  )
  purchaseOrders(
    @Req()
    request: AuthenticatedRequest,

    @Query('branchId')
    branchId?: string,
  ): Promise<PurchaseOrderResponse[]> {
    return this.purchasesService
      .purchaseOrders(
        request.user.companyId,
        branchId,
      );
  }

  @Get('orders/:id/receipts')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.purchaseView,
    ERP_PERMISSIONS.purchaseManage,
  )
  purchaseOrderReceipts(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<PurchaseOrderReceiptResponse[]> {
    return this.purchasesService
      .purchaseOrderReceipts(
        id,
        request.user.companyId,
      );
  }

  @Get('orders/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.purchaseView,
    ERP_PERMISSIONS.purchaseManage,
  )
  purchaseOrder(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<PurchaseOrderResponse> {
    return this.purchasesService
      .purchaseOrder(
        id,
        request.user.companyId,
      );
  }

  @Post('orders')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.purchaseManage,
  )
  createPurchaseOrder(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    return this.purchasesService
      .createPurchaseOrder(
        dto,
        request.user.companyId,
        auditActor(request),
      );
  }

  @Post('orders/:id/receive')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.purchaseManage,
  )
  receivePurchaseOrder(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    return this.purchasesService
      .receivePurchaseOrder(
        id,
        dto,
        request.user.companyId,
        auditActor(request),
      );
  }

  @Post('orders/:id/cancel')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.purchaseManage,
  )
  cancelPurchaseOrder(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<PurchaseOrderResponse> {
    return this.purchasesService
      .cancelPurchaseOrder(
        id,
        request.user.companyId,
        auditActor(request),
      );
  }

  /* =======================================================
     SUPPLIER INVOICES
     ======================================================= */

  @Get('supplier-invoices')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.accountsPayableView,
    ERP_PERMISSIONS.accountsPayableManage,
  )
  supplierInvoices(
    @Req()
    request: AuthenticatedRequest,

    @Query('branchId')
    branchId?: string,

    @Query('supplierId')
    supplierId?: string,
  ): Promise<SupplierInvoiceResponse[]> {
    return this.purchasesService
      .supplierInvoices(
        request.user.companyId,
        branchId,
        supplierId,
      );
  }

  @Get('supplier-invoices/:id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.accountsPayableView,
    ERP_PERMISSIONS.accountsPayableManage,
  )
  supplierInvoice(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<SupplierInvoiceResponse> {
    return this.purchasesService
      .supplierInvoice(
        id,
        request.user.companyId,
      );
  }

  @Post('supplier-invoices')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.accountsPayableManage,
  )
  createSupplierInvoice(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreateSupplierInvoiceDto,
  ): Promise<SupplierInvoiceResponse> {
    return this.purchasesService
      .createSupplierInvoice(
        dto,
        request.user.companyId,
        auditActor(request),
      );
  }
}
