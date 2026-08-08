import { Injectable } from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import type { OperationalAreaResponse } from '@cactus/shared';

@Injectable()
export class OperationalAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<OperationalAreaResponse[]> {
    const areas = await this.prisma.operationalArea.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return areas.map((area) => ({
      id: area.id,
      code: area.code,
      name: area.name,
      ticketPrefix: area.ticketPrefix,
      color: area.color,
      icon: area.icon,
      printerName: area.printerName,
      printCopies: area.printCopies,
      autoPrint: area.autoPrint,
      slaMinutes: area.slaMinutes,
    }));
  }
}
