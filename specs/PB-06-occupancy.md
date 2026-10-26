# PB-06 Occupancy

Status: Draft · Date: 2026-10-26 · Story: PB-06 in BRIEF.md

## Goal
Anyone, including the public entrance display, can see for every space whether it is taken, so the display can show when the garage is full for a vehicle type.

## Requirements
- R1. The endpoint MUST be public: no API key or signature is required.
- R2. The response MUST list every space of the building exactly once, ordered by `parkingSpaceId`, with its `vehicleType` and `isOccupied`.
- R3. A space MUST be occupied if and only if it has a session in progress (checked in, not yet checked out).
- R4. The response MUST NOT contain personal data (license plates) or session ids.
- R5. Error responses MUST NOT leak internal details (stack traces, SQL, library names).

## Contract
```
GET /occupancy
200: [ { "parkingSpaceId": number, "vehicleType": "CAR" | "MOTOR", "isOccupied": boolean } ]
Error: { "error": "<CODE>" }
```

| Status | Code | When |
|---|---|---|
| 500 | `INTERNAL_ERROR` | Any unexpected failure, such as the database being unavailable |

## Acceptance criteria
- AC1. Given no sessions in progress, when anyone calls `GET /occupancy` without credentials, then the response is 200 with all 150 spaces, each `isOccupied: false`, ordered by `parkingSpaceId`, and each entry has exactly the fields `parkingSpaceId`, `vehicleType` and `isOccupied`. (R1, R2, R3, R4)- AC2. Given a session in progress on a space, when occupancy is requested, then that space is `isOccupied: true` and all others are false. (R3)
- AC3. Given that session is then checked out, when occupancy is requested, then the space is `isOccupied: false`. (R3)
- AC4. Given any state, when occupancy is requested, then no entry has fields other than `parkingSpaceId`, `vehicleType` and `isOccupied`. (R4)
- AC5. Given the database is unavailable, when occupancy is requested, then the response is 500 `INTERNAL_ERROR` with no internal details. (R5)

## Assumptions
- A1. `vehicleType` is `CAR` for spaces 1–130 (including residents' 1–50) and `MOTOR` for 131–150. Reason: the brief only has two types and no field to tell resident spaces apart.
- A2. The response is not paginated or cached. Reason: 150 spaces is small, and a display needs current data.
- A3. No rate limiting on the public endpoint. Reason: not in the brief; listed as an open question.

## Open questions
- Q1. Should residents' spaces (1–50) be shown to the display as `CAR` spaces? Proceeding with: yes, per A1, the display can't tell them apart (the brief's shape has no field for it).
- Q2. Should the response include a floor or a per-type free count for the display? Proceeding with: no, the brief shape only (extension is optional).
- Q3. Should the public endpoint be rate limited? Proceeding with: no (A3).