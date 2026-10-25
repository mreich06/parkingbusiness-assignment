# PB-03 Check in

Status: Draft · Date: 2026-10-25 · Story: PB-03 in BRIEF.md

## Goal
An entrance gate can check a vehicle in, which starts a parking session and gives the vehicle a free space of the right kind, even when both gates call at the same moment.

## Definitions
- **Active session**: a session that has started and has not been checked out.
- **Free space**: a space with no active session.
- **Right kind of space**: residents get spaces 1–50. Visitors with a `CAR` get 51–130. Visitors with a `MOTOR` get 131–150.

## Requirements
- R1. Only callers with a valid gate API key MUST be able to check in.
- R2. The API MUST reject malformed input before doing anything else.
- R3. A successful check-in MUST create one active session on one free space of the right kind, with its start time in UTC.
- R4. A space MUST NOT have more than one active session, including when two check-ins happen at the same moment.
- R5. A license plate MUST NOT have more than one active session. A repeated check-in (for example a gate retry) MUST NOT create a second session.
- R6. When no space of the right kind is free, the check-in MUST fail and create nothing.
- R7. Error responses MUST NOT leak internal details (stack traces, SQL, library names).

## Contract
```
POST /check-in
Header:  X-Api-Key: <gate key>
Request: { "vehicleType": "CAR" | "MOTOR", "isResident": boolean, "licensePlate": string (1–20 chars, letters, digits, spaces, hyphens) }
201:     { "parkingSessionId": "uuid", "parkingSpaceId": number }
Error:   { "error": "<CODE>" } (409 ALREADY_CHECKED_IN also has "sessionId")
```

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | Body is not JSON, a field is missing or has the wrong type or format, or there are unknown fields |
| 401 | `UNAUTHORIZED` | `X-Api-Key` is missing or wrong |
| 409 | `ALREADY_CHECKED_IN` | The plate already has an active session. Body includes that session's `sessionId` |
| 409 | `NO_SPACE_AVAILABLE` | No free space of the right kind |
| 503 | `CHECK_IN_CONTENDED` | Concurrent check-ins kept taking the chosen space, and the server gave up after 2 retries |
| 500 | `INTERNAL_ERROR` | Any other unexpected failure |

Gates SHOULD retry only on 5xx and timeouts, a few times with exponential backoff, and never on 4xx.

## Acceptance criteria
- AC1. Given a valid key and a visitor `CAR` with a free space in 51–130, when the gate checks in, then the response is 201 with a new session id and a space in 51–130. (R3)
- AC2. Given a visitor `MOTOR`, when it checks in, then the space is in 131–150. Given a resident, then the space is in 1–50. (R3)
- AC3. Given a missing or wrong `X-Api-Key`, when the gate checks in, then the response is 401 and no session is created. (R1)
- AC4. Given a body with a missing field, a wrong type, an invalid plate or an unknown field, when the gate checks in, then the response is 400 and no session is created. (R2)
- AC5. Given plate `AB-123-C` has an active session, when it checks in again, then the response is 409 `ALREADY_CHECKED_IN` with the existing `sessionId`, and no new session is created. (R5)
- AC6. Given plate `ab 123 c` when `AB-123-C` has an active session, when it checks in, then the response is 409 `ALREADY_CHECKED_IN`. (R5)
- AC7. Given all spaces of the right kind are taken, when a vehicle checks in, then the response is 409 `NO_SPACE_AVAILABLE` and no session is created. (R6)
- AC8. Given one free space of the right kind, when two different vehicles check in at the same moment, then exactly one gets 201 and the other gets 409 `NO_SPACE_AVAILABLE` (or 503 `CHECK_IN_CONTENDED`), and the space has one active session. (R4)
- AC9. Given many free spaces, when N different vehicles check in at the same moment, then every 201 has a different space. (R4)
- AC10. Given the database is unavailable, when the gate checks in, then the response is 500 `INTERNAL_ERROR` with no internal details. (R7)

## Assumptions
- A1. Gates prove who they are with a shared API key in `X-Api-Key`, read from an environment variable. Reason: simplest option that the brief allows ("up to you").
- A2. One active session per plate, and a second check-in returns 409 with the existing `sessionId`. Reason: covers gate retries after a timeout without needing idempotency keys, and the gate can tell a retry from a real conflict.
- A3. Plates are compared in uppercase with spaces and hyphens removed. Reason: `AB-123-C` and `ab 123 c` are the same car.
- A4. The lowest-numbered free space of the right kind is given. Reason: deterministic and easy to test.
- A5. A full garage returns 409, not 503. Reason: it is a normal business state, not a server failure, and retrying won't help.
- A6. Spaces belong to a building and a space number is unique per building. The request has no building, and the API serves only `PB-AMS-2M8D`. Reason: the pilot has one building, and more are coming.
- A7. The server does not retry a request after a 500. Reason: a hidden retry only adds latency. The gate retries, and R5 makes that safe.

## Open questions
- Q1. Do residents with a `MOTOR` get a resident space (1–50) or a motorcycle space (131–150)? Proceeding with: 1–50 for any resident.
- Q2. `isResident` is what the driver pressed, and nothing checks it. Anyone can park free by pressing *resident*. Proceeding with: trust it for the pilot and list it in `ROADMAP.md`.
- Q3. When resident spaces are full, may a resident use a visitor space (and pay)? Proceeding with: no, return 409 `NO_SPACE_AVAILABLE`.
- Q4. Does each gate get its own key, so keys can be revoked one at a time? Proceeding with: one shared key for the pilot.
