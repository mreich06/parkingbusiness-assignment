# PB-06 Occupancy

Status: Implemented · Date: 2026-10-26 · Story: PB-06 in BRIEF.md

## Goal
Anyone, including the public entrance display, can see for every space whether it is taken, so the display can show when the garage is full for a vehicle type.

## Requirements
- R1. The endpoint MUST be public: no API key or signature is required.
- R2. The response MUST list every space of the building exactly once, ordered by `parkingSpaceId`, with its `vehicleType` and `isOccupied`.
- R3. A space MUST be occupied if and only if it has a session in progress (checked in, not yet checked out).
- R4. Error responses MUST NOT leak internal details (stack traces, SQL, library names).

## Contract
```
GET /occupancy
200: [ { "parkingSpaceId": number, "vehicleType": "CAR" | "MOTOR" | null, "isOccupied": boolean } ]
Error: { "error": "<CODE>" }
```

| Status | Code | When |
|---|---|---|
| 500 | `INTERNAL_ERROR` | Any unexpected failure, such as the database being unavailable |

## Acceptance criteria
- AC1. Given no sessions in progress, when anyone calls `GET /occupancy` without credentials, then the response is 200 with all spaces of the building, each `isOccupied: false`, ordered by `parkingSpaceId`, and `vehicleType` is `CAR` or `MOTOR` for visitor spaces and `null` for resident spaces. (R1, R2, R3)
- AC2. Given a session in progress on a space, when occupancy is requested, then that space is `isOccupied: true` and all others are false. (R3)
- AC3. Given that session is then checked out, when occupancy is requested, then the space is `isOccupied: false`. (R3)
- AC4. Given the database is unavailable, when occupancy is requested, then the response is 500 `INTERNAL_ERROR` with no internal details. (R4)

## Assumptions
- A1. `vehicleType` is `null` for resident spaces, which serve any vehicle type. Reason: stored zone data has no vehicle type for residents, and the brief's `CAR | MOTOR` would misstate them.
- A2. The response is not paginated or cached. Reason: 150 spaces is small, and a display needs current data.

## Open questions
- Q1. Should the public endpoint be rate limited? Proceeding with: no, the brief doesn't ask for it.
