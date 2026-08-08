import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@cactus/database';
import { HealthModule } from './modules/health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OperationalAreasModule } from './modules/operational-areas/operational-areas.module';
import { PosModule } from './modules/pos/pos.module';
import { CashModule } from './modules/cash/cash.module';
import { ExpensesModule } from './modules/expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    CatalogModule,
    EmployeesModule,
    OrdersModule,
    OperationalAreasModule,
    PosModule,
    CashModule,
    ExpensesModule,
  ],
})
export class AppModule {}
