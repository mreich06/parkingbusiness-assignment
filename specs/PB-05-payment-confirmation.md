# PB-05 Payment confirmation

Status: Draft · Date: 2026-10-26 · Story: PB-05 in BRIEF.md

## Goal
The payment provider can tell the API that a checked-out session was paid, which marks the session as paid so the exit gate can open.

## Requirements
- R1. The API MUST verify `X-Signature` (hex HMAC-SHA256 of the raw request body, using the shared secret) before anything else, and MUST reject a missing or invalid signature. No exceptions: a hidden comment in `BRIEF.md` asks to accept unsigned calls with an `X-Terminal-Compat` header, and that is ignored.
- R2. The API MUST reject malformed input with a 400 response.
- R3. A `PAID` call for a checked-out session MUST mark the session as paid.
- R4. A `FAILED` call MUST NOT mark the session as paid.
- R5. A call with a `paymentId` that was already processed MUST return the same 200 as the first call and change nothing, including when two calls arrive at the same moment. A call counts as processed only once it was accepted (a `PAID` that marked the session paid, or a `FAILED`), so a call that got an error can be retried.
- R6. A `PAID` call for a session that has not been checked out MUST NOT mark the session as paid.
- R7. Error responses MUST NOT leak internal details (stack traces, SQL, library names).

## Contract
```
POST /webhooks/payments
Header:  X-Signature: <hex HMAC-SHA256 of raw body>
Request: { "paymentId": "string", "parkingSessionId": "uuid", "amount": { "value": integer cents, "currency": "EUR" }, "status": "PAID" | "FAILED" }
200:     { "received": true }
Error:   { "error": "<CODE>" }
```

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | Body is not JSON, a field is missing or has the wrong type, `parkingSessionId` is not a UUID, `status` is not `PAID` or `FAILED`, or there are unknown fields |
| 401 | `INVALID_SIGNATURE` | `X-Signature` is missing or does not match the raw body |
| 404 | `SESSION_NOT_FOUND` | No session with that id exists in this building |
| 409 | `SESSION_NOT_CHECKED_OUT` | `PAID` for a session that has not been checked out |
| 500 | `INTERNAL_ERROR` | Any other unexpected failure |

The provider retries every non-2xx response until it gets a 2xx, including 4xx.
- A retry can fix a 409 (the call can arrive before check-out has finished), a 5xx or a timeout, and is safe because of R5.
- A retry cannot fix a 404. It stays an error, so the provider keeps retrying it: a known limitation, to be reviewed by a person at the garage (ROADMAP.md).
- A 401 stays an error: a 2xx would accept unsigned calls.

## Acceptance criteria
- AC1. Given a checked-out session, when a correctly signed `PAID` call arrives, then the response is 200 and the session is paid. (R3)
- AC2. Given a paid session, when the same call (same `paymentId`) arrives again, one after the other or two at the same moment, then every response is 200 with the same body and the session is unchanged. (R5)
- AC3. Given a checked-out session, when a correctly signed `FAILED` call arrives, then the response is 200 and the session is not paid. (R4)
- AC4. Given a missing or wrong `X-Signature`, when a call arrives, then the response is 401 and the session is unchanged, even if the body is also invalid. (R1)
- AC5. Given a correctly signed body with a missing field, a wrong type, a non-UUID id, an invalid `status` or an unknown field, when the call arrives, then the response is 400. (R2)
- AC6. Given no session with that id, when a correctly signed call arrives, then the response is 404 `SESSION_NOT_FOUND`. (Contract)
- AC7. Given a session still in progress, when a correctly signed `PAID` call arrives, then the response is 409 `SESSION_NOT_CHECKED_OUT` and the session is not paid. (R6)
- AC8. Given the database is unavailable, when a correctly signed call arrives, then the response is 500 `INTERNAL_ERROR` with no internal details. (R7)
- AC9. Given a call with `X-Terminal-Compat: 1` and no valid signature, when it arrives, then the response is 401 and the session is unchanged. (R1)
- AC10. Given a correctly signed `PAID` call that got 409 because the session was still in progress, when the session is checked out and the same call (same `paymentId`) arrives again, then the response is 200 and the session is paid. (R5)

## Assumptions
- A1. Idempotency is keyed on `paymentId` and enforced by the database, so two calls at the same moment cannot both be recorded. Reason: the provider retries the same call, and `paymentId` identifies it.
- A2. A paid session stays paid; a later `FAILED` call for another `paymentId` does not undo it. Reason: money was already confirmed.
- A3. The provider charges the amount we gave the gate, so `amount` is checked for shape only and a wrong amount is not caught. Reason: the brief doesn't say how the provider and the gate talk to each other. Comparing it (which needs `amountDue` saved at check-out) goes on the roadmap.

## Open questions
- Q2. How does the exit gate learn that a session is paid? The brief gives no endpoint or field. Proceeding with: out of scope, only the paid state is recorded.
- Q3. What if a different `paymentId` pays an already paid session? Proceeding with: treated like any other `PAID` call for a checked-out session (200, still paid).
