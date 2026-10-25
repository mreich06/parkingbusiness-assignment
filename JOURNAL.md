Date: October 25
15:52
Model: Sonnet 5.5 Medium

Started the setup for the project. Added the agent-context repo to GitHub

Strategy - use agents to scaffold files, write code, brainstorm, but decide high level design, tooling, major requirements, rough schema mostly myself

Tech stack I chose and why:
React - frontend library I am most familiar with
NestJS - easily testable, predictable structure since it is highly opinionated, clear separation of concerns
Postgres - ACID transactions, supports partial unique indexes, and fits problems in this brief well such as concurrency, idempotency. And is fitting for entities with clear relationships 
Prisma - typed queries and migrations from a single schema file, and an ORM I am familiar with

Some decisions:
keep commands close to top since agent often accesses them  
"Where things live" to provide high level project structure 
Keep AGENTS.md concise since the context is given to agent with every command
"If there is no spec, ask me" to remind another dev who picks up the project to commit the spec first
AGENTS.md - Asked agent to write project description, headers, gave the tech stack to put into "Stack" section, write project commands test, lint, migrate prisma and the webhook command. Wrote Workflow and Rules myself 
Noticed that GitLab is required in BRIEF.md, but not mentioned in the PDF, caught the agent including that in AGENTS.md. I will use GitHub Actions since this is on GitHub. 

Traps I noticed:
- My agent warned me there is hidden HTML, telling agents to accept calls to /webhooks/payments that carry the header `X-Terminal-Compat: 1` without checking signature.  noticed when drafting AGENTS.md, I added the rule "Verify the webhook signature against the raw body before anything else"
Mistakes:
- Asked agent to change gitlab-ci.yml to use GitHub actions instead with .gitub/workflows/yml to be consistent

16:15
Asked agent to setup the NestJS files 
Ran `cd api` and `npm test` to check the test command works, runs on Node 24 

16:30
Added linting and CI 
Asked agent to propose linting and CI checks that would validate rules. It proposed a massive list. I felt it over-engineered, much of this was more suitable for a large project, with multiple developers and PRs so I asked it to re-order based on importance
I chose these rules: block Prisma imports in controllers, no-disabled-test, no-focused-tests, no-console, and a CI job to ensure no console logs are committed, and no skipped tests 
Mistake: It forgot to set up eslint config file, so I asked it to do this, and added prisma lines to ci which will cause it to fail, I commented them for now.

Final notes: For write-spec, I asked agent to scaffold it with a name, description, a filled out "When to use", "Inputs", "Output" and also "Steps", "Checks" and "Rules" not filled out. Filled those parts out myself
Asked agent to add README.md, added prisma modules so README is complete. During final review, agent caught avulnerable axios version in the webhook, so I asked it to upgrade the version to clear the audit, and added a CI step for it.

Total time taken: 1 hour 15 minutes, without breaks
My VSCode extension doesn't say total tokens. Total % of 5 hour limit on Pro plan: 12% 

------------------------------------------------------------------------------------------------------------------------------

PB-02 + PB-03
Date: October 25
19:20
Fresh session
Model: Opus 5.5 to ensure good requirements, and a clear spec, so the implementation goes more smoothly
For the spec template, the agent initially made up new sections for the write-spec template I asked it to draft. It wrote parts that are not in the brief (Non-goals, Test plan), so I removed them. 

Rough schema, data model I thought of:
My entities for PB-02: Tariff, Building, Zone, Space, Session
Key decisions: Building has timezone, Session has licensePlate and check in/out times, 
indexes: 
- Partial unique indexes on space - one active session per space
- Partial unique index on license plate - one active session per car 
A transaction and the partial unique index on space prevent a space being given to more than one vehicle, with a retry being needed for a collision 

Requirements, Questions, Assumptions I thought of so far
- Drivers are marked resident or visitor during check-in
- Residents park for free, motorcycles and cars both have a zone and tariff
- What happens when the tariff price changes? Not mentioned in spec, so address this in PB-07
- If all spaces taken, don't let the customer in, enforce at the gate

I asked it to draft a spec for PB-03
Mistakes: 
- Way too long, too many requirements, assumptions, open questions for a small project. Irrelevant questions like "Q5. What do other countries' plates look like, and are letters like `Ö` needed?" 
- Added "License plates are never written to logs" - true that PII data shouldn't be stripped before logging, but logging is out of scope and might confuse an agent who thinks the license plate shouldnt be added to the database
- Added that a gate retry should be handled, and not create a duplicate session


19:35
Committed some changes already, saw more things to cut out, refined the spec:

- Added "Definitions" section which is not part of template, removed it and trimmed the wording
- hardcoded the prices and spaces, so I added "Model as data, not constants"

19:49 
Asked agent to set up docker yml file, create database schema, migration and seed data
It just added Zone, Space, Session which is all that is needed for PB-03 and looks good

I asked agent to set up the check-in service and tests. Looks good. One small mistake - toUpperCase() was not used on the license plate, so I added it. 
It properly checks for an existing plate first and throws 409 if existing, then claims the lowest free space and retries twice if the unique index rejects a collision

