import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma.service.js';

const body = { vehicleType: 'CAR', isResident: false, licensePlate: 'AB-123-C' };
let app: INestApplication;
let db: PrismaService;

beforeAll(async () => {
  process.env.GATE_API_KEY = 'test-key';
  app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
  await app.init();
  db = app.get(PrismaService);
});
beforeEach(() => db.session.deleteMany());
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const post = (payload: object | string, key: string | null = 'test-key') => {
  const req = request(app.getHttpServer() as Server).post('/check-in');
  return (key ? req.set('X-Api-Key', key) : req).type('json').send(payload);
};

it('returns 201 with the session and space', async () => {
  const res = await post(body).expect(201);
  expect(res.body).toEqual({ parkingSessionId: expect.any(String), parkingSpaceId: 51 });
});

it('returns 409 with the existing session id when the plate is already checked in', async () => {
  const first = await post(body).expect(201);
  await post(body).expect(409).expect({ error: 'ALREADY_CHECKED_IN', sessionId: first.body.parkingSessionId });
});

it('AC2: returns 401 without a valid key and creates nothing', async () => {
  await post(body, null).expect(401).expect({ error: 'UNAUTHORIZED' });
  await post(body, 'wrong').expect(401);
  expect(await db.session.count()).toBe(0);
});

it.each([
  ['a missing field', { vehicleType: 'CAR', isResident: false }],
  ['a wrong type', { ...body, isResident: 'no' }],
  ['an invalid plate', { ...body, licensePlate: 'AB_123!' }],
  ['a plate without letters or digits', { ...body, licensePlate: '---' }],
  ['an unknown field', { ...body, extra: 1 }],
  ['a body that is not JSON', '{oops'],
])('AC3: returns 400 for %s and creates nothing', async (_name, payload) => {
  await post(payload).expect(400).expect({ error: 'INVALID_REQUEST' });
  expect(await db.session.count()).toBe(0);
});

it('AC7: returns 500 with no internal details when the database fails', async () => {
  const failure = jest.spyOn(db.session, 'findFirst').mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:5432'));
  const res = await post(body).expect(500);
  failure.mockRestore();
  expect(res.body).toEqual({ error: 'INTERNAL_ERROR' });
});
