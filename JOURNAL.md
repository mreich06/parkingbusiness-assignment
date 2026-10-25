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

Switched to Sonnet 5.5 here for the implementation
19:49 
Asked agent to set up docker yml file, create database schema, migration and seed data
It just added Zone, Space, Session which is all that is needed for PB-03 and looks good

I asked agent to set up the check-in service and tests. Looks good. One small mistake - toUpperCase() was not used on the license plate, so I added it. 
It properly checks for an existing plate first and throws 409 if existing, then claims the lowest free space and retries twice if the unique index rejects a collision

20:20
Added the concurrency test with 10 rounds for two vehicles check in at the same moment. A vehicle gets one space, the other rejected as expected. AC1, AC4, AC5, AC6 and AC8 is now covered 
I see 503 is not covered in this test, agent suggested covering it, but it only happens when a check-in loses a race 3 times in a row, I decided its not worth the extra code for this scale

Then I did the endpoint, validation and authentication flow
Mistake: the spec says to handle malformed requests with { "error": "INVALID_REQUEST" }, An e2e test showed this issue, so I had the agent fix it and add an error filter to match the spec.  
Ran /review and it listed some missing AC's not covered
I chose the most important:
- test for 409 with the existing session id when the plate is already checked in
- Review also found that a plate of only spaces or hyphens passed validation, so I added a "at least one letter or digit" rule to the spec and code

Total time for PB-02 + PB03 - 1 hour 20 minutes 
Total percentage used: 14% of 5 hour limit

------------------------------------------------------------------------------------------------------------------------------
PB04
Date: October 25
21:55
Traps in the brief I noticed: The brief mentions €5 per started hour for cars and €3 for motorcycles, but the example in PB-04 says a car checked in from 09:00 to 10:40 pays €8,33, which is inconsistent. I will used the started hour rule. In a real work environment, I would ask the lead/PM for clarification

Some things I considered
- Account for days of the year in which the time moves forward or back by an hour, this should not incorrectly over or undercharge a customer. The daily cap applies per Amsterdam calendar day, and days with 23 or 25 hours must charge by actual elapsed time
Edge cases: 
an unknown session (4xx error), a session already checked out (gate retry issue)

I added new rules to write-spec to improve the spec editing process and reduce time for editing

Asked agent to draft spec with Opus 5.5
Mistakes:
- The way it used currency was confusing. For example "AC2. Given a visitor motorcycle checked in at 09:00, when it checks out at 10:40, then `amountDue` is 600 EUR. (R5)". I asked it to clarify that the integer value is in cents, not euros 
- This line "Gates SHOULD retry on 5xx and timeouts, a few times with exponential backoff." - Not the right approach, exponential backoff stops many clients from retrying at once to avoid overwhelming a server. Here, we only have 2 gates 
- Too long again but better, with some questions and assumptions that can be dropped for a small project 

22:20
Asked agent for prisma models for PB-04. It correctly added Building and Tariff and linked them to Zone with buildingId and tariffId foreign keys

22:30
Asked agent to implement pricing logic and tests. I thought of one case while reviewing that it didn't catch - a capped stay with the clock change happening at the same time- "car 20:00 to 00:30 over the 25-hour DST day, each day capped" A car parked for 25 hours with the clock moving back an hour should still be charged 25 hours. Could cause customer service issues if they think they're overcharged. I will leave it for now

22:45
The agent wrote the check-out service correctly and wrote the logic for the /check-out endpoint, and it correctly wrote the route, with tests checking the happy path, 401, and 404 and an idempotency check 
Mistake: it should free a space that has been checked out so it can be reused, added the test