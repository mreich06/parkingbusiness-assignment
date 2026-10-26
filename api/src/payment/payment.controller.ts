import { BadRequestException, Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { PaymentInput, PaymentService } from './payment.service.js';
import { hasValidSignature } from './signature.js';

const UUID = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const parse = (raw: Buffer): unknown => {
  try {
    return JSON.parse(raw.toString()) as unknown;
  } catch {
    return undefined;
  }
};

const isValid = (body: unknown): body is PaymentInput => {
  if (!isObject(body) || !isObject(body.amount)) return false;
  return (
    Object.keys(body).sort().join() === 'amount,parkingSessionId,paymentId,status' &&
    Object.keys(body.amount).sort().join() === 'currency,value' &&
    Number.isSafeInteger(body.amount.value) &&
    body.amount.currency === 'EUR' &&
    typeof body.paymentId === 'string' &&
    body.paymentId.length > 0 &&
    typeof body.parkingSessionId === 'string' &&
    UUID.test(body.parkingSessionId) &&
    (body.status === 'PAID' || body.status === 'FAILED')
  );
};

@Controller('webhooks/payments')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  // The body is the raw bytes (see body-parsers.ts): check the signature, then parse, then validate
  @Post()
  @HttpCode(200)
  confirm(@Body() raw: unknown, @Headers('x-signature') signature?: string) {
    if (!hasValidSignature(raw, signature)) throw new UnauthorizedException({ error: 'INVALID_SIGNATURE' });
    const body = parse(raw as Buffer);
    if (!isValid(body)) throw new BadRequestException({ error: 'INVALID_REQUEST' });
    const { paymentId, parkingSessionId, status } = body;
    return this.service.confirm({ paymentId, parkingSessionId, status });
  }
}
