# Payment provider simulator

Sends a payment confirmation to your API the way the payment provider does: a JSON body, signed in the
`X-Signature` header with the hex HMAC-SHA256 of the raw body.

```bash
npm install
export WEBHOOK_SECRET=<the secret your API uses to verify payment calls>

# one confirmation
node send-webhook.mjs --session <parkingSessionId> --amount 1500

# the provider retrying the same call three times
node send-webhook.mjs --session <parkingSessionId> --amount 1500 --times 3

# a failed payment
node send-webhook.mjs --session <parkingSessionId> --amount 1500 --status FAILED
```

Options: `--url` (default `http://localhost:3000/webhooks/payments`), `--payment-id` (default: a new
UUID per run), `--times` (default 1). Amounts are in cents.
