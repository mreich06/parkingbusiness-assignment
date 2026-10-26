import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma.service.js';

let app: INestApplication;
let db: PrismaService;

beforeAll(async () => {
  app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
  await app.init();
  db = app.get(PrismaService);
});
// Payments reference sessions, so they go first
const clean = async () => {
  await db.payment.deleteMany();
  await db.session.deleteMany();
};
beforeEach(clean);
afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  await clean();
  await app.close();
  await db.$disconnect();
});

// No credentials are sent, so every call also checks that the endpoint is public
const get = () => request(app.getHttpServer() as Server).get('/occupancy');
const occupied = async () => {
  const spaces = (await get().expect(200)).body as { parkingSpaceId: number; isOccupied: boolean }[];
  return spaces.filter((s) => s.isOccupied).map((s) => s.parkingSpaceId);
};

it('AC1: lists every space once, in order, all free, with null for resident spaces', async () => {
  const { body } = await get().expect(200);
  // Layout: 1-50 residents, 51-130 visitor cars, 131-150 visitor motorcycles
  const expected = Array.from({ length: 150 }, (_, i) => ({
    parkingSpaceId: i + 1,
    vehicleType: i < 50 ? null : i < 130 ? 'CAR' : 'MOTOR',
    isOccupied: false,
  }));
  expect(body).toEqual(expected);
});

it('AC2, AC3: a space is occupied while its session is in progress, and free after check-out', async () => {
  const { id } = await db.session.create({ data: { spaceId: 51, licensePlate: 'AB123C' } });
  expect(await occupied()).toEqual([51]);
  await db.session.update({ where: { id }, data: { checkedOutAt: new Date() } });
  expect(await occupied()).toEqual([]);
});

it('AC4: returns 500 with no internal details when the database fails', async () => {
  jest.spyOn(db.space, 'findMany').mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:5432'));
  const res = await get().expect(500);
  expect(res.body).toEqual({ error: 'INTERNAL_ERROR' });
});
