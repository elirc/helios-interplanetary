# Outcome roadmap

## Completed: M01 — Telemetry to incident

Delivered a locally runnable Mission Control, PostgreSQL persistence, deterministic scenario, signed local personas, incident lifecycle, audit evidence, and a separate teaching curriculum. Local acceptance checks passed on September 5, 2026; evidence is recorded in [Run 001](../exec-plans/001-telemetry-incident.md). Human learning remains unassessed.

## Next candidate: M02 — Maintenance work order

Outcome: an acknowledged incident can create one maintenance work order linked to the affected asset and incident.

Define ownership, idempotent creation, required tasks, valid state transitions, audit records, and a useful inspection UI. Verify duplicate creation and cross-tenant denial. Learning target: the developer authors a task contract and predicts a failure before implementation. Complete this contract from actual M01 state before coding.

## Following candidate: M03 — Inventory reservation correctness

Outcome: a work order requests a part, reserves available stock, or enters awaiting-parts state.

Preserve `available = on_hand - reserved`, nonnegative stock, and no committed over-reservation. Define release/cancellation and replay behavior. Test simultaneous competing reservations with real transactions. Learning target: the developer designs the concurrency test before the agent implements the fix.

## Later horizons

- Procurement approval and fulfillment extend the repair scenario.
- Crew certification and repair verification complete a recovery demo.
- Durable background work adds retries, restart recovery, and reconciliation where needed.
- A narrow diagnostic agent uses authorized tools, sources, and evaluations.
- RAG adds source-grounded procedure retrieval with measured quality.
- Selected distributed-system exercises introduce duplicate/out-of-order events, consumer failure, and backpressure.
- Billing, ledger, logistics, energy, and cloud deployment follow explicit scenario needs.

Only detail a horizon when evidence and the active learning goal justify it. Do not generate dozens of speculative PR specifications.
