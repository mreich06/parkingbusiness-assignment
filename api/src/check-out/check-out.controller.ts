import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { GateKeyGuard } from '../check-in/gate-key.guard.js';
import { CheckOutService } from './check-out.service.js';

const UUID = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

const isValid = (body: unknown): body is { parkingSessionId: string; isResident: boolean } => {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    Object.keys(b).sort().join() === 'isResident,parkingSessionId' &&
    typeof b.isResident === 'boolean' &&
    typeof b.parkingSessionId === 'string' &&
    UUID.test(b.parkingSessionId)
  );
};

@Controller('check-out')
@UseGuards(GateKeyGuard)
export class CheckOutController {
  constructor(private readonly service: CheckOutService) {}

  @Post()
  @HttpCode(200)
  checkOut(@Body() body: unknown) {
    if (!isValid(body)) throw new BadRequestException({ error: 'INVALID_REQUEST' });
    return this.service.checkOut(body.parkingSessionId);
  }
}
