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

16:25
Added linting and CI 
Asked agent to propose linting and CI checks that would validate rules. It proposed a massive list. I felt it over-engineered, much of this was more suitable for a large project, with multiple developers and PRs so I asked it to re-order based on importance
I chose these rules: block Prisma imports in controllers, no-disabled-test, no-focused-tests, no-console, and a CI job to ensure no console logs are committed, and no skipped tests 
Mistake: It forgot to set up eslint config file, so I asked it to do this, and added prisma lines to ci which will cause it to fail, I commented them for now.

