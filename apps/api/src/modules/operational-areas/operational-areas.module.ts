import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { OperationalAreasController } from './operational-areas.controller';
import { OperationalAreasService } from './operational-areas.service';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [
    OperationalAreasController,
  ],
  providers: [
    OperationalAreasService,
  ],
})
export class OperationalAreasModule {}