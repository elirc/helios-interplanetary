# Current implementation state

Completed milestone: M01, telemetry-to-incident and separate upskilling content. Verified locally on September 5, 2026.

Completed plan and evidence: [Run 001](../exec-plans/001-telemetry-incident.md).

## Implemented

- Next.js 16 / React 19 / TypeScript modular monolith with PostgreSQL 17.
- One station and pump in each of two isolated fixture organizations.
- Signed local demo personas, role restrictions, and same-origin mutation protection.
- Persistent readings, deterministic scenario batches, reading/run idempotency, late-data ordering, one active incident per asset, acknowledgement/resolution, and audit evidence.
- Mission Control charts, station schematic, scenario controls, incident drawer/registry, and operational event log.
- Setup/migration/fixture/scenario commands, unit/integration/API/browser suites, and CI configuration.
- Separate [upskilling curriculum](../../upskilling/README.md) with lessons, labs, solutions, templates, and a progress tracker.

## Validation status

`npm run check` passed: lint, TypeScript, eight unit tests, thirteen PostgreSQL integration tests, and the production build. HTTP smoke checks passed, including scenario replay, tenant isolation, role restrictions, and origin protection. All three Playwright workflows passed against the final build: operator lifecycle, mobile/read-only access, and connection failure/recovery. Desktop, mobile, and incident screenshots were visually inspected.

An actual application-process restart preserved 48 readings, one active incident, and one scenario execution. After verification, the development fixture was reset to 36 nominal readings and zero incidents. The running app's health endpoint reports a connected database. Local logs, restart evidence, and screenshots are in ignored `artifacts/`; CI is configured but has not run remotely.

## Environment and recovery

Workspace: `C:/Users/Owner/Desktop/astra1`, local Git branch `main`, no commits yet. All application files are newly created; preserve the two pre-existing prompt documents.

PostgreSQL: project `helios`, service `postgres`, loopback port 5438, development database `helios`, test database `helios_test`, persistent named volume `helios_helios-data`. An unrelated database on port 5442 is outside this project.

Local app: port 3000, PID recorded in ignored `artifacts/server.pid`. A rebuild requires restarting the production-mode server to load changed code. Browser tests manage an isolated port-3001 server and reset only `helios_test`. Do not run integration and browser suites concurrently.

Open **http://127.0.0.1:3000** and select **Enter Mission Control**. The standalone Playwright suite provides reproducible browser verification; the in-app browser integration could not initialize in this environment.

Next implementation action: define the M02 maintenance-work-order contract from the [roadmap](roadmap.md), then implement and verify that slice. No implementation task is currently running. Start the learning track at [upskilling/README.md](../../upskilling/README.md); the app remains usable while exercises are pending.

## Limits and next milestone

Local demo identity is not production authentication. Simulation advances in batches. There is no live AI, durable event delivery, maintenance/inventory, or cloud deployment. M02 adds a maintenance work order from an incident; M03 adds correct inventory reservations. Human learning remains unassessed in [the progress tracker](../../upskilling/progress.md).
