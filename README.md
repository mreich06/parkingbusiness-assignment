# ParkingBusiness parking garage API

Backend for the ParkingBusiness pilot in building `PB-AMS-2M8D`: check-in, check-out, payment confirmation and occupancy. The assignment is in [BRIEF.md](BRIEF.md).

## Endpoints

| Endpoint | Who calls it | Auth | Spec |
|---|---|---|---|
| `POST /check-in` | entrance gate | `X-Api-Key: $GATE_API_KEY` | [PB-03](specs/PB-03-check-in.md) |
| `POST /check-out` | exit gate | `X-Api-Key: $GATE_API_KEY` | [PB-04](specs/PB-04-check-out.md) |
| `POST /webhooks/payments` | payment provider | `X-Signature`: HMAC-SHA256 of the raw body with `WEBHOOK_SECRET` | [PB-05](specs/PB-05-payment-confirmation.md) |
| `GET /occupancy` | entrance display | none, public | [PB-06](specs/PB-06-occupancy.md) |

Errors are always `{ "error": "<CODE>" }`, with no internal details. Money is integer cents with a currency, and timestamps are UTC. Each spec lists its status codes.

## Stack

Node 24, TypeScript, NestJS 12 (ESM), Prisma 7 with the `@prisma/adapter-pg` driver adapter, Jest and ESLint. PostgreSQL 16 and Docker.

## Getting started

You need Node 24 (for example `nvm use 24`). Older Node versions can fail on install.

```bash
# Clone with the submodule (agent rules and skills)
git clone --recurse-submodules https://github.com/mreich06/parkingbusiness-assignment.git
# Already cloned without it? git submodule update --init

cd api
npm ci

# Settings live in .env at the repo root. Replace the change-me values: GATE_API_KEY (gates
# send it in X-Api-Key) and WEBHOOK_SECRET (shared with the payment provider, signs POST /webhooks/payments)
cp ../.env.example ../.env
docker compose -f ../docker-compose.yml up -d db
npx prisma migrate deploy
npx prisma generate

npm run start:dev   # listens on port 3000, or $PORT
```

Try a check-in. The response has the `parkingSessionId` that check-out and the simulator need:

```bash
curl -X POST localhost:3000/check-in -H "X-Api-Key: <GATE_API_KEY from .env>" -H 'content-type: application/json' \
  -d '{"vehicleType":"CAR","isResident":false,"licensePlate":"AB-123-C"}'
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
| Regenerate the Prisma client | `npx prisma generate` (reads `DATABASE_URL` from `.env`) |

Tests use the real database: start Postgres first. Tests delete all sessions and payments in that database, so point `DATABASE_URL` at a local or CI database only. All commands read `DATABASE_URL` and the other settings from `.env`.

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

`simulator/` sends signed payment confirmations to `/webhooks/payments`, the way the payment provider does. It signs with `WEBHOOK_SECRET` from the root `.env`, so use the same `.env` as the API.

```bash
cd simulator
npm install
npm run send -- --session <parkingSessionId> --amount 1500
npm test    # tests for the signing code
```

More options are in [simulator/README.md](simulator/README.md).

## CI

`.github/workflows/ci.yml` runs one job, `verify`, on every push, in `api/`. It starts a Postgres 16 service first, so the tests run against a real database.

1. `npm ci`
2. `npx prisma migrate deploy`
3. `npx prisma generate`
4. `npm run lint`
5. `npx tsc --noEmit`
6. a grep that fails on `console` calls and skipped or focused tests, as a backstop for the lint rules
7. `npm test`
8. `npm run test:e2e`
9. `npm audit --audit-level=high`, then the same audit in `simulator/`

`api/package.json` pins `multer` to `^2.5.0` with an npm override, because Nest 12's `platform-express` pulls in a version with a high-severity advisory. Remove the override once Nest ships a fixed release.

## Working with AI agents

- [AGENTS.md](AGENTS.md): stack, commands, where things live, workflow and rules for agents. It points to `.agent-context/AGENTS.md` for the shared rules.
- `.claude/skills/write-spec/`: skill and template for writing a spec before building a feature.
- `.claude/skills/review/`: skill for reviewing finished work against its spec and the rules.
- [JOURNAL.md](JOURNAL.md): dated log of decisions, agent mistakes, tools and time spent.

`.agent-context/` is a git submodule, and `.claude/skills` links into it. Clone with `--recurse-submodules` or the skills will be missing.

### Using the same context in another repository

A second repository, such as a frontend, uses the same rules and skills like this:

1. Add the submodule: `git submodule add https://github.com/mreich06/agent-context.git .agent-context`
2. Link the skills: `ln -s ../.agent-context/skills .claude/skills`
3. Write its own `AGENTS.md` with only its own stack, commands and rules, and point it to `.agent-context/AGENTS.md` for the shared ones (`CLAUDE.md` imports both).

A change to a shared rule or skill goes into the agent-context repository once. Each repository picks it up with `git submodule update --remote`.

## Repository layout

```
api/             NestJS app (src/, prisma/, test/)
simulator/       payment provider simulator
specs/           one spec per feature, written before the code
.agent-context/  shared agent rules and skills (git submodule)
.claude/skills/  link to the skills in .agent-context
.github/         CI workflow
BRIEF.md         the assignment
ROADMAP.md       suggested next features (PB-07)
AGENTS.md        instructions for agents
JOURNAL.md       decision log
```
