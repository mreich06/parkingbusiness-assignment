import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CheckInController } from './check-in/check-in.controller.js';
import { CheckInService } from './check-in/check-in.service.js';
import { ErrorFilter } from './error.filter.js';
import { PrismaService } from './prisma.service.js';

@Module({
  controllers: [CheckInController],
  providers: [CheckInService, PrismaService, { provide: APP_FILTER, useClass: ErrorFilter }],
})
export class AppModule {}
