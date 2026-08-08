import { Controller, Get, Query } from '@nestjs/common';
import type {
  CatalogServiceResponse,
  VehicleTypeResponse
} from '@cactus/shared';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('vehicle-types')
  getVehicleTypes(): Promise<VehicleTypeResponse[]> {
    return this.catalogService.getVehicleTypes();
  }

  @Get('services')
  getServices(
    @Query('vehicleTypeId') vehicleTypeId?: string
  ): Promise<CatalogServiceResponse[]> {
    return this.catalogService.getServices(vehicleTypeId);
  }
}
