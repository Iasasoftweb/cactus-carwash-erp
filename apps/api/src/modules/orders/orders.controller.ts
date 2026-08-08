import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type {
  CreatedOrderResponse,
  OrderChecklistItemResponse,
  OrderDetailResponse,
  OrderListItemResponse,
  OrderNoteResponse,
  UpdateOrderStatusResponse,
  OperationalTicketResponse,
  TicketPrintLogResponse,
  AddOrderServiceResponse,
} from '@cactus/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { AddOrderServiceDto } from './dto/add-order-service.dto';
import { CreateOrderNoteDto } from './dto/create-order-note.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(): Promise<OrderListItemResponse[]> {
    return this.ordersService.list();
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<OrderDetailResponse> {
    return this.ordersService.detail(id);
  }


  @Get(':id/tickets')
  tickets(@Param('id') id: string): Promise<OperationalTicketResponse[]> {
    return this.ordersService.tickets(id);
  }

  @Post(':id/tickets/:areaCode/print-log')
  registerTicketPrint(
    @Param('id') id: string,
    @Param('areaCode') areaCode: string,
    @Body() body: { reprint?: boolean; printedBy?: string },
  ): Promise<TicketPrintLogResponse> {
    return this.ordersService.registerTicketPrint(
      id,
      areaCode,
      Boolean(body.reprint),
      body.printedBy,
    );
  }


  @Post(':id/pay')
  pay(
    @Param('id') id: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.ordersService.pay(id, dto);
  }

  @Post(':id/services')
  addService(
    @Param('id') id: string,
    @Body() dto: AddOrderServiceDto,
  ): Promise<AddOrderServiceResponse> {
    return this.ordersService.addService(id, dto);
  }

  @Post()
  create(@Body() dto: CreateOrderDto): Promise<CreatedOrderResponse> {
    return this.ordersService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<UpdateOrderStatusResponse> {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Post(':id/checklist')
  updateChecklist(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistItemDto,
  ): Promise<OrderChecklistItemResponse> {
    return this.ordersService.updateChecklist(id, dto);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateOrderNoteDto,
  ): Promise<OrderNoteResponse> {
    return this.ordersService.addNote(id, dto);
  }
}
