import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { buildPayment, sign } from './sign.mjs';

const script = fileURLToPath(new URL('./send-webhook.mjs', import.meta.url));

test('signs with HMAC-SHA256 as hex (published test vector)', () => {
  assert.equal(
    sign('The quick brown fox jumps over the lazy dog', 'key'),
    'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
  );
});

test('one changed byte in the body changes the signature', () => {
  assert.notEqual(sign('{"value":100}', 'secret'), sign('{"value":101}', 'secret'));
});

test('builds the payment body the provider sends', () => {
  assert.deepEqual(
    buildPayment({ paymentId: 'pay_1', parkingSessionId: 'ses_1', amountCents: 1500, status: 'PAID' }),
    { paymentId: 'pay_1', parkingSessionId: 'ses_1', amount: { value: 1500, currency: 'EUR' }, status: 'PAID' },
  );
});

test('refuses to run without WEBHOOK_SECRET', () => {
  const env = { ...process.env };
  delete env.WEBHOOK_SECRET;
  const run = spawnSync(process.execPath, [script, '--session', 'ses_1', '--amount', '1500'], { env, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /WEBHOOK_SECRET is not set/);
});

test('prints usage when the amount is not whole cents', () => {
  const env = { ...process.env, WEBHOOK_SECRET: 'test-secret' };
  const run = spawnSync(process.execPath, [script, '--session', 'ses_1', '--amount', '15.00'], { env, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /^Usage:/);
});
