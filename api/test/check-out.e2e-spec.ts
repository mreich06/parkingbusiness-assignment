import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma.service.js';

let app: INestApplication;
let db: PrismaService;
let id: string;

beforeAll(async () => {
  process.env.GATE_API_KEY = 'test-key';
  app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
  await app.init();
  db = app.get(PrismaService);
});
// A visitor car on space 51, checked in 100 minutes ago
beforeEach(async () => {
  await db.payment.deleteMany();
  await db.session.deleteMany();
  const checkedInAt = new Date(Date.now() - 100 * 60_000);
  ({ id } = await db.session.create({ data: { spaceId: 51, licensePlate: 'AB-123-C', checkedInAt } }));
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const post = (payload: object | string, key: string | null = 'test-key') => {
  const req = request(app.getHttpServer() as Server).post('/check-out');
  return (key ? req.set('X-Api-Key', key) : req).type('json').send(payload);
};

it('AC1: returns 200 with the space, length and amount due, and frees the space', async () => {
  await post({ parkingSessionId: id, isResident: false })
    .expect(200)
    .expect({ parkingSpaceId: 51, sessionLengthInMinutes: 100, amountDue: { value: 1000, currency: 'EUR' } });
  // Space 51 is the first visitor car space, so the next visitor car gets it only if it is free
  await request(app.getHttpServer() as Server)
    .post('/check-in')
    .set('X-Api-Key', 'test-key')
    .send({ vehicleType: 'CAR', isResident: false, licensePlate: 'XY-987-Z' })
    .expect(201)
    .expect((res) => expect(res.body.parkingSpaceId).toBe(51));
});

it('AC3: returns 200 with the same body for simultaneous and repeated check-outs, keeping the first end time', async () => {
  const body = { parkingSessionId: id, isResident: false };
  const [first, second] = await Promise.all([post(body), post(body)]);
  const { checkedOutAt } = await db.session.findUniqueOrThrow({ where: { id } });
  const repeat = await post(body);
  expect([first.status, second.status, repeat.status]).toEqual([200, 200, 200]);
  expect(second.body).toEqual(first.body);
  expect(repeat.body).toEqual(first.body);
  expect((await db.session.findUniqueOrThrow({ where: { id } })).checkedOutAt).toEqual(checkedOutAt);
});

it('AC4: returns 401 without a valid key and leaves the session unchanged', async () => {
  await post({ parkingSessionId: id, isResident: false }, null).expect(401).expect({ error: 'UNAUTHORIZED' });
  await post({ parkingSessionId: id, isResident: false }, 'wrong').expect(401);
  expect((await db.session.findUniqueOrThrow({ where: { id } })).checkedOutAt).toBeNull();
});

it.each([
  ['a missing field', () => ({ parkingSessionId: id })],
  ['a wrong type', () => ({ parkingSessionId: id, isResident: 'no' })],
  ['a non-UUID id', () => ({ parkingSessionId: 'abc', isResident: false })],
  ['an unknown field', () => ({ parkingSessionId: id, isResident: false, extra: 1 })],
  ['a body that is not JSON', () => '{oops'],
])('AC5: returns 400 for %s', async (_name, payload) => {
  await post(payload()).expect(400).expect({ error: 'INVALID_REQUEST' });
});

it('AC6: returns 404 for an unknown session', async () => {
  await post({ parkingSessionId: '00000000-0000-4000-8000-000000000000', isResident: false })
    .expect(404)
    .expect({ error: 'SESSION_NOT_FOUND' });
});

it('AC7: returns 500 with no internal details when the database fails', async () => {
  const failure = jest.spyOn(db.session, 'updateMany').mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:5432'));
  const res = await post({ parkingSessionId: id, isResident: false }).expect(500);
  failure.mockRestore();
  expect(res.body).toEqual({ error: 'INTERNAL_ERROR' });
});
