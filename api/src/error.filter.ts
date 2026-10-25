import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

// Our own errors keep their { error: CODE } body. Anything else is reduced to a code, so no internal details leak
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (!(e instanceof HttpException)) {
      new Logger('Errors').error(e);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
    const body = e.getResponse();
    // Nest's own 400s (such as malformed JSON) carry a parser message. Ours carry only a code
    if (e.getStatus() === 400 && typeof body === 'object' && 'message' in body) {
      return res.status(400).json({ error: 'INVALID_REQUEST' });
    }
    return res.status(e.getStatus()).json(body);
  }
}
