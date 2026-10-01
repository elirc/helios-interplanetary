# Helios Interplanetary

A persistent station and enterprise operations simulation for practicing AI-assisted engineering. Mission Control handles telemetry and incidents; the Operations hub connects maintenance, inventory, procurement, cargo, crew, energy, bounded advisers, knowledge, billing, support and durable background work.

The [local milestone contract](docs/exec-plans/002-complete-local-program.md) defines the delivered program. Start the separate learning track with [Learn by replaying the build](upskilling/retrospective/README.md); it follows the actual contracts, failures, checks and implementation decisions. Your learning assessment remains pending until you attempt the exercises.

## Run locally

Prerequisites: Node.js 22.16 or newer, npm, Docker Desktop running Linux containers, and available loopback ports 3000 and 5438.

```sh
npm ci
npm run setup
npm run dev
```

In a second terminal, start the persistent worker:

```sh
npm run worker
```

Open **http://127.0.0.1:3000**, select **Enter Mission Control**, then **Operations hub**. Setup creates a random local session secret, starts PostgreSQL, applies checksummed migrations and adds missing fixtures. Existing configuration and simulation data are preserved. For a production-mode preview use `npm run build` followed by `npm start`. A [container preview](deploy/README.md) includes the app, migration job and worker at port 3002.

The development database is `helios`; automated integration and browser suites reset only `helios_test`. The fixture contains two organizations, 200 crew members, station assets, warehouses, budgets, vessels, energy systems and approved procedure documents. The virtual clock starts paused in 2042. Manual controls advance it; a running worker advances a resumed clock and processes events and timers. Audit and retry timestamps use actual wall time.

## Explore six connected demonstrations

For a populated review world, stop the worker and run `npm run showcase`, then restart the worker. This **resets the local disposable development fixtures** and builds a completed repair history, recovered solar crisis, uncertain payment, investigation, adviser traces and evaluation evidence through the real domain services. The [deployment guide](deploy/README.md) includes the exact worker and container commands.

Follow [the step-by-step scenario guide](docs/runbooks/demo-scenarios.md).

1. **Coolant failure:** acknowledge an incident, inspect a cited adviser proposal, approve a work order, procure a missing part, receive cargo, assign certified crew, complete the checklist and verify recovery with newer telemetry.
2. **Solar crisis:** lose generation, observe reserve depletion and stalled manufacturing, shed industrial load, repair and restore it.
3. **Cargo delay:** miss a docking window, reserve a priority route and complete a duplicate-safe delivery.
4. **Duplicate delivery:** replay an outbox event and observe one consumer effect. Inspect retries, dead-letter recovery and workflow history in the platform console.
5. **Payment uncertainty:** let the simulated provider charge while Helios loses confirmation; use signed webhook delivery or reconciliation to settle the existing attempt and close its support case.
6. **Unsafe adviser:** inject an invalid proposal, inspect the blocked trace and run the recorded retrieval and policy evaluation suite.

The read-only auditor can inspect Helios. Selene Research has an independent tenant view. Mutation authorization and tenant scope are enforced on the server.

## Commands and verification

| Command                                             | Purpose                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run setup`                                     | Configure, start PostgreSQL, migrate and seed missing fixtures.                                  |
| `npm run db:reset`                                  | **Clear this project's disposable demo data** and reseed a nominal world; stop the worker first. |
| `npm run db:down`                                   | Stop PostgreSQL while retaining its named volume.                                                |
| `npm run worker -- --once`                          | Process one bounded worker cycle and exit.                                                       |
| `npm run scenario -- degradation 17`                | Run a deterministic telemetry scenario; use `recovery` to restore readings.                      |
| `npm run check`                                     | Lint, TypeScript, unit and PostgreSQL integration tests, then production build.                  |
| `npm run test:api`                                  | Verify HTTP behavior against the running app; adds controlled demo events.                       |
| `npm run test:e2e`                                  | Browser workflows on an isolated production-mode server at port 3001.                            |
| `npm run format:check`                              | Check source and document formatting.                                                            |
| `npx tsx --env-file=.env scripts/benchmark.ts`      | Record a small local operations-read sample in `artifacts/benchmark.json`.                       |
| `node --env-file=.env scripts/backup-rehearsal.mjs` | Back up development data and verify restoration into a separate disposable database.             |

Install Chromium once with `npx playwright install chromium`. Build before browser tests. **Run integration and browser suites sequentially:** both use `helios_test`. CI is configured, but local execution does not imply a remote CI run. [Current state](docs/project/current-state.md) and the [execution record](docs/exec-plans/002-complete-local-program.md) report actual verification and limitations.

## Structure and design

```text
src/app/             Pages and validated HTTP routes
src/components/      Mission Control and purpose-specific operations views
src/domain/          Public contracts and pure rules
src/server/          Authorized transactions, queue, advisers and provider adapter
db/migrations/       Immutable, checksummed PostgreSQL migrations
scripts/             Setup, worker, scenarios and operational verification
tests/               Unit, real PostgreSQL and browser workflows
deploy/              Container configuration and operational runbook
docs/                Architecture, scenarios, milestones and build evidence
upskilling/          Retrospective, lessons, labs, templates and separate solutions
```

The [architecture guide](docs/architecture/complete-program.md) explains transaction locks, idempotency, leased delivery, time, approval boundaries and payment uncertainty. The system is a modular monolith with a separate worker and a PostgreSQL outbox. Domain state, audit events and outbox messages commit together. Database constraints protect inventory and balanced, immutable ledger entries; explicit tenant filtering is reinforced by composite foreign keys.

## Further work to review

Review [25 detailed future-work stories](docs/project/future-work/README.md) covering reliability, long-running advisers, evaluations, station operations, finance, identity and delivery. Each includes current-code references, acceptance criteria, prerequisites, verification steps and a learning exercise. All are proposed and awaiting review.

The separate [backlog-review lab](upskilling/labs/03-review-future-work.md) shows how to select a story, challenge its assumptions and write a bounded agent execution contract.

## Local scope

`DEMO_MODE=true` enables signed local personas, not production identity. The app checks its configured loopback origin. The payment provider and physical systems are simulations. Adviser output defaults to a clearly labeled deterministic fixture. An optional OpenAI Responses adapter requires explicit provider, model and key configuration; fixture evaluations do not measure live-model quality. Retrieval uses PostgreSQL full-text search and a documented token-hash vector baseline, not learned semantic embeddings.

The local milestone program implements the six workflows above. The original enterprise catalog is broader than this delivery. Public authentication, cloud deployment, real payments and live-model evaluation remain external integration work. No public deployment or paid provider call is implied by the local build.
