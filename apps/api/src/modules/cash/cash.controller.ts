import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { ERP_PERMISSIONS } from "@cactus/shared";
import type {
  CashCloseReportResponse,
  CashRegisterSummaryResponse,
  CashSessionResponse,
} from "@cactus/shared";

import type { AuthenticatedRequestUser } from "../auth/auth.types";

import { RequireAnyPermissions } from "../auth/decorators/require-any-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";

import { CashService } from "./cash.service";
import { CloseCashSessionDto } from "./dto/close-cash-session.dto";
import { CreateCashMovementDto } from "./dto/create-cash-movement.dto";
import { OpenCashSessionDto } from "./dto/open-cash-session.dto";
import { RegisterCashPrintDto } from "./dto/register-cash-print.dto";

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

type CashAuditActor = {
  userId: string;
  companyId: string;
  username: string;
  branchAccessMode: "ALL" | "ASSIGNED";
  branchIds: string[];
  ipAddress: string | null;
};

function auditActor(
  request: AuthenticatedRequest,
): CashAuditActor {
  return {
    userId: request.user.id,
    companyId: request.user.companyId,
    username: request.user.username,
    branchAccessMode:
      request.user.branchAccessMode,
    branchIds:
      request.user.branchIds,
    ipAddress: request.ip ?? null,
  };
}

@Controller("cash")
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class CashController {
  constructor(
    private readonly cashService: CashService,
  ) {}

  @Get("registers")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.cashView,
    ERP_PERMISSIONS.cashSessionOperate,
    ERP_PERMISSIONS.cashManage,
  )
  registers(
    @Req() request: AuthenticatedRequest,
  ): Promise<CashRegisterSummaryResponse[]> {
    return this.cashService.registers(
      request.user,
    );
  }

  @Get("sessions/:id")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.cashView,
    ERP_PERMISSIONS.cashSessionOperate,
    ERP_PERMISSIONS.cashManage,
  )
  session(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CashSessionResponse> {
    return this.cashService.session(
      id,
      request.user,
    );
  }

  @Post("sessions/open")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.cashSessionOperate,
    ERP_PERMISSIONS.cashManage,
  )
  open(
    @Body() dto: OpenCashSessionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CashSessionResponse> {
    return this.cashService.open(
      dto,
      auditActor(request),
    );
  }

  @Post("sessions/:id/movements")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.cashSessionOperate,
    ERP_PERMISSIONS.cashManage,
  )
  addMovement(
    @Param("id") id: string,
    @Body() dto: CreateCashMovementDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CashSessionResponse> {
    return this.cashService.addMovement(
      id,
      dto,
      auditActor(request),
    );
  }

  @Get("sessions/:id/report")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.cashView,
    ERP_PERMISSIONS.cashSessionOperate,
    ERP_PERMISSIONS.cashManage,
  )
  report(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CashCloseReportResponse> {
    return this.cashService.report(
      id,
      request.user,
    );
  }

  @Post("sessions/:id/print-log")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.cashReprint,
    ERP_PERMISSIONS.cashSessionOperate,
    ERP_PERMISSIONS.cashManage,
  )
  registerPrint(
    @Param("id") id: string,
    @Body() dto: RegisterCashPrintDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    return this.cashService.registerPrint(
      id,
      dto,
      auditActor(request),
    );
  }

  @Post("sessions/:id/close")
  @RequireAnyPermissions(
    ERP_PERMISSIONS.cashSessionOperate,
    ERP_PERMISSIONS.cashManage,
  )
  close(
    @Param("id") id: string,
    @Body() dto: CloseCashSessionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CashSessionResponse> {
    return this.cashService.close(
      id,
      dto,
      auditActor(request),
    );
  }
}