import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type {
  CashCloseReportResponse,
  CashRegisterSummaryResponse,
  CashSessionResponse,
} from '@cactus/shared';
import { CashService } from './cash.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { RegisterCashPrintDto } from './dto/register-cash-print.dto';

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('registers')
  registers(): Promise<CashRegisterSummaryResponse[]> {
    return this.cashService.registers();
  }

  @Get('sessions/:id')
  session(@Param('id') id: string): Promise<CashSessionResponse> {
    return this.cashService.session(id);
  }

  @Post('sessions/open')
  open(
    @Body() dto: OpenCashSessionDto,
  ): Promise<CashSessionResponse> {
    return this.cashService.open(dto);
  }

  @Post('sessions/:id/movements')
  addMovement(
    @Param('id') id: string,
    @Body() dto: CreateCashMovementDto,
  ): Promise<CashSessionResponse> {
    return this.cashService.addMovement(id, dto);
  }


  @Get('sessions/:id/report')
  report(@Param('id') id: string): Promise<CashCloseReportResponse> {
    return this.cashService.report(id);
  }

  @Post('sessions/:id/print-log')
  registerPrint(
    @Param('id') id: string,
    @Body() dto: RegisterCashPrintDto,
  ): Promise<{ ok: true }> {
    return this.cashService.registerPrint(id, dto);
  }

  @Post('sessions/:id/close')
  close(
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
  ): Promise<CashSessionResponse> {
    return this.cashService.close(id, dto);
  }
}
