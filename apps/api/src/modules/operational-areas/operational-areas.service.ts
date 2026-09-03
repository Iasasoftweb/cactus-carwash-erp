import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type {
  OperationalAreaResponse,
} from '@cactus/shared';

@Injectable()
export class OperationalAreasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async list(
    companyId: string,
    branchId?: string,
  ): Promise<OperationalAreaResponse[]> {
    if (branchId) {
      const branch =
        await this.prisma.branch.findFirst({
          where: {
            id: branchId,
            companyId,
          },
          select: {
            id: true,
          },
        });

      if (!branch) {
        throw new NotFoundException(
          'Sucursal no encontrada.',
        );
      }
    }

    const areas =
      await this.prisma.operationalArea.findMany({
        where: {
          companyId,
          active: true,
          ...(branchId ? { branchId } : {}),
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      });

    return areas.map((area) => ({
      id: area.id,
      companyId: area.companyId,
      branchId: area.branchId,
      code: area.code,
      name: area.name,
      ticketPrefix: area.ticketPrefix,
      color: area.color,
      icon: area.icon,
      printerName: area.printerName,
      printCopies: area.printCopies,
      autoPrint: area.autoPrint,
      slaMinutes: area.slaMinutes,
      active: area.active,
    }));
  }
}