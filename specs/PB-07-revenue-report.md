# PB-07 Revenue report

Status: Draft · Date: 2026-10-27 · Story: ROADMAP.md item 3

## Goal
The business owner can see the revenue and number of paid sessions of the building for a period of calendar days.

## Requirements
- R1. The endpoint MUST require a valid `x-api-key` header matching `REPORT_API_KEY`. The gate key MUST NOT be accepted.
- R2. A session MUST count towards a day if its `paidAt` falls on that calendar day in the building's timezone.
- R3. A session's revenue MUST be the amount due at its check-out, calculated with the existing check-out pricing.
- R4. `from` and `to` MUST be calendar dates (`YYYY-MM-DD`), both included, with `from` not after `to` and at most 366 days in total. The limit caps how many sessions one request recalculates, and one year covers normal reports.
- R5. Error responses MUST NOT leak internal details (stack traces, SQL, library names).

## Contract
```
GET /reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
Header: x-api-key: <REPORT_API_KEY>
200: { "from": string, "to": string, "paidSessions": number, "revenue": { "value": integer cents, "currency": "EUR" } }
Error: { "error": "<CODE>" }
```

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | `from` or `to` is missing, not a valid date, `from` is after `to`, or the period is longer than 366 days |
| 401 | `UNAUTHORIZED` | `x-api-key` is missing or doesn't match `REPORT_API_KEY` |
| 500 | `INTERNAL_ERROR` | Any unexpected failure, such as the database being unavailable |

## Acceptance criteria
- AC1. Given two car sessions paid on 2026-10-01 (amounts due 1500 and 3000 cents) and one paid on 2026-10-02, when the owner requests `from=2026-10-01&to=2026-10-01`, then the response is 200 with `paidSessions: 2` and `revenue: { value: 4500, currency: "EUR" }`. (R1, R2, R3)
- AC2. Given a session checked out but not paid, and a session paid at 23:30 UTC on 2026-10-01 (01:30 on 2026-10-02 in Amsterdam), when the owner requests `from=2026-10-01&to=2026-10-01`, then neither is counted (the second counts on 2026-10-02). (R2)
- AC3. Given no paid sessions in the period, when the owner requests it, then the response is 200 with `paidSessions: 0` and `revenue.value: 0`. (R2)
- AC4. Given an invalid period (missing `to`, `from=2026-13-01`, `from` after `to`, or 367 days), when the owner requests it, then the response is 400 `INVALID_REQUEST`. (R4)
- AC5. Given no key, a wrong key or the gate key, when the report is requested, then the response is 401 `UNAUTHORIZED`. (R1)
- AC6. Given the database is unavailable, when the report is requested, then the response is 500 `INTERNAL_ERROR` with no internal details. (R5)

## Assumptions
- A1. Revenue is recalculated from check-in, check-out and the current tariff, not read from stored payments. Reason: payment amounts aren't stored, and this needs no schema change. It is fine at pilot scale. With more buildings or longer periods, storing `amountDue` at check-out would make it one SQL sum.
- A2. Only the pilot building is reported. Reason: the API serves one building until ROADMAP item 1.
- A3. The owner gets a separate key from the gates. Reason: gates should not be able to read revenue. In production the owner would sign in with a real login and roles instead.

## Open questions
- Q1. If a tariff changes, past revenue would be recalculated at the new price. Fixing this needs a history of tariff prices, for example `validFrom` and `validTo` columns on `Tariff`, so each session is priced with the tariff that was valid at its check-out. Proceeding with: accept it for now, and add tariff history as a separate change.
