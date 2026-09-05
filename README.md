# Helios Interplanetary

A simulated station operations system built to practice software correctness and AI-assisted engineering.

The first working slice is **Odyssey Mission Control**: a coolant pump produces readings, threshold breaches open incidents, and an operator investigates and resolves them after recovery. PostgreSQL stores telemetry, incident state, scenario executions, and attributable audit events.

## Run locally

Prerequisites: Node.js 22.16 or newer, npm, and Docker Desktop with Linux containers running. Ports 3000 and 5438 must be available.

```sh
npm ci
npm run setup
npm run dev
```

Open **http://127.0.0.1:3000** and select **Enter Mission Control**. Use this exact host because local identity checks the configured origin. `npm run setup` creates `.env` with a random session secret, starts a dedicated PostgreSQL container, applies migrations, and seeds two organizations. It preserves an existing `.env` and existing fixture data.

For a production-mode local preview:

```sh
npm run build
npm start
```

`DEMO_MODE=true` intentionally enables local fixture personas. It is not production authentication. The application binds to loopback, checks the configured local origin, signs an HttpOnly session cookie, and derives tenant/role from a server-side persona map. Public deployment needs real identity, operational controls, and a deployment review.

## Try the first scenario

1. Enter as Avery Vale. Kepler Station starts with 36 nominal readings and no incidents.
2. Select **Inject degradation**. Twelve deterministic observations advance virtual time by 60 seconds. Pressure falls and vibration rises; one incident opens.
3. Select **Replay delivery**. Reading and incident counts remain unchanged.
4. Open **Inspect incident**. Review the triggering observation, thresholds, correlation IDs, and attributable timeline. Acknowledge the incident.
5. Close the drawer and select **Restore nominal**. The telemetry recovers; the incident stays open for operator review.
6. Reopen the incident and resolve it. The registry preserves its history.
7. Sign out and enter Selene Research to inspect a separate organization's station. The read-only auditor can inspect Helios but cannot run scenarios or transition incidents.

The simulation clock begins on March 19, 2042. It advances only when a scenario is executed. The UI polls persisted state every four seconds; it does not generate imaginary streaming values. Operator transition timestamps use simulation time; audit timestamps use actual UTC wall time.

## Important behavior

- Pressure **below 2.4 bar** OR vibration **above 6.5 mm/s** opens an incident. Exact boundary values are nominal. Temperature is contextual telemetry, without an alert rule in this slice.
- An asset can have at most one unresolved incident. Further abnormal readings attach to it until an operator resolves it.
- A reading's identity is its organization and UUID. An identical retry returns the original outcome. A changed payload with the same identity is a conflict.
- Older or equal-time distinct readings are recorded as historical observations without changing current state. Incident detection uses strictly newer observations.
- Reading, incident, asset-state, and audit changes commit together. A scenario's twelve readings and its completion record also share one transaction.
- Tenant filtering is enforced by server domain operations and reinforced with composite foreign keys. This version does not use PostgreSQL row-level security.

## Commands and validation

| Command                                   | Purpose                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run configure`                       | Create missing local `.env`; preserve existing configuration.                                  |
| `npm run db:up`                           | Start this project's PostgreSQL service.                                                       |
| `npm run db:migrate`                      | Apply versioned SQL migrations, rejecting edits to applied migrations.                         |
| `npm run db:seed`                         | Add missing fixtures without resetting current scenarios.                                      |
| `npm run db:reset`                        | **Clear this local demo's fixture data** and reseed a nominal world.                           |
| `npm run db:down`                         | Stop PostgreSQL, retaining its named volume.                                                   |
| `npm run scenario -- degradation 17`      | Run a deterministic degradation sequence through the domain service.                           |
| `npm run scenario -- recovery 17`         | Run a recovery sequence.                                                                       |
| `npm run lint`                            | ESLint.                                                                                        |
| `npm run format` / `npm run format:check` | Format or check readable source and documentation; preserve the original prompt documents.     |
| `npm run typecheck`                       | Generate Next.js route types and check TypeScript.                                             |
| `npm test`                                | Pure rules, simulation, request validation, and identity tests.                                |
| `npm run test:integration`                | PostgreSQL transactions, duplicates, concurrency, tenant isolation, rollback, and persistence. |
| `npm run check`                           | Lint, types, unit tests, integration tests, and production build.                              |
| `npm run test:api`                        | HTTP checks against the running local app; adds one degradation sequence.                      |
| `npm run test:e2e`                        | Headless browser workflows on an isolated test server at port 3001.                            |

Before the first browser run, install its browser with `npx playwright install chromium`. Build the app before running `test:e2e`. Integration and browser tests use the local **helios_test** database and reset it; do not run those suites concurrently. The development database is **helios**. CI runs the same suites sequentially.

Replay a CLI sequence by reusing the UUID printed as `runId`:

```sh
npm run scenario -- degradation 17 <run-id-from-first-command>
```

Each run prints structured JSON. A replay returns `replayed: true`. Changing the seed or kind while retaining the run ID returns a conflict.

## Repository map

```text
src/app/             Next.js pages and HTTP route handlers
src/components/      Mission Control, charts, station schematic, incident drawer
src/domain/          Public contracts, pure threshold rules, deterministic generator
src/server/          Identity, database transactions, telemetry, incidents, queries
db/                  PostgreSQL initialization and immutable migrations
scripts/             Setup, migration, fixtures, scenario and API verification commands
tests/               Unit, PostgreSQL integration, and browser suites
docs/                Architecture, contracts, runbooks, roadmap, execution evidence
upskilling/          Separate lessons, labs, answer keys, templates, and progress tracker
```

Start learning with [upskilling/README.md](upskilling/README.md). To resume implementation, read [current state](docs/project/current-state.md) and the [completed execution plan and evidence](docs/exec-plans/001-telemetry-incident.md). Architecture and transaction diagrams are in [the system overview](docs/architecture/system-overview.md).

## Project direction

Atlas will provide enterprise operations; Odyssey provides physical operations; Helios Intelligence will add bounded, evaluated product agents after reliable domain tools exist. The next delivery connects incidents to maintenance work orders and inventory reservations.

Current scope has one simulated pump per organization and a single deployable. It has no live AI diagnosis, background physics engine, durable event bus, maintenance module, procurement, or cloud deployment. Those are roadmap items, not implemented features.

This project is a learning simulation. Engineering case studies must distinguish simulated incidents, measured results, and real production experience.
