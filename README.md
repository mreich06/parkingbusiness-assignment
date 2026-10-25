# ParkingBusiness parking garage API

Backend for the ParkingBusiness pilot in building `PB-AMS-2M8D`: check-in, check-out, payment confirmation and occupancy. The assignment is in [BRIEF.md](BRIEF.md).

## Status

Work in progress. The workspace is set up (PB-01): NestJS app, lint, tests, CI and agent instructions. The endpoints are not built yet.

- The API starts, but has no routes.
- Prisma is installed with an empty schema (no models, no migrations). Postgres and Docker are not set up yet.
- There are no specs in `specs/` yet.
- `ROADMAP.md` does not exist yet.

## Stack

Node 24, TypeScript, NestJS 12 (ESM), Prisma 7 with the `@prisma/adapter-pg` driver adapter, Jest and ESLint. Planned: PostgreSQL 16 and Docker.

## Getting started

You need Node 24 (for example `nvm use 24`). Older Node versions can fail on install.

```bash
# Clone with the submodule (agent rules and skills)
git clone --recurse-submodules <repo-url>
# Already cloned without it? git submodule update --init

cd api
npm ci

# prisma.config.ts requires DATABASE_URL. `prisma generate` never connects,
# so any valid URL works until Postgres is set up.
export DATABASE_URL=postgresql://user:pass@localhost:5432/db
npx prisma generate

npm run start:dev   # listens on port 3000, or $PORT
```

## Commands

Run from `api/`.

| Task | Command |
|---|---|
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Unit tests | `npm test` |
| E2E tests | `npm run test:e2e` |
| Build | `npm run build` |
| Regenerate the Prisma client | `npx prisma generate` (needs `DATABASE_URL`) |

`npm test` and `npm run test:e2e` pass today because there are no tests yet (`--passWithNoTests`).

Tests run Jest in ESM mode, because Nest 12 is ESM-only. The npm scripts already pass the needed `--experimental-vm-modules` flag, so Node prints a harmless warning.

## Lint rules

Some rules in [AGENTS.md](AGENTS.md) are enforced by ESLint (`api/eslint.config.mjs`):

- no `console` calls
- no skipped or focused tests
- no Prisma imports in controllers
- no local-time `Date` methods (timestamps are UTC)
- no `parseFloat` (money is integer cents)
- no floating promises

## Payment webhook simulator

`simulator/` sends signed payment confirmations, the way the payment provider does. The webhook endpoint it calls (`/webhooks/payments`) is not built yet.

```bash
cd simulator
npm install
export WEBHOOK_SECRET=<the secret your API uses to verify payment calls>
npm run send -- --session <parkingSessionId> --amount 1500
npm test    # tests for the signing code
```

More options are in [simulator/README.md](simulator/README.md).

## CI

`.github/workflows/ci.yml` runs one job, `verify`, on every push, in `api/`:

1. `npm ci`
2. `npx prisma generate` (with a placeholder `DATABASE_URL`)
3. `npm run lint`
4. `npx tsc --noEmit`
5. a grep that fails on `console` calls and skipped or focused tests, as a backstop for the lint rules
6. `npm test`
7. `npm audit --audit-level=high`, then the same audit in `simulator/`

CI does not start Postgres yet.

`api/package.json` pins `multer` to `^2.5.0` with an npm override, because Nest 12's `platform-express` pulls in a version with a high-severity advisory. Remove the override once Nest ships a fixed release.

## Working with AI agents

- [AGENTS.md](AGENTS.md): stack, commands, where things live, workflow and rules for agents. It points to `.agent-context/AGENTS.md` for the shared rules.
- `.claude/skills/write-spec/`: skill and template for writing a spec before building a feature.
- `.claude/skills/review/`: skill for reviewing finished work against its spec and the rules.
- [JOURNAL.md](JOURNAL.md): dated log of decisions, agent mistakes, tools and time spent.

`.agent-context/` is a git submodule, and `.claude/skills` links into it. Clone with `--recurse-submodules` or the skills will be missing.

## Repository layout

```
api/             NestJS app (src/, prisma/, test/)
simulator/       payment provider simulator
specs/           one spec per feature, written before the code
.agent-context/  shared agent rules and skills (git submodule)
.claude/skills/  link to the skills in .agent-context
.github/         CI workflow
BRIEF.md         the assignment
AGENTS.md        instructions for agents
JOURNAL.md       decision log
```
