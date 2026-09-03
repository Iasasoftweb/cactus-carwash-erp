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
} from "@nestjs/common";
import type { Request } from "express";
import { ERP_PERMISSIONS } from "@cactus/shared";
import type {
  CustomerCollectionActivityResponse,
  CustomerCollectionFollowUpsResponse,
  CustomerInvoiceDetailResponse,
  CustomerInvoiceResponse,
  CustomerReceivableAgingResponse,
  CustomerResponse,
  CustomerVehicleResponse,
  ResolveCustomerCollectionFollowUpResponse,
} from "@cactus/shared";

import type { AuthenticatedRequestUser } from "../auth/auth.types";
import { RequireAnyPermissions } from "../auth/decorators/require-any-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CustomersService } from "./customers.service";
import { CreateCustomerCollectionActivityDto } from "./dto/create-customer-collection-activity.dto";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { CreateCustomerVehicleDto } from "./dto/create-customer-vehicle.dto";
import { IssueCustomerCreditNoteDto } from "./dto/issue-customer-credit-note.dto";
import { PayCustomerInvoiceDto } from "./dto/pay-customer-invoice.dto";
import { ResolveCustomerCollectionFollowUpDto } from "./dto/resolve-customer-collection-follow-up.dto";
import { UpdateCustomerCreditDto } from "./dto/update-customer-credit.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

function auditActor(request: AuthenticatedRequest) {
  return {
    userId: request.user.id,
    companyId: request.user.companyId,
    username: request.user.username,
    branchAccessMode: request.user.branchAccessMode,
    branchIds: request.user.branchIds,
    ipAddress: request.ip ?? null,
  };
}

@Controller("customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get("receivables/follow-ups")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  collectionFollowUps(
    @Req() request: AuthenticatedRequest,
  ): Promise<CustomerCollectionFollowUpsResponse> {
    return this.customersService.collectionFollowUps(request.user.companyId);
  }

  @Get("receivables/aging")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  receivablesAging(
    @Req() request: AuthenticatedRequest,
  ): Promise<CustomerReceivableAgingResponse> {
    return this.customersService.receivablesAging(request.user);
  }

  @Get(":id/collection-activities")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  collectionActivities(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<CustomerCollectionActivityResponse[]> {
    return this.customersService.collectionActivities(
      request.user.companyId,
      id,
    );
  }

  @Post(":id/collection-activities")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerCreditManage)
  createCollectionActivity(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CreateCustomerCollectionActivityDto,
  ): Promise<CustomerCollectionActivityResponse> {
    return this.customersService.createCollectionActivity(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }

  @Get()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  list(
    @Req() request: AuthenticatedRequest,
    @Query("search") search?: string,
  ): Promise<CustomerResponse[]> {
    return this.customersService.list(request.user.companyId, search);
  }

  @Get(":id")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  get(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<CustomerResponse> {
    return this.customersService.get(request.user.companyId, id);
  }

  @Post()
  @RequireAnyPermissions(ERP_PERMISSIONS.customerManage)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerResponse> {
    return this.customersService.create(
      request.user.companyId,
      dto,
      auditActor(request),
    );
  }

  @Patch(":id")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerManage)
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerResponse> {
    return this.customersService.update(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }

  @Patch(":customerId/collection-activities/:activityId/resolve")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerCreditManage)
  resolveCollectionFollowUp(
    @Req() request: AuthenticatedRequest,
    @Param("customerId") customerId: string,
    @Param("activityId") activityId: string,
    @Body() dto: ResolveCustomerCollectionFollowUpDto,
  ): Promise<ResolveCustomerCollectionFollowUpResponse> {
    return this.customersService.resolveCollectionFollowUp(
      request.user.companyId,
      customerId,
      activityId,
      dto,
      auditActor(request),
    );
  }

  @Patch(":id/credit")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerCreditManage)
  updateCredit(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerCreditDto,
  ): Promise<CustomerResponse> {
    return this.customersService.updateCredit(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }

  @Get(":id/vehicles")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  vehicles(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<CustomerVehicleResponse[]> {
    return this.customersService.vehicles(request.user.companyId, id);
  }

  @Post(":id/vehicles")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerManage)
  createVehicle(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CreateCustomerVehicleDto,
  ): Promise<CustomerVehicleResponse> {
    return this.customersService.createVehicle(
      request.user.companyId,
      id,
      dto,
      auditActor(request),
    );
  }

  @Get(":customerId/invoices")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  invoices(
    @Param("customerId") customerId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CustomerInvoiceResponse[]> {
    return this.customersService.invoices(request.user, customerId);
  }

  @Get(":customerId/invoices/:invoiceId")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.customerView,
    ERP_PERMISSIONS.customerManage,
    ERP_PERMISSIONS.customerCreditManage,
  )
  invoice(
    @Param("customerId") customerId: string,
    @Param("invoiceId") invoiceId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CustomerInvoiceDetailResponse> {
    return this.customersService.invoice(
      request.user,
      customerId,
      invoiceId,
    );
  }

  @Post(":customerId/invoices/:invoiceId/payments")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerCreditManage)
  payInvoice(
    @Param("customerId") customerId: string,
    @Param("invoiceId") invoiceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: PayCustomerInvoiceDto,
  ) {
    return this.customersService.payInvoice(
      customerId,
      invoiceId,
      dto,
      auditActor(request),
    );
  }

  @Post(":customerId/invoices/:invoiceId/credit-notes")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerCreditManage)
  issueCreditNote(
    @Param("customerId") customerId: string,
    @Param("invoiceId") invoiceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: IssueCustomerCreditNoteDto,
  ) {
    return this.customersService.issueCreditNote(
      customerId,
      invoiceId,
      dto,
      auditActor(request),
    );
  }

  @Post(":customerId/invoices/:invoiceId/credit-notes/:creditNoteId/cancel")
  @RequireAnyPermissions(ERP_PERMISSIONS.customerCreditManage)
  cancelCreditNote(
    @Param("customerId") customerId: string,
    @Param("invoiceId") invoiceId: string,
    @Param("creditNoteId") creditNoteId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customersService.cancelCreditNote(
      customerId,
      invoiceId,
      creditNoteId,
      auditActor(request),
    );
  }
}