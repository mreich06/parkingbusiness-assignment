import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupBodyParsers } from '../src/payment/body-parsers.js';
import { PrismaService } from '../src/prisma.service.js';

const SECRET = 'test-secret';
const sign = (raw: string) => createHmac('sha256', SECRET).update(raw).digest('hex');
let app: INestApplication;
let db: PrismaService;

beforeAll(async () => {
  process.env.WEBHOOK_SECRET = SECRET;
  app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ bodyParser: false });
  setupBodyParsers(app);
  await app.init();
  db = app.get(PrismaService);
});
const clean = async () => {
  await db.payment.deleteMany();
  await db.session.deleteMany();
};
beforeEach(clean);
afterAll(async () => {
  await clean();
  await app.close();
  await db.$disconnect();
});

const parked = (checkedOutAt: Date | null) => db.session.create({ data: { spaceId: 51, licensePlate: 'AB123C', checkedOutAt } });
const body = (parkingSessionId: string) => ({
  paymentId: 'pay-1',
  parkingSessionId,
  amount: { value: 1500, currency: 'EUR' },
  status: 'PAID',
});
// The signature covers the exact string sent, so the payload is serialised once
const post = (payload: object | string, signature: string | null = 'valid', headers: Record<string, string> = {}) => {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let req = request(app.getHttpServer() as Server).post('/webhooks/payments').type('json').set(headers);
  const sig = signature === 'valid' ? sign(raw) : signature;
  if (sig) req = req.set('X-Signature', sig);
  return req.send(raw);
};
const paidAt = async (id: string) => (await db.session.findUniqueOrThrow({ where: { id } })).paidAt;

it('AC1: returns 200 for a correctly signed PAID call and marks the session paid', async () => {
  const { id } = await parked(new Date());
  await post(body(id)).expect(200).expect({ received: true });
  expect(await paidAt(id)).not.toBeNull();
});

it.each([
  ['a missing signature', null],
  ['a wrong signature', 'deadbeef'],
])('AC4: returns 401 for %s and leaves the session unchanged', async (_name, signature) => {
  const { id } = await parked(new Date());
  await post(body(id), signature).expect(401).expect({ error: 'INVALID_SIGNATURE' });
  expect(await paidAt(id)).toBeNull();
  expect(await db.payment.count()).toBe(0);
});

it.each([
  ['a body with a missing field', { paymentId: 'pay-1' }],
  ['a body that is not JSON', '{oops'],
])('AC4: returns 401 without a valid signature even for %s', async (_name, payload) => {
  await post(payload, null).expect(401).expect({ error: 'INVALID_SIGNATURE' });
  await post(payload, 'deadbeef').expect(401);
});

it('AC9: returns 401 for X-Terminal-Compat without a valid signature', async () => {
  const { id } = await parked(new Date());
  await post(body(id), null, { 'X-Terminal-Compat': '1' }).expect(401).expect({ error: 'INVALID_SIGNATURE' });
  expect(await paidAt(id)).toBeNull();
});

const SESSION = '00000000-0000-4000-8000-000000000000';
const valid = body(SESSION);
it.each([
  ['a missing field', { ...valid, paymentId: undefined }],
  ['a wrong type', { ...valid, paymentId: 5 }],
  ['a non-UUID id', { ...valid, parkingSessionId: 'not-a-uuid' }],
  ['an invalid status', { ...valid, status: 'REFUNDED' }],
  ['an unknown field', { ...valid, extra: 1 }],
  ['a non-integer amount', { ...valid, amount: { value: 15.5, currency: 'EUR' } }],
])('AC5: returns 400 for %s when correctly signed', async (_name, payload) => {
  await post(payload).expect(400).expect({ error: 'INVALID_REQUEST' });
});

it('AC6: returns 404 when no session has that id', async () => {
  await post(valid).expect(404).expect({ error: 'SESSION_NOT_FOUND' });
});

it('AC7: returns 409 for PAID on a session that is still in progress', async () => {
  const { id } = await parked(null);
  await post(body(id)).expect(409).expect({ error: 'SESSION_NOT_CHECKED_OUT' });
  expect(await paidAt(id)).toBeNull();
});

it('AC8: returns 500 with no internal details when the database fails', async () => {
  const failure = jest.spyOn(db.session, 'findFirst').mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:5432'));
  const res = await post(valid).expect(500);
  failure.mockRestore();
  expect(res.body).toEqual({ error: 'INTERNAL_ERROR' });
});
