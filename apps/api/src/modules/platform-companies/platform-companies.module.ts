import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PlatformCompaniesController } from './platform-companies.controller';
import { PlatformCompaniesService } from './platform-companies.service';
import { PlatformAdminGuard } from './guards/platform-admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [PlatformCompaniesController],
  providers: [PlatformCompaniesService, PlatformAdminGuard],
})
export class PlatformCompaniesModule {}
