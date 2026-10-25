import { Injectable, NotFoundException } from '@nestjs/common';
import { BUILDING_ID } from '../check-in/check-in.service.js';
import { PrismaService } from '../prisma.service.js';
import { price } from './price.js';

@Injectable()
export class CheckOutService {
  constructor(private readonly db: PrismaService) {}

  async checkOut(parkingSessionId: string) {
    const where = { id: parkingSessionId, space: { buildingId: BUILDING_ID } };
    // Only the first check-out sets the time: a repeated or simultaneous one updates nothing and reads it back
    await this.db.session.updateMany({ where: { ...where, checkedOutAt: null }, data: { checkedOutAt: new Date() } });
    const session = await this.db.session.findFirst({
      where,
      include: { space: { include: { zone: { include: { tariff: true, building: true } } } } },
    });
    if (!session?.checkedOutAt) throw new NotFoundException({ error: 'SESSION_NOT_FOUND' });

    const { checkedInAt, checkedOutAt, space } = session;
    const { tariff, building } = space.zone;
    return {
      parkingSpaceId: space.id,
      sessionLengthInMinutes: Math.floor((checkedOutAt.getTime() - checkedInAt.getTime()) / 60_000),
      amountDue: {
        value: price(checkedInAt, checkedOutAt, tariff.hourlyRate, tariff.dailyCap, building.timezone),
        currency: tariff.currency,
      },
    };
  }
}
