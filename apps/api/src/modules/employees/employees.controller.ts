import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type {
  CashierEmployeeResponse,
  EmployeeResponse,
} from '@cactus/shared';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  list(): Promise<EmployeeResponse[]> {
    return this.employeesService.list();
  }

  @Get('cashiers')
  cashiers(): Promise<CashierEmployeeResponse[]> {
    return this.employeesService.cashiers();
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeResponse> {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponse> {
    return this.employeesService.update(id, dto);
  }
}
