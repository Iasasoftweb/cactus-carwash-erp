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

import type { Request } from 'express';

import {
  ERP_PERMISSIONS,
} from '@cactus/shared';

import type {
  AuthenticatedRequestUser,
} from '../auth/auth.types';

import type {
  AddOrderServiceResponse,
  AuthorizeOrderCreditResponse,
  CreatedOrderResponse,
  OperationalTicketResponse,
  OrderChecklistItemResponse,
  OrderDetailResponse,
  OrderListItemResponse,
  OrderNoteResponse,
  TicketPrintLogResponse,
  UpdateOrderStatusResponse,
} from '@cactus/shared';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard';

import {
  RequireAnyPermissions,
} from '../auth/decorators/require-any-permissions.decorator';

import {
  AddOrderServiceDto,
} from './dto/add-order-service.dto';

import {
  AuthorizeOrderCreditDto,
} from './dto/authorize-order-credit.dto';

import {
  CreateOrderDto,
} from './dto/create-order.dto';

import {
  CreateOrderNoteDto,
} from './dto/create-order-note.dto';

import {
  PayOrderDto,
} from './dto/pay-order.dto';

import {
  UpdateChecklistItemDto,
} from './dto/update-checklist-item.dto';

import {
  UpdateOrderStatusDto,
} from './dto/update-order-status.dto';

import {
  OrdersService,
} from './orders.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

type OrderAuditActor = {
  userId: string;
  companyId: string;
  username: string;
  branchAccessMode: 'ALL' | 'ASSIGNED';
  branchIds: string[];
  ipAddress: string | null;
};

function auditActor(
  request: AuthenticatedRequest,
): OrderAuditActor {
  return {
    userId: request.user.id,
    companyId: request.user.companyId,
    username: request.user.username,
    branchAccessMode:
      request.user.branchAccessMode,
    branchIds:
      request.user.branchIds,
    ipAddress:
      request.ip ?? null,
  };
}

@Controller('orders')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class OrdersController {
  constructor(
    private readonly ordersService:
      OrdersService,
  ) {}

  /* =======================================================
     ORDERS — READ
     ======================================================= */

  @Get()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderView,
    ERP_PERMISSIONS.orderManage,
  )
  list(
    @Req()
    request: AuthenticatedRequest,
  ): Promise<OrderListItemResponse[]> {
    return this.ordersService.list(
      auditActor(request),
    );
  }

  @Get(':id')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderView,
    ERP_PERMISSIONS.orderManage,
  )
  detail(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<OrderDetailResponse> {
    return this.ordersService.detail(
      id,
      auditActor(request),
    );
  }

  /* =======================================================
     OPERATIONAL TICKETS
     ======================================================= */

  @Get(':id/tickets')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderView,
    ERP_PERMISSIONS.orderManage,
  )
  tickets(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<OperationalTicketResponse[]> {
    return this.ordersService.tickets(
      id,
      auditActor(request),
    );
  }

  @Post(':id/tickets/:areaCode/print-log')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderManage,
  )
  registerTicketPrint(
    @Param('id')
    id: string,

    @Param('areaCode')
    areaCode: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    body: {
      reprint?: boolean;
    },
  ): Promise<TicketPrintLogResponse> {
    return this.ordersService.registerTicketPrint(
      id,
      areaCode,
      Boolean(body.reprint),
      auditActor(request),
    );
  }

  /* =======================================================
     FINANCIAL
     ======================================================= */

  @Post(':id/pay')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderFinancialManage,
  )
  pay(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: PayOrderDto,
  ) {
    return this.ordersService.pay(
      id,
      dto,
      auditActor(request),
    );
  }

  @Post(':id/credit')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderFinancialManage,
  )
  authorizeCredit(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: AuthorizeOrderCreditDto,
  ): Promise<AuthorizeOrderCreditResponse> {
    return this.ordersService.authorizeCredit(
      id,
      dto,
      auditActor(request),
    );
  }

  /* =======================================================
     ORDER CONTENT
     ======================================================= */

  @Post(':id/services')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderManage,
  )
  addService(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: AddOrderServiceDto,
  ): Promise<AddOrderServiceResponse> {
    return this.ordersService.addService(
      id,
      dto,
      auditActor(request),
    );
  }

  /* =======================================================
     ORDER CREATION
     ======================================================= */

  @Post()
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderCreate,
    ERP_PERMISSIONS.orderManage,
  )
  create(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreateOrderDto,
  ): Promise<CreatedOrderResponse> {
    return this.ordersService.create(
      dto,
      auditActor(request),
    );
  }

  /* =======================================================
     OPERATIONAL STATUS
     ======================================================= */

  @Patch(':id/status')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderManage,
  )
  updateStatus(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: UpdateOrderStatusDto,
  ): Promise<UpdateOrderStatusResponse> {
    return this.ordersService.updateStatus(
      id,
      dto.status,
      auditActor(request),
    );
  }

  /* =======================================================
     CHECKLIST
     ======================================================= */

  @Post(':id/checklist')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderManage,
  )
  updateChecklist(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: UpdateChecklistItemDto,
  ): Promise<OrderChecklistItemResponse> {
    return this.ordersService.updateChecklist(
      id,
      dto,
      auditActor(request),
    );
  }

  /* =======================================================
     NOTES
     ======================================================= */

  @Post(':id/notes')
  @RequireAnyPermissions(
    ERP_PERMISSIONS.orderManage,
  )
  addNote(
    @Param('id')
    id: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreateOrderNoteDto,
  ): Promise<OrderNoteResponse> {
    return this.ordersService.addNote(
      id,
      dto,
      auditActor(request),
    );
  }
}