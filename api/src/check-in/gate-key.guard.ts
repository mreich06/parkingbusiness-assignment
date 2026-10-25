import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class GateKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = Buffer.from(process.env.GATE_API_KEY ?? '');
    const given = Buffer.from(context.switchToHttp().getRequest<Request>().header('x-api-key') ?? '');
    if (expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected)) return true;
    throw new UnauthorizedException({ error: 'UNAUTHORIZED' });
  }
}
