import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CheckInInput, CheckInService } from './check-in.service.js';
import { GateKeyGuard } from './gate-key.guard.js';

const PLATE = /^(?=.*[A-Za-z0-9])[A-Za-z0-9 -]{1,20}$/;

const isValid = (body: unknown): body is CheckInInput => {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    Object.keys(b).sort().join() === 'isResident,licensePlate,vehicleType' &&
    (b.vehicleType === 'CAR' || b.vehicleType === 'MOTOR') &&
    typeof b.isResident === 'boolean' &&
    typeof b.licensePlate === 'string' &&
    PLATE.test(b.licensePlate)
  );
};

@Controller('check-in')
@UseGuards(GateKeyGuard)
export class CheckInController {
  constructor(private readonly service: CheckInService) {}

  @Post()
  checkIn(@Body() body: unknown) {
    if (!isValid(body)) throw new BadRequestException({ error: 'INVALID_REQUEST' });
    return this.service.checkIn(body);
  }
}
