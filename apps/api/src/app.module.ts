import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@cactus/database';

import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CashModule } from './modules/cash/cash.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { HealthModule } from './modules/health/health.module';
import { LocationsModule } from './modules/locations/locations.module';
import { OperationalAreasModule } from './modules/operational-areas/operational-areas.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PlatformCompaniesModule } from './modules/platform-companies/platform-companies.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryCountsModule } from './modules/inventory-counts/inventory-counts.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { UsersModule } from './modules/users/users.module';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    CatalogModule,
    CustomersModule,
    DashboardModule,
    EmployeesModule,
    OrdersModule,
    OperationalAreasModule,
    PosModule,
    InventoryCountsModule,
    CashModule,
    ExpensesModule,
    PurchasesModule,
    UsersModule,
    BranchesModule,
    LocationsModule,
    PlatformCompaniesModule,
    PricingModule,
  ],
})
export class AppModule {}
