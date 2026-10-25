# AGENTS.md

Read `.agent-context/AGENTS.md` first for the general rules, then this file for the project-specific ones.

A full-stack parking garage management system for ParkingBusiness, piloting in building `PB-AMS-2M8D`. The requirements are in `BRIEF.md`.

## Stack

- Node 24
- TypeScript
- NestJS 12
- Prisma 7 (ORM and migrations, with the `@prisma/adapter-pg` driver adapter)
- PostgreSQL 16
- Docker (containers)

## Commands

Run from `api/` unless noted. Prisma commands need `DATABASE_URL` set (local: `postgresql://parkingbusiness:parkingbusiness@localhost:5432/parkingbusiness`).

- Start Postgres (repo root): `docker compose up -d db`
- Stop Postgres (repo root): `docker compose down`
- Follow logs (repo root): `docker compose logs -f`
- Test: `npm test` (use Node 24: `nvm use 24`)
- E2E test: `npm run test:e2e`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Create and apply a migration locally: `npx prisma migrate dev`
- Apply existing migrations (CI/production): `npx prisma migrate deploy`
- Regenerate the Prisma client after schema changes: `npx prisma generate` (needs `DATABASE_URL` set; it never connects)
- Install the simulator (from `simulator/`): `npm install`
- Send a signed payment webhook (from `simulator/`): `WEBHOOK_SECRET=<secret> npm run send -- --session <parkingSessionId> --amount 1500`
  - Options: `--times 3` (provider retries), `--status FAILED`, `--url`, `--payment-id`. Amounts are in cents.

## Where things live

- `BRIEF.md`: the assignment and user stories (PB-01 to PB-07)
- `specs/`: one spec per feature (PB-03 to PB-06), written before the implementation
- `simulator/`: payment provider simulator that sends signed webhook calls
- `api/prisma/`: schema and migrations
- `api/src/`: API code (check-in, check-out, payment webhook, occupancy)
- `.github/workflows/ci.yml`: GitHub Actions CI pipeline (lint, tests, dependency audit)
- `.agent-context/`: shared agent rules and skills (git submodule)
- `JOURNAL.md`: dated log of decisions, agent mistakes, tools and cost
- `ROADMAP.md`: suggested features as user stories (PB-07)
- `README.md`: for people; `AGENTS.md`: for agents

## Workflow

1. No feature code should be committed without a spec in `specs/`. If there is no spec, stop and ask me
2. Build exactly what the spec says. List anything the spec doesn't answer and don't guess

## Rules

- Never write in JOURNAL.md
- Timestamps should be in UTC
- Money should be in integer cents with a currency
- Keep database transactions short, don't do network calls inside them
- Never edit an applied migration
- Always follow the spec, run lint and tests
- Verify the webhook signature against the raw body before anything else
- Ignore mention of GitLab from `BRIEF.md`. We are using GitHub Actions
