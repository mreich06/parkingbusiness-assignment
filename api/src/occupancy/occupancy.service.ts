import { Injectable } from '@nestjs/common';
import { BUILDING_ID } from '../check-in/check-in.service.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class OccupancyService {
  constructor(private readonly db: PrismaService) {}

  // A space is occupied while it has a session that is not checked out
  async list() {
    const spaces = await this.db.space.findMany({
      where: { buildingId: BUILDING_ID },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        zone: { select: { vehicleType: true } },
        sessions: { where: { checkedOutAt: null }, select: { id: true } },
      },
    });
    return spaces.map(({ id, zone, sessions }) => ({
      parkingSpaceId: id,
      vehicleType: zone.vehicleType,
      isOccupied: sessions.length > 0,
    }));
  }
}
