# PB-03 Check in

Status: Draft · Date: 2026-10-25 · Story: PB-03 in BRIEF.md

## Goal
An entrance gate can check a vehicle in, which starts a parking session and gives the vehicle a free space of the right kind, even when both gates call at the same moment.

## Requirements
- R1. Only callers with a valid gate API key MUST be able to check in.
- R2. The API MUST reject malformed input with a 400 response.
- R3. A successful check-in MUST start a session, with its start time in UTC, on a free space that matches the vehicle. Which spaces match is stored data that can change without a code change, starting as 1–50 for residents, 51–130 for visitor cars and 131–150 for visitor motorcycles.
- R4. A space MUST NOT have more than one session in progress (checked in, not yet checked out), including when two check-ins happen at the same moment.
- R5. A license plate MUST NOT have more than one session in progress, so a repeated check-in (for example a gate retry) creates nothing.
- R6. When no matching space is free, the check-in MUST fail and create nothing.
- R7. Error responses MUST NOT leak internal details (stack traces, SQL, library names).

## Contract
```
POST /check-in
Header:  X-Api-Key: <gate key>
Request: { "vehicleType": "CAR" | "MOTOR", "isResident": boolean, "licensePlate": string (1–20 chars: letters, digits, spaces, hyphens, with at least one letter or digit) }
201:     { "parkingSessionId": "uuid", "parkingSpaceId": number }
Error:   { "error": "<CODE>" } (409 ALREADY_CHECKED_IN also has "sessionId")
```

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | Body is not JSON, a field is missing or has the wrong type or format, or there are unknown fields |
| 401 | `UNAUTHORIZED` | `X-Api-Key` is missing or wrong |
| 409 | `ALREADY_CHECKED_IN` | The plate already has a session in progress. Body includes that session's `sessionId` |
| 409 | `NO_SPACE_AVAILABLE` | No matching space is free |
| 503 | `CHECK_IN_CONTENDED` | Concurrent check-ins kept taking the chosen space, and the server gave up after 2 retries |
| 500 | `INTERNAL_ERROR` | Any other unexpected failure |

Gates SHOULD retry only on 5xx and timeouts, a few times with exponential backoff, and never on 4xx.

## Acceptance criteria
- AC1. Given free spaces, when a visitor `CAR`, a visitor `MOTOR` and a resident check in, then each gets 201 with a new session id and a space in 51–130, 131–150 and 1–50 respectively. (R3)
- AC2. Given a missing or wrong `X-Api-Key`, when the gate checks in, then the response is 401 and no session is created. (R1)
- AC3. Given a body with a missing field, a wrong type, an invalid plate or an unknown field, when the gate checks in, then the response is 400 and no session is created. (R2)
- AC4. Given plate `AB-123-C` has a session in progress, when `ab 123 c` checks in, then the response is 409 `ALREADY_CHECKED_IN` with the existing `sessionId`, and no new session is created. (R5)
- AC5. Given all matching spaces are taken, when a vehicle checks in, then the response is 409 `NO_SPACE_AVAILABLE` and no session is created. (R6)
- AC6. Given one free matching space, when two different vehicles check in at the same moment, then exactly one gets 201, the other gets 409 `NO_SPACE_AVAILABLE` or 503 `CHECK_IN_CONTENDED`, and the space has one session in progress. (R4)
- AC7. Given the database is unavailable, when the gate checks in, then the response is 500 `INTERNAL_ERROR` with no internal details. (R7)
- AC8. Given space 60 is changed to serve visitor `MOTOR` in the data, when a visitor `MOTOR` checks in and 131–150 are full, then it gets space 60. (R3)

## Assumptions
- A1. Gates authenticate with a shared API key from an environment variable. Reason: simplest option the brief allows ("up to you").
- A2. A repeated check-in returns 409 with the existing `sessionId` instead of a second 201. Reason: no idempotency keys needed, and the gate can tell a retry from a real conflict.
- A3. Plates are compared in uppercase with spaces and hyphens removed. Reason: `AB-123-C` and `ab 123 c` are the same car.
- A4. The lowest-numbered free matching space is given. Reason: deterministic and easy to test.
- A5. Spaces belong to a building and a space number is unique per building. The request has no building, and the API serves only `PB-AMS-2M8D`. Reason: the pilot has one building, and more are coming.

## Open questions
- Q1. `isResident` is what the driver pressed, and nothing checks it. Anyone can park free by pressing *resident*. Proceeding with: trust it for the pilot and list it in `ROADMAP.md`.
