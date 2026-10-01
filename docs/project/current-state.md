# Current implementation state

**Completed:** [Run 002 — the local M01–M15 workflow program](../exec-plans/002-complete-local-program.md). The M01 baseline is commit `8a0e1e7`; the final local checkpoint is tagged `helios-local-m15`. Both original prompt documents are preserved.

Open **http://127.0.0.1:3002**, enter Mission Control, then select **Operations hub**. The packaged app and independent worker are running. Both virtual clocks are paused so the review world stays understandable.

## Delivered behavior

Next.js / TypeScript modular monolith, PostgreSQL 17 and a durable worker. Maintenance connects incidents, inventory reservations, budget approval, cargo and docking, certified crew, checklist execution and fresh recovery telemetry. Other views cover energy and manufacturing dependencies, versioned knowledge, four bounded adviser roles, human-approved actions, fixture evaluations, billing and simulated payment uncertainty, balanced immutable journals, support/security investigations, event retries, workflow history, notifications, request spans and metrics.

The [milestone map](roadmap.md) connects each outcome to evidence. Follow [the six demos](../runbooks/demo-scenarios.md). The separate [retrospective](../../upskilling/retrospective/README.md) explains the actual contracts, review findings, failures, checks and recovery decisions. Human learning remains unassessed.

## Verification

- Combined check: lint, TypeScript, 11 unit tests, 35 PostgreSQL integration tests and production build passed.
- After approval review changes: lint/types and all five intelligence tests passed, including the added expiry/stale-state regression. The full integration inventory is 36 cases, verified across the combined and focused runs.
- All 8 browser workflows passed against the container application; both HTTP smoke programs passed. Desktop, repair, adviser and mobile screenshots were visually inspected.
- Worker tests include an actual child-process exit and recovery. The live container worker also consumed an HTTP-generated adviser-summary event into exactly one notification.
- Backup/restore matched 2 organizations, 98 readings, 1 work order, 1 invoice, 2 balanced journals and 39 outbox records. Container replacement independently preserved the operational/financial counts.
- Request-span storage, a nonzero trace ID, fresh worker heartbeat and Prometheus output passed. The final preview check observed 60 request samples.
- A local 30-request sample at concurrency 3 passed with 0 errors, p50 649.6 ms and p95 1262.1 ms after build completion. An earlier sample during the build had 1 error and is preserved in the evidence; its exact cause is unconfirmed. No production capacity/SLO claim is established.
- Remote CI is configured but has not run.
- Formatting and all 98 local documentation links passed; 91 deployed source/script/migration files matched the workspace by SHA-256.

The [execution record](../exec-plans/002-complete-local-program.md) identifies logs and reproduction commands. Ignored `artifacts/` contains screenshots, the browser report, benchmark samples, backup archive and runtime evidence.

## Review data and recovery

The review world contains a completed repair and recovered solar crisis, an uncertain payment awaiting reconciliation, an open simulated investigation, four adviser runs and 40 notifications (the showcase plus the live-worker probe). Both clocks remain paused. Use the UI to explore their history, or stop the worker and run `npm run showcase` to recreate the core showcase. That command resets only the explicitly guarded local disposable development fixtures. `npm run db:reset` instead creates a nominal starting world.

Workspace: `C:/Users/Owner/Desktop/astra1`, local Git branch `main`. PostgreSQL Compose project `helios` uses loopback 5438, development `helios`, isolated tests `helios_test`, volume `helios_helios-data`. Migrations 001–006 are checksummed and immutable.

The review preview uses `deploy/compose.local.yaml` at port 3002. The old host preview on 3000 was stopped; `artifacts/server.pid` is historical. Host development remains available through `npm run dev`. Browser tests used port 3013 because 3001 belongs to another project. Set `HELIOS_E2E_PORT` when needed. Integration and browser suites reset the same test database and must run sequentially. Unrelated services were left untouched.

The in-app browser integration could not initialize in this environment; standalone Playwright supplied browser verification. The local [deployment runbook](../../deploy/README.md) covers app/worker startup, stopping, image-based tests and backup rehearsal.

## Boundaries

The [future-work review backlog](future-work/README.md) contains 25 proposed stories grounded in this delivered checkpoint. Their status is awaiting review; the M01–M15 implementation and verification record above remain the completed baseline. The separate [review lab](../../upskilling/labs/03-review-future-work.md) supports choosing and supervising a later implementation.

This is a local engineering simulation. Identity uses signed fixture personas; payments and physical incidents are simulated. Adviser output defaults to a labeled deterministic fixture. The optional OpenAI adapter has no live-call verification. Retrieval uses full-text search and a token-hash vector baseline, not learned semantic embeddings.

Public authentication, cloud execution, real payments, live-model quality measurement and additional enterprise catalog features require a new concrete contract. The local workflow program is complete; these are not completed production integrations. The remaining learner action is optional review of the separate curriculum, with personal progress pending until demonstrated.

## Follow-up: repair rollback verification (Run 003)

[Run 003](../exec-plans/003-repair-rollback-regression.md) adds a late-postmortem failure regression and an isolated PostgreSQL verification launcher. The existing repair transaction and the Run 002 implementation above are preserved. The new combined check passed lint/types, 11 unit tests, 37 PostgreSQL integration tests, and the production build; both HTTP smoke programs and the affected repair browser case passed. See the [new evidence](../../astraupskill/VERIFICATION.md) and [separate learning material](../../upskilling/repair-rollback/README.md). This follow-up used a temporary PostgreSQL 18 cluster and does not reverify the historical packaged preview or live-provider behavior. Human learning remains unassessed.
