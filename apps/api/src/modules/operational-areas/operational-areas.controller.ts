import { Controller, Get } from '@nestjs/common';
import type { OperationalAreaResponse } from '@cactus/shared';
import { OperationalAreasService } from './operational-areas.service';

@Controller('operational-areas')
export class OperationalAreasController {
  constructor(
    private readonly operationalAreasService: OperationalAreasService,
  ) {}

  @Get()
  list(): Promise<OperationalAreaResponse[]> {
    return this.operationalAreasService.list();
  }
}
