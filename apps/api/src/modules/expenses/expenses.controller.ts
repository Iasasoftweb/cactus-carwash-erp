import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type {
  ExpenseCategoryResponse,
  ExpenseResponse,
} from '@cactus/shared';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  categories(): Promise<ExpenseCategoryResponse[]> {
    return this.expensesService.categories();
  }

  @Get()
  list(): Promise<ExpenseResponse[]> {
    return this.expensesService.list();
  }

  @Post()
  create(@Body() dto: CreateExpenseDto): Promise<ExpenseResponse> {
    return this.expensesService.create(dto);
  }

  @Post(':id/issue')
  issue(@Param('id') id: string): Promise<ExpenseResponse> {
    return this.expensesService.issue(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string): Promise<ExpenseResponse> {
    return this.expensesService.cancel(id);
  }
}
