import { Controller, Get } from '@nestjs/common';
import { OccupancyService } from './occupancy.service.js';

// Public: the entrance display reads it without credentials
@Controller('occupancy')
export class OccupancyController {
  constructor(private readonly service: OccupancyService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
