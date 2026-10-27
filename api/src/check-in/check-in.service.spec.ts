import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { CheckInService } from './check-in.service.js';

const db = new PrismaService();
const service = new CheckInService(db);
const car = { vehicleType: 'CAR', isResident: false } as const;
const motor = { vehicleType: 'MOTOR', isResident: false } as const;

// Takes spaces from..to with sessions in progress
const fill = async (from: number, to: number) => {
  const spaces = await db.space.findMany({ where: { number: { gte: from, lte: to } } });
  await db.session.createMany({ data: spaces.map((s) => ({ spaceId: s.id, licensePlate: `FILL${s.number}` })) });
};

beforeEach(async () => {
  await db.payment.deleteMany();
  await db.session.deleteMany();
});
afterAll(() => db.$disconnect());

it('AC1: gives each vehicle a space of its kind', async () => {
  const spaces = [
    await service.checkIn({ ...car, licensePlate: 'CAR-1' }),
    await service.checkIn({ ...motor, licensePlate: 'MOTOR-1' }),
    await service.checkIn({ vehicleType: 'CAR', isResident: true, licensePlate: 'RES-1' }),
  ].map((r) => r.parkingSpaceId);
  expect(spaces).toEqual([51, 131, 1]);
});

it('AC4: rejects the same plate written differently, with the existing session id', async () => {
  const first = await service.checkIn({ ...car, licensePlate: 'AB-123-C' });
  await expect(service.checkIn({ ...car, licensePlate: 'ab 123 c' })).rejects.toMatchObject({
    response: { error: 'ALREADY_CHECKED_IN', sessionId: first.parkingSessionId },
  });
  expect(await db.session.count()).toBe(1);
});

it('AC5: rejects when all matching spaces are taken', async () => {
  await fill(131, 150);
  const before = await db.session.count();
  await expect(service.checkIn({ ...motor, licensePlate: 'MOTOR-1' })).rejects.toMatchObject({
    response: { error: 'NO_SPACE_AVAILABLE' },
  });
  expect(await db.session.count()).toBe(before);
});

it('AC8: uses a space whose zone was changed in the data', async () => {
  const motorZone = await db.zone.findFirstOrThrow({ where: { vehicleType: 'MOTOR' } });
  const space = await db.space.findFirstOrThrow({ where: { number: 60 } });
  await fill(131, 150);
  await db.space.update({ where: { id: space.id }, data: { zoneId: motorZone.id } });
  try {
    const result = await service.checkIn({ ...motor, licensePlate: 'MOTOR-1' });
    expect(result.parkingSpaceId).toBe(space.id);
  } finally {
    await db.space.update({ where: { id: space.id }, data: { zoneId: space.zoneId } });
  }
});

it('AC6: gives the last free space to only one of two simultaneous check-ins', async () => {
  for (let round = 0; round < 10; round++) {
    await db.payment.deleteMany();
    await db.session.deleteMany();
    await fill(131, 149);
    const results = await Promise.allSettled([
      service.checkIn({ ...motor, licensePlate: 'MOTOR-1' }),
      service.checkIn({ ...motor, licensePlate: 'MOTOR-2' }),
    ]);
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(['NO_SPACE_AVAILABLE', 'CHECK_IN_CONTENDED']).toContain(rejected[0].reason.response.error);
    expect(await db.session.count({ where: { spaceId: 150, checkedOutAt: null } })).toBe(1);
  }
});

it('AC6: gives up with CHECK_IN_CONTENDED after 2 retries when the chosen space keeps being taken', async () => {
  // Every insert loses the race, as if another check-in took the space each time
  let inserts = 0;
  const contended = {
    session: {
      findFirst: db.session.findFirst.bind(db.session),
      create: () => {
        inserts++;
        return Promise.reject(new Prisma.PrismaClientKnownRequestError('taken', { code: 'P2002', clientVersion: 'test' }));
      },
    },
    space: db.space,
  } as unknown as PrismaService;

  await expect(new CheckInService(contended).checkIn({ ...car, licensePlate: 'CAR-1' })).rejects.toMatchObject({
    status: 503,
    response: { error: 'CHECK_IN_CONTENDED' },
  });
  expect(inserts).toBe(3);
  expect(await db.session.count()).toBe(0);
});
