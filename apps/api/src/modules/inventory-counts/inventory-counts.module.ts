import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventoryCountsController } from './inventory-counts.controller';
import { InventoryCountsService } from './inventory-counts.service';

@Module({
  imports: [AuthModule],
  controllers: [InventoryCountsController],
  providers: [InventoryCountsService],
})
export class InventoryCountsModule {}
