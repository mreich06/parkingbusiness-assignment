import { createHmac, timingSafeEqual } from 'node:crypto';

// The provider signs the exact bytes it sends, so the check runs on the raw body and never on parsed JSON
export const hasValidSignature = (raw: unknown, signature: string | undefined) => {
  const secret = process.env.WEBHOOK_SECRET ?? '';
  if (secret.length === 0 || !Buffer.isBuffer(raw)) return false;
  const given = Buffer.from(signature ?? '');
  const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'));
  return given.length === expected.length && timingSafeEqual(given, expected);
};
