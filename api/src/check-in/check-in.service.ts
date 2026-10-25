import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, VehicleType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

export const BUILDING_ID = 'PB-AMS-2M8D';
const ATTEMPTS = 3; // the first try plus 2 retries

export interface CheckInInput {
  vehicleType: VehicleType;
  isResident: boolean;
  licensePlate: string;
}

@Injectable()
export class CheckInService {
  constructor(private readonly db: PrismaService) {}

  async checkIn(input: CheckInInput) {
    const { vehicleType, isResident } = input;
    const licensePlate = input.licensePlate.toUpperCase().replace(/[\s-]/g, '');

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const existing = await this.db.session.findFirst({ where: { licensePlate, checkedOutAt: null } });
      if (existing) throw new ConflictException({ error: 'ALREADY_CHECKED_IN', sessionId: existing.id });

      const space = await this.db.space.findFirst({
        where: {
          buildingId: BUILDING_ID,
          zone: isResident ? { isResident } : { isResident, vehicleType },
          sessions: { none: { checkedOutAt: null } },
        },
        orderBy: { number: 'asc' },
      });
      if (!space) throw new ConflictException({ error: 'NO_SPACE_AVAILABLE' });

      try {
        const session = await this.db.session.create({ data: { spaceId: space.id, licensePlate } });
        return { parkingSessionId: session.id, parkingSpaceId: space.id };
      } catch (e) {
        // Another check-in took the space or plate first: look again
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new ServiceUnavailableException({ error: 'CHECK_IN_CONTENDED' });
  }
}
