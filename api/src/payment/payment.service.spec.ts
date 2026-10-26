import { PrismaService } from '../prisma.service.js';
import { PaymentService } from './payment.service.js';

const db = new PrismaService();
const service = new PaymentService(db);

// A visitor car session on space 51, checked out or still in progress
const park = (checkedOutAt: Date | null) => db.session.create({ data: { spaceId: 51, licensePlate: 'AB123C', checkedOutAt } });
const call = (parkingSessionId: string, status: 'PAID' | 'FAILED') => service.confirm({ paymentId: 'pay-1', parkingSessionId, status });
const paidAt = async (id: string) => (await db.session.findUniqueOrThrow({ where: { id } })).paidAt;
// Payments reference sessions, so they go first. Clearing at the end keeps other suites' session cleanup working
const clean = async () => {
  await db.payment.deleteMany();
  await db.session.deleteMany();
};

beforeEach(clean);
afterAll(async () => {
  await clean();
  await db.$disconnect();
});

it('AC1: marks a checked-out session as paid', async () => {
  const { id } = await park(new Date());
  expect(await call(id, 'PAID')).toEqual({ received: true });
  expect(await paidAt(id)).not.toBeNull();
});

it('AC3: a FAILED call does not mark the session as paid', async () => {
  const { id } = await park(new Date());
  expect(await call(id, 'FAILED')).toEqual({ received: true });
  expect(await paidAt(id)).toBeNull();
});

it('AC7, AC10: rejects PAID before check-out, then accepts the same call after it', async () => {
  const { id } = await park(null);
  await expect(call(id, 'PAID')).rejects.toMatchObject({ response: { error: 'SESSION_NOT_CHECKED_OUT' } });
  expect(await db.payment.count()).toBe(0);
  await db.session.update({ where: { id }, data: { checkedOutAt: new Date() } });
  await call(id, 'PAID');
  expect(await paidAt(id)).not.toBeNull();
});
