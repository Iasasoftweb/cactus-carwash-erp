import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  CashRegisterResponse,
  CreatePosMovementResponse,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PosAccountResponse,
  ProductCategoryResponse,
  ProductResponse,
} from '@cactus/shared';


import { AddPosAccountItemsDto } from './dto/add-pos-account-items.dto';
import { CreateDirectPosPaymentDto } from './dto/create-direct-pos-payment.dto';
import { CreatePosMovementDto } from './dto/create-pos-movement.dto';
import { OpenPosAccountDto } from './dto/open-pos-account.dto';
import { PayPosAccountDto } from './dto/pay-pos-account.dto';
import { UpdatePosAccountDto } from './dto/update-pos-account.dto';
import { PosService } from './pos.service';

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('points')
  points(): Promise<PointOfSaleResponse[]> {
    return this.posService.points();
  }

  @Get('payment-methods')
  paymentMethods(): Promise<PaymentMethodResponse[]> {
    return this.posService.paymentMethods();
  }

  @Get('cash-registers')
  cashRegisters(
    @Query('pointOfSaleId') pointOfSaleId?: string,
  ): Promise<CashRegisterResponse[]> {
    return this.posService.cashRegisters(pointOfSaleId);
  }

  @Get('categories')
  categories(
    @Query('pointOfSaleId') pointOfSaleId?: string,
  ): Promise<ProductCategoryResponse[]> {
    return this.posService.categories(pointOfSaleId);
  }

  @Get('products')
  products(
    @Query('pointOfSaleId') pointOfSaleId?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<ProductResponse[]> {
    return this.posService.products(pointOfSaleId, categoryId);
  }

  @Get('accounts')
  accounts(
    @Query('pointOfSaleId') pointOfSaleId?: string,
  ): Promise<PosAccountResponse[]> {
    return this.posService.accounts(pointOfSaleId);
  }

  
  @Post('accounts')
  openAccount(
    @Body() dto: OpenPosAccountDto,
  ): Promise<PosAccountResponse> {
    return this.posService.openAccount(dto);
  }

  @Patch('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdatePosAccountDto,
  ): Promise<PosAccountResponse> {
    return this.posService.updateAccount(id, dto);
  }

  @Post('accounts/:id/items')
  addAccountItems(
    @Param('id') id: string,
    @Body() dto: AddPosAccountItemsDto,
  ): Promise<PosAccountResponse> {
    return this.posService.addAccountItems(id, dto);
  }

  @Post('accounts/:id/pay')
  payAccount(
    @Param('id') id: string,
    @Body() dto: PayPosAccountDto,
  ): Promise<PosAccountResponse> {
    return this.posService.payAccount(id, dto);
  }

  @Post('direct-payments')
  directPayment(
    @Body() dto: CreateDirectPosPaymentDto,
  ): Promise<CreatePosMovementResponse> {
    return this.posService.directPayment(dto);
  }

  @Post('movements')
  createMovement(
    @Body() dto: CreatePosMovementDto,
  ): Promise<CreatePosMovementResponse> {
    return this.posService.createMovement(dto);
  }
}