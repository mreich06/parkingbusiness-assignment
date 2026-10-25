import { PrismaService } from '../prisma.service.js';
import { CheckOutService } from './check-out.service.js';

const db = new PrismaService();
const service = new CheckOutService(db);

// A session on that space, checked in 100 minutes ago
const park = (spaceId: number) =>
  db.session.create({ data: { spaceId, licensePlate: `P${spaceId}`, checkedInAt: new Date(Date.now() - 100 * 60_000) } });

beforeEach(() => db.session.deleteMany());
afterAll(() => db.$disconnect());

it.each([
  ['visitor car', 51, 1000],
  ['visitor motorcycle', 131, 600],
  ['resident', 1, 0],
])('AC1: checks out a %s at its tariff', async (_name, spaceId, value) => {
  const { id } = await park(spaceId);
  expect(await service.checkOut(id)).toEqual({
    parkingSpaceId: spaceId,
    sessionLengthInMinutes: 100,
    amountDue: { value, currency: 'EUR' },
  });
});
