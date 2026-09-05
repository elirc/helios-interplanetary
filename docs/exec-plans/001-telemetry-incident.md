# Run 001: coolant telemetry to incident

Mode: BUILD. Starting state: two prompt files, no application, new local Git repository on `main`. Node 22.16 and Docker are available. Another unrelated PostgreSQL container uses port 5442; Helios uses its own container, volume, and loopback port 5438.

Status: complete, locally verified September 5, 2026. No remote CI execution or deployment.

Outcome: a running Mission Control interface backed by a reproducible PostgreSQL coolant scenario, plus a separate teaching curriculum.

Scope: local demo identity, one station and pump per fixture organization, persistent readings, threshold detection, one active incident per asset, operator acknowledgement/resolution, correlated audit records, seeded scenario replay, setup/CI, and `upskilling/` lessons. Maintenance/inventory is the next milestone. No live LLM or cloud deployment in this run.

## Acceptance and evidence plan

1. Setup/migration/seed commands start a real local backend and UI. Verify database commands, build, health endpoint, and browser.
2. Normal readings create no incident; pressure below 2.4 bar OR vibration above 6.5 mm/s opens an incident. Verify boundary unit tests and database integration assertions.
3. Retrying a reading ID preserves effects; changed payload with reused ID returns conflict. Distinct abnormal readings share one active incident. Verify sequential and concurrent database tests.
4. Readings and incidents survive app/pool restart. Verify reconnect integration check plus HTTP app restart inspection.
5. Signed local demo identity establishes server-side organization; another organization cannot access protected assets/incidents. Verify forged/expired session, API, and cross-tenant domain checks.
6. Correlation IDs connect telemetry to incident and audit events. Verify database records and visible incident timeline.
7. Scenario UI shows actual persisted readings, error/loading states, and operator actions. Verify browser clicks and chart/timeline state.
8. `upskilling/` contains a code walkthrough, agent loops curriculum, hands-on exercises, answer keys, reusable templates, and an honest progress tracker. Verify links and instructions against implemented commands.

## Run limits and learning target

Task boundary: this slice plus teaching materials. No wall-time/token budget requested. Learning target: design a check that can disprove an agent's correctness claim, then use repository evidence to resume the task.

## Progress

- [x] Audit environment and initialize isolated repository.
- [x] Implement schema, transaction boundaries, identity, and scenario commands.
- [x] Implement Mission Control and incident inspection.
- [x] Validate core behavior, HTTP boundary, persistence, and browser flow.
- [x] Complete project documentation and separate upskilling content.

## Decisions

Start with one Next.js deployable and explicit server modules. Use direct SQL to make transaction and tenant boundaries visible. In-process domain calls run inside the same database transaction; no claim of durable event-bus delivery. Simulation advances virtual time in explicit scenario batches; it is not a background real-time physics engine.

## Completion evidence

| Check               | Result and evidence                                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local setup         | Dedicated PostgreSQL container, migration, seed, and health checks passed.                                                                                                                                       |
| `npm run check`     | Passed lint, TypeScript, 8 unit tests, 13 PostgreSQL integration tests, and production build. Local log: `artifacts/check.log`.                                                                                  |
| `npm run test:api`  | Passed health, session, scenario/replay, incident inspection, origin denial, cross-tenant read/write denial, viewer denial, and invalid-input checks.                                                            |
| Application restart | Actual server process stopped and restarted; 48 readings, 1 active incident, and 1 scenario run survived. Evidence: `artifacts/restart-before.json` and `artifacts/restart-result.json`.                         |
| `npm run test:e2e`  | All 3 workflows passed against the final production build: degradation/evidence/replay/recovery/resolution; mobile/read-only/sign-out; connection error/retry. Log: `artifacts/browser-final.log`.               |
| Visual review       | Desktop access, nominal/anomalous mission, incident drawer, and 390-pixel mobile screenshots inspected in `artifacts/screenshots/`. Browser assertions also cover horizontal overflow and incident-dialog focus. |
| Teaching material   | Separate lessons, labs, answer key, templates, glossary, case study, and pending progress tracker in `upskilling/`. Relative Markdown links checked.                                                             |
| Final demo state    | Development fixture reset to 36 nominal readings and zero incidents; port-3000 health reports ready with database connected.                                                                                     |

Artifacts are local, ignored output, not committed evidence. The repository tests and scripts reproduce the checks. Integration and browser suites reset `helios_test` and must run sequentially. Remote CI is configured but unexecuted; human learning is unassessed.

## Findings resolved during verification

HTTP/browser checks exposed `HOST_DENIED` for valid loopback requests: NextURL normalizes 127.0.0.1 to localhost. Corrected validation to use the original Host header and protocol, retaining exact mutation origin checks. Added a regression test and [an authentic teaching case study](../../upskilling/case-studies/001-framework-host-normalization.md).

Equal-time historical readings could crowd the current applied reading out of the 60-reading display window. Ordering now prioritizes the applied observation at the same timestamp. A database regression inserts more than a window of historical readings and verifies the displayed current state.

ESLint 10.10.0 was incompatible with the React rules bundled by eslint-config-next 16.3.4 (`getFilename` removed). ESLint 9.39.5 is pinned for compatibility and final lint passes. Verify plugin support before upgrading it. The earlier failed dependency combination is not evidence against the final build.

The in-app browser module failed during initialization (`Cannot redefine property: process`). Standalone Playwright is installed and its test suite uses isolated port 3001 / helios_test. Do not repeat the failed initialization or weaken HTTP acceptance criteria.

## Handoff

The local production preview is running at http://127.0.0.1:3000; its PID is in `artifacts/server.pid`. Restart it after any new production build. Source files remain uncommitted on the isolated local `main` branch. Preserve the original prompt documents.

M02 starts with a bounded maintenance-work-order contract linked to the incident. Follow [current state](../project/current-state.md) and [the roadmap](../project/roadmap.md). The separate learning track can begin immediately without changing the running application.
