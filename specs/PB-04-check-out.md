# PB-04 Check out

Status: Draft · Date: 2026-10-25 · Story: PB-04 in BRIEF.md

## Goal
An exit gate can check out a session in progress, which ends the session, frees its space and tells the driver what to pay.

## Requirements
- R1. Only callers with a valid gate API key MUST be able to check out.
- R2. The API MUST reject malformed input with a 400 response.
- R3. A successful check-out MUST end the session with its end time in UTC and free its space for new check-ins.
- R4. `sessionLengthInMinutes` MUST be the whole minutes between check-in and check-out, rounded down.
- R5. `amountDue` MUST follow the tariff of the session's space. Tariffs are stored data per zone that can change without a code change, starting as: residents free, cars €5,00 per started hour capped at €30,00 per calendar day, motorcycles €3,00 per started hour capped at €18,00 per calendar day.
- R6. A started hour MUST count toward the Amsterdam calendar day it starts in, and each day's total MUST be capped separately.
- R7. Checking out a session that is already checked out MUST return the result of the first check-out and change nothing, including when two check-outs happen at the same moment.
- R8. Error responses MUST NOT leak internal details (stack traces, SQL, library names).

## Contract
```
POST /check-out
Header:  X-Api-Key: <gate key>
Request: { "parkingSessionId": "uuid", "isResident": boolean }
200:     { "parkingSpaceId": number, "sessionLengthInMinutes": number, "amountDue": { "value": integer cents, "currency": "EUR" } }
Error:   { "error": "<CODE>" }
```

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | Body is not JSON, a field is missing or has the wrong type, `parkingSessionId` is not a UUID, or there are unknown fields |
| 401 | `UNAUTHORIZED` | `X-Api-Key` is missing or wrong |
| 404 | `SESSION_NOT_FOUND` | No session with that id exists in this building |
| 500 | `INTERNAL_ERROR` | Any other unexpected failure |

Gates SHOULD retry on 5xx and timeouts, a few times with exponential backoff. Retrying is safe because of R7. Gates SHOULD NOT retry on 4xx: the same request gets the same answer.

## Acceptance criteria
All times are Amsterdam local time.
- AC1. Given a visitor car checked in at 09:00, when it checks out at 10:40, then the response is 200 with its space, `sessionLengthInMinutes` 100 and `amountDue` `{ "value": 1000, "currency": "EUR" }`, and the space is free. (R3, R4, R5)
- AC2. Given a visitor motorcycle checked in at 09:00, when it checks out at 10:40, then `amountDue` is 600 EUR. (R5)
- AC3. Given a resident checked in at 09:00, when it checks out the next day at 18:00, then `amountDue` is 0 EUR. (R5)
- AC4. Given a visitor car checked in at 08:00, when it checks out at 20:00 the same day, then `amountDue` is 3000 EUR. (R5)
- AC5. Given a visitor car checked in at 10:00, when it checks out at 10:00 the next day, then `sessionLengthInMinutes` is 1440 and `amountDue` is 6000 EUR (14 hours on day 1 capped at 3000, 10 hours on day 2 capped at 3000). (R4, R6)
- AC6. Given a visitor car checked in at 09:00:00, when it checks out at 09:00:59, then `sessionLengthInMinutes` is 0 and `amountDue` is 500 EUR. (R4, R5)
- AC7. Given the car tariff is changed in the data to €4,00 per hour, when a visitor car checks out after 100 minutes, then `amountDue` is 800 EUR. (R5)
- AC8. Given a session that was checked out, when the gate checks it out again (one after the other or two at the same moment), then every response is 200 with the same body, and the end time is the first one. (R7)
- AC9. Given a missing or wrong `X-Api-Key`, when the gate checks out, then the response is 401 and the session is unchanged. (R1)
- AC10. Given a body with a missing field, a wrong type, a non-UUID id or an unknown field, when the gate checks out, then the response is 400. (R2)
- AC11. Given no session with that id, when the gate checks out, then the response is 404 `SESSION_NOT_FOUND`. (Contract)
- AC12. Given the database is unavailable, when the gate checks out, then the response is 500 `INTERNAL_ERROR` with no internal details. (R8)

## Assumptions
- A1. Gates use the same API key as check-in. Reason: same callers as PB-03.
- A2. `amountDue` is `{ value, currency }` in integer cents. Reason: same shape as the PB-05 webhook `amount`, and the money rule in AGENTS.md.
- A3. Started hours are counted from the check-in time in elapsed time, so a 23-hour or 25-hour DST day doesn't change the count. Reason: the driver pays for time actually parked.
- A4. Any session longer than 0 seconds pays at least one started hour. Reason: the tariff says "per started hour" and names no grace period.
- A5. The space is freed at check-out, not at payment. Reason: the vehicle has left the space when it reaches the exit gate.
- A6. A repeat check-out returns 200 with the first result instead of 409. Reason: a gate that timed out on the first call still needs the amount.

## Open questions
- Q1. The brief's example (09:00 → 10:40 pays €8,33) contradicts its own tariff: €8,33 is per-minute pricing (100 × €5,00 / 60), while "€5,00 per started hour" gives €10,00. Proceeding with: the tariff table, €10,00 (AC1).
- Q2. What should `isResident` do at check-out? The session already knows its space. Proceeding with: required and validated, but the price follows the space's zone, and a mismatch is not an error.
- Q3. Should a free (0 EUR) check-out mark the session as paid so the gate opens without PB-05? Proceeding with: out of scope here, decide in the PB-05 spec.
