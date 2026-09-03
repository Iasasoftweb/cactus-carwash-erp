import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { Express } from 'express';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { diskStorage } from 'multer';
import type { PlatformCompanyResponse } from '@cactus/shared';

import type { AuthenticatedRequestUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { PlatformCompaniesService } from './platform-companies.service';

type PlatformRequest = Request & {
  user: AuthenticatedRequestUser;
};

function actor(request: PlatformRequest) {
  return {
    userId: request.user.id,
    companyId: request.user.companyId,
    ipAddress: request.ip ?? null,
  };
}

@Controller('platform/companies')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformCompaniesController {
  constructor(
    private readonly service: PlatformCompaniesService,
  ) {}

  @Get()
  list(): Promise<PlatformCompanyResponse[]> {
    return this.service.list();
  }

  @Post()
  create(
    @Body() dto: CreatePlatformCompanyDto,
    @Req() request: PlatformRequest,
  ): Promise<PlatformCompanyResponse> {
    return this.service.create(dto, actor(request));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformCompanyDto,
    @Req() request: PlatformRequest,
  ): Promise<PlatformCompanyResponse> {
    return this.service.update(id, dto, actor(request));
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const directory = './uploads/companies';
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          const companyId = String(request.params.id ?? 'company');
          callback(null, `${companyId}-${Date.now()}${extension}`);
        },
      }),
      fileFilter: (_request, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          callback(
            new Error('Formato no permitido. Usa JPG, PNG o WEBP.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: PlatformRequest,
  ): Promise<PlatformCompanyResponse> {
    return this.service.updateLogo(id, file, actor(request));
  }
}
