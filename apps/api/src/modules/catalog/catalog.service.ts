import { Injectable } from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  CatalogServiceResponse,
  VehicleTypeResponse
} from '@cactus/shared';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getVehicleTypes(): Promise<VehicleTypeResponse[]> {
    return this.prisma.vehicleType.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' }
    });
  }

  async getServices(vehicleTypeId?: string): Promise<CatalogServiceResponse[]> {
    const prices = await this.prisma.servicePrice.findMany({
      where: {
        active: true,
        ...(vehicleTypeId ? { vehicleTypeId } : {}),
        service: { active: true }
      },
      include: {
        service: { include: { category: true } },
        vehicleType: true
      },
      orderBy: { service: { name: 'asc' } }
    });

    return prices.map((price) => ({
      id: price.service.id,
      priceId: price.id,
      code: price.service.code,
      name: price.service.name,
      category: price.service.category.name,
      vehicleTypeId: price.vehicleTypeId,
      vehicleType: price.vehicleType.name,
      price: Number(price.price),
      taxable: price.taxable
    }));
  }
}
