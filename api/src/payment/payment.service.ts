import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BUILDING_ID } from '../check-in/check-in.service.js';
import { PaymentStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

export interface PaymentInput {
  paymentId: string;
  parkingSessionId: string;
  status: PaymentStatus;
}

@Injectable()
export class PaymentService {
  constructor(private readonly db: PrismaService) {}

  async confirm({ paymentId, parkingSessionId, status }: PaymentInput) {
    const session = await this.db.session.findFirst({ where: { id: parkingSessionId, space: { buildingId: BUILDING_ID } } });
    if (!session) throw new NotFoundException({ error: 'SESSION_NOT_FOUND' });
    const paid = status === 'PAID';
    if (paid && !session.checkedOutAt) throw new ConflictException({ error: 'SESSION_NOT_CHECKED_OUT' });

    // The payment and the paid mark go in together. A repeated paymentId fails the insert and changes nothing
    try {
      await this.db.$transaction([
        this.db.payment.create({ data: { paymentId, sessionId: session.id, status } }),
        this.db.session.updateMany({ where: { id: session.id, paidAt: null }, data: paid ? { paidAt: new Date() } : {} }),
      ]);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
    return { received: true };
  }
}
