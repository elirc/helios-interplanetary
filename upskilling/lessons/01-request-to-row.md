# Lesson 1: trace a scenario from button to committed state

Learning outcome: you can trace one operation through the browser, identity boundary, domain rules, transaction, and evidence query. You can explain where a duplicate effect is prevented.

## Run it once

Start the local app and enter Mission Control. Note the reading count. Inject degradation with seed 17, inspect the incident, and replay the delivery. Describe what changed on the first request and what stayed unchanged on the replay before reading further.

## Follow the code

1. [mission-control.tsx](../../src/components/mission-control.tsx): `executeScenario` creates a run UUID and calls `/api/scenarios`. The same request is retained for Replay delivery. The browser displays the response and fetches a fresh snapshot.
2. [scenario route](../../src/app/api/scenarios/route.ts): the handler checks origin, verifies the cookie, parses the request, and invokes the server service.
3. [identity.ts](../../src/server/identity.ts): `principalFromRequest` checks a signed, expiring session. The organization and role come from the server persona map. A JSON tenant field cannot grant access.
4. [scenarios.ts](../../src/server/scenarios.ts): `runScenario` opens a transaction, locks the tenant's asset, checks for an earlier run with the same identity, and generates a deterministic batch.
5. [telemetry.ts](../../src/server/telemetry.ts): each observation is deduplicated, evaluated, and persisted. Strictly newer observations can update asset state and open or join an active incident.
6. [audit.ts](../../src/server/audit.ts): the transaction records who acted, what changed, and how the records are correlated.
7. [db.ts](../../src/server/db.ts): the wrapper commits only if every step succeeds. Otherwise it rolls back and releases the connection.
8. [queries.ts](../../src/server/queries.ts): Mission Control reads a consistent tenant-scoped snapshot, then renders those values.

## Why the lock matters

Suppose two requests both execute “find the active incident” before either inserts one. Both could observe absence and attempt creation. Locking the asset serializes that decision. A partial unique index also prevents two unresolved incidents from being stored for the same organization and asset.

Find both mechanisms in the code and [migration](../../db/migrations/001-core.sql). Explain why an application-level check alone does not establish the database invariant.

This lock is intentionally coarse for a single pump. It trades per-asset concurrency for a simple consistency boundary. A future high-volume ingestion design may partition work or revise that boundary, but its replacement must preserve the business rule.

## Three different meanings of time

- `observed_at`: when the simulated sensor observation occurred.
- `received_at`: when PostgreSQL received the reading.
- `audit_events.occurred_at`: when the operation was recorded in wall time.

An old observation can arrive later. The service stores it, marks it as not applied, and prevents it from replacing a newer operational state. Equal-time distinct readings receive the same treatment. This is a chosen ordering policy, not a universal telemetry rule.

## What the first slice does not prove

A transaction proves atomicity inside this database boundary. It does not prove delivery to an external queue or survival of in-memory work after a process exits. A successful page rendering does not prove the transaction ran correctly. A seeded scenario makes fixture values repeatable; it says nothing about the determinism of a future LLM.

## Check your understanding

Draw a diagram without copying this page. Mark where identity becomes trusted, where the transaction starts and ends, and where a duplicate is detected. Then explain how a retry after “commit succeeded but the response was lost” differs from a retry after rollback.

Use [the invariant lab](../labs/01-invariants.md) to test those claims against the implementation.
