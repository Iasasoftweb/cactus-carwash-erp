import { Module } from '@nestjs/common';
import { OperationalAreasController } from './operational-areas.controller';
import { OperationalAreasService } from './operational-areas.service';

@Module({
  controllers: [OperationalAreasController],
  providers: [OperationalAreasService],
})
export class OperationalAreasModule {}
