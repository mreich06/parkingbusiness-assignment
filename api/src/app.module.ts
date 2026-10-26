import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CheckInController } from './check-in/check-in.controller.js';
import { CheckInService } from './check-in/check-in.service.js';
import { CheckOutController } from './check-out/check-out.controller.js';
import { CheckOutService } from './check-out/check-out.service.js';
import { ErrorFilter } from './error.filter.js';
import { PaymentController } from './payment/payment.controller.js';
import { PaymentService } from './payment/payment.service.js';
import { PrismaService } from './prisma.service.js';

@Module({
  controllers: [CheckInController, CheckOutController, PaymentController],
  providers: [CheckInService, CheckOutService, PaymentService, PrismaService, { provide: APP_FILTER, useClass: ErrorFilter }],
})
export class AppModule {}
