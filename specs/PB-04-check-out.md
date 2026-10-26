# PB-04 Check out

Status: Implemented · Date: 2026-10-25 · Story: PB-04 in BRIEF.md

## Goal
An exit gate can check out a session in progress, which ends the session, frees its space and tells the driver what to pay.

## Requirements
- R1. Only callers with a valid gate API key MUST be able to check out.
- R2. The API MUST reject malformed input with a 400 response.
- R3. A successful check-out MUST end the session with its end time in UTC and free its space for new check-ins.
- R4. `sessionLengthInMinutes` MUST be the whole minutes between check-in and check-out, rounded down.
- R5. `amountDue` MUST follow the tariff of the session's space: residents free, cars €5,00 per started hour capped at €30,00 per calendar day, motorcycles €3,00 per started hour capped at €18,00 per calendar day.
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

Gates SHOULD retry on 5xx and timeouts, up to 3 times, so a driver isn't stuck at the exit because of a temporary failure. Retrying is safe because of R7. Gates SHOULD NOT retry on 4xx: the same request gets the same answer.

## Acceptance criteria
Times are Amsterdam local time. Amounts are written as euros, with `amountDue.value` in cents in brackets.
- AC1. Given a visitor car, a visitor motorcycle and a resident each checked in at 09:00, when they check out at 10:40, then each gets 200 with its space and `sessionLengthInMinutes` 100, `amountDue` is €10,00 (1000), €6,00 (600) and €0,00 (0) in EUR respectively, and the spaces are free. (R3, R4, R5)
- AC2. Given a visitor car checked in at 10:00, when it checks out at 10:00 the next day, then `sessionLengthInMinutes` is 1440 and `amountDue` is €60,00 (6000): 14 hours on day 1 capped at €30,00, 10 hours on day 2 capped at €30,00. (R6)
- AC3. Given a session that was checked out, when the gate checks it out again (one after the other or two at the same moment), then every response is 200 with the same body, and the end time is the first one. (R7)
- AC4. Given a missing or wrong `X-Api-Key`, when the gate checks out, then the response is 401 and the session is unchanged. (R1)
- AC5. Given a body with a missing field, a wrong type, a non-UUID id or an unknown field, when the gate checks out, then the response is 400. (R2)
- AC6. Given no session with that id, when the gate checks out, then the response is 404 `SESSION_NOT_FOUND`. (Contract)
- AC7. Given the database is unavailable, when the gate checks out, then the response is 500 `INTERNAL_ERROR` with no internal details. (R8)

## Assumptions
- A1. `amountDue` is `{ value, currency }` in integer cents. Reason: same shape as the PB-05 webhook `amount`, and the money rule in AGENTS.md.
- A2. Started hours are counted in elapsed time from check-in, so a 23-hour or 25-hour DST day doesn't change the count. Reason: the driver pays for time actually parked.
- A3. A repeat check-out returns 200 with the first result instead of 409. Reason: a gate that timed out on the first call still needs the amount.

## Open questions
- Q1. The brief's example (09:00 → 10:40 pays €8,33) contradicts its own tariff: €8,33 is per-minute pricing (100 × €5,00 / 60), while "€5,00 per started hour" gives €10,00. Proceeding with: the tariff table, €10,00 (AC1).
- Q2. The brief doesn't say what `isResident` does at check-out. Proceeding with: required, but the price follows the session's space.
- Q3. Can tariffs change, or differ per building? Proceeding with: out of scope for now, the tariffs in R5 are fixed.
