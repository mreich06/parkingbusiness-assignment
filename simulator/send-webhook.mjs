#!/usr/bin/env node
// Sends a signed payment confirmation to your API, the way the payment provider would.
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { buildPayment, sign } from './sign.mjs';

const USAGE =
  'Usage: node send-webhook.mjs --session <parkingSessionId> --amount <cents> ' +
  '[--status PAID|FAILED] [--payment-id <id>] [--times <n>] [--url <url>]';

const secret = process.env.WEBHOOK_SECRET;
if (!secret) {
  console.error('WEBHOOK_SECRET is not set. Export the secret your API uses to verify payment calls, then run this again.');
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3000/webhooks/payments' },
    session: { type: 'string' },
    amount: { type: 'string' },
    status: { type: 'string', default: 'PAID' },
    'payment-id': { type: 'string' },
    times: { type: 'string', default: '1' },
  },
});

// Digits only: "15.00" is rejected rather than read as 15 cents.
const wholeNumber = /^\d+$/;
if (!values.session || !wholeNumber.test(values.amount ?? '') || !wholeNumber.test(values.times) || Number(values.times) < 1) {
  console.error(USAGE);
  process.exit(1);
}
const amountCents = Number(values.amount);
const times = Number(values.times);

const body = JSON.stringify(
  buildPayment({
    paymentId: values['payment-id'] ?? randomUUID(),
    parkingSessionId: values.session,
    amountCents,
    status: values.status,
  }),
);
const headers = { 'Content-Type': 'application/json', 'X-Signature': sign(body, secret) };

const { default: axios } = await import('axios');

// The provider retries until it gets a 2xx, so --times sends the identical call again.
for (let attempt = 1; attempt <= times; attempt++) {
  try {
    const res = await axios.post(values.url, body, {
      headers,
      transformRequest: [(data) => data],
      validateStatus: () => true,
    });
    console.log(`attempt ${attempt}: HTTP ${res.status}`);
  } catch (err) {
    console.error(`attempt ${attempt}: ${err.message}`);
    process.exitCode = 1;
  }
}
