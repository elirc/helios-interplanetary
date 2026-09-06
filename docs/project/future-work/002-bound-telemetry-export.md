# FW-002: Give telemetry export a bounded resource budget

[Back to the review backlog](README.md)

| Field           | Proposed value                                |
| --------------- | --------------------------------------------- |
| Status          | Proposed — awaiting review                    |
| Theme           | Reliability and operator workflows            |
| Priority        | P1                                            |
| Size            | M — relative complexity, not a time estimate  |
| Prerequisites   | [FW-001](001-diagnose-connection-timeouts.md) |
| Owner           | Unassigned                                    |
| Review decision | Pending                                       |

## User story

As an operator, I want request tracing to remain useful when its storage is slow, so that optional telemetry cannot consume all the resources needed for business requests.

## Current baseline and evidence

The exporter uses Promise.all and the same getPool() as domain operations. Its queue is bounded by the span processor, but the exporter has no distinct database connection budget. This is a design risk visible in code; it has not been established as the cause of FW-001.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/observability.ts](../../../src/server/observability.ts)
- [src/instrumentation.ts](../../../src/instrumentation.ts)
- [src/server/db.ts](../../../src/server/db.ts)
- [src/app/api/metrics/route.ts](../../../src/app/api/metrics/route.ts)

## Proposed scope

Use FW-001 measurements to choose a bounded export strategy, such as a separate small pool or limited batches. Preserve the existing best-effort export contract.

## Acceptance criteria

- [ ] Exporter concurrency, batch size, storage deadline and queue capacity are explicit, validated configuration with conservative local defaults.
- [ ] Holding export storage unavailable does not hold a business transaction open or consume the domain pool's entire connection allowance.
- [ ] Dropped or failed span batches increment observable counters with defined scope; export errors do not recursively generate another export failure loop.
- [ ] Shutdown attempts a bounded drain and then exits within a documented deadline, without silently keeping the worker or app process alive indefinitely.
- [ ] A fixture reset or tenant deletion during export is handled as an observable dropped export; it cannot recreate business data or bypass tenant constraints.

## Suggested implementation sequence

1. Compare the measured contention behavior with the exporter contract and choose the smallest isolation mechanism that addresses the demonstrated risk.
2. Make ownership and shutdown of exporter resources explicit and expose aggregate exporter-health counters.
3. Document the total application, worker and telemetry connection budget against the local PostgreSQL limit.

## Verification and evidence to retain

- Saturate or deny the export path while executing a real authorized domain command; assert its commit, audit/outbox records and normal connection cleanup.
- Test queue overflow and shutdown with pending spans; check counters and a bounded process exit rather than timing only a happy path.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Write a resource-ownership diagram and predict how a full export queue affects requests. Explain why best-effort delivery still needs a capacity policy.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

What telemetry loss is acceptable for this local system, and which connection budget preserves room for the app and worker?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
