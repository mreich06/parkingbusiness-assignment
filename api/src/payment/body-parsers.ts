import type { INestApplication } from '@nestjs/common';
import { json, raw } from 'express';

// Nest would parse the JSON before the signature is checked. The webhook route gets the raw bytes instead, everything else gets JSON as usual
export const setupBodyParsers = (app: INestApplication) => {
  app.use('/webhooks/payments', raw({ type: () => true }));
  app.use(json());
};
