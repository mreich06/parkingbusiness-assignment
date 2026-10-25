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
])('AC1: checks out a %s and frees its space', async (_name, spaceId, value) => {
  const { id } = await park(spaceId);
  expect(await service.checkOut(id)).toEqual({
    parkingSpaceId: spaceId,
    sessionLengthInMinutes: 100,
    amountDue: { value, currency: 'EUR' },
  });
  expect(await db.session.count({ where: { spaceId, checkedOutAt: null } })).toBe(0);
});

it('AC3: returns the first result for repeated and simultaneous check-outs', async () => {
  const { id } = await park(51);
  const [first, second] = await Promise.all([service.checkOut(id), service.checkOut(id)]);
  const { checkedOutAt } = await db.session.findUniqueOrThrow({ where: { id } });
  expect(second).toEqual(first);
  expect(await service.checkOut(id)).toEqual(first);
  expect((await db.session.findUniqueOrThrow({ where: { id } })).checkedOutAt).toEqual(checkedOutAt);
});

it('AC6: rejects an unknown session', async () => {
  await expect(service.checkOut('00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({
    response: { error: 'SESSION_NOT_FOUND' },
  });
});
