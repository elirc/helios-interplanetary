# FW-001: Explain and reproduce database connection timeouts

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Reliability and operator workflows           |
| Priority        | P1                                           |
| Size            | M — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As the engineer operating Helios, I want a failed request to identify whether it waited for a connection, timed out in a query, or failed elsewhere, so that I can choose a fix from evidence.

## Current baseline and evidence

Run 002 recorded one HTTP 500 during a container build and a later 30-request sample without errors. The roughly five-second failure is consistent with the configured pool deadline; the root cause remains unconfirmed. This is an observed investigation, not proof that the exporter or database query caused it.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/db.ts](../../../src/server/db.ts)
- [src/server/http.ts](../../../src/server/http.ts)
- [src/server/observability.ts](../../../src/server/observability.ts)
- [scripts/benchmark.ts](../../../scripts/benchmark.ts)
- [docs/exec-plans/002-complete-local-program.md](../../../docs/exec-plans/002-complete-local-program.md)

## Proposed scope

Add bounded diagnostic instrumentation and a repeatable local experiment. Select any behavioral fix only after the measurements identify a failure mode.

## Acceptance criteria

- [ ] A failed database-backed request records its request/trace IDs, a safe error category, and separate connection-wait and query-duration measurements; credentials, SQL parameter values and document bodies stay out of these diagnostic fields.
- [ ] Pool diagnostics expose active, idle and waiting connection counts without tenant-specific business data leaking into another tenant's view.
- [ ] A local experiment distinguishes an intentionally occupied pool, a deliberately slow query, and an available database, with a stated concurrency level and deadline for each case.
- [ ] Every run records sample count, errors by category, percentiles, app/image revision and competing workload. The original failing sample remains available as historical evidence.
- [ ] The investigation concludes with a supported cause or an explicit unresolved hypothesis. Changing a timeout alone is not accepted as proof of a fix.

## Suggested implementation sequence

1. Trace connection acquisition and query execution separately while preserving transaction rollback and client release in every error path.
2. Add a controlled local contention driver that releases its own connections in cleanup and uses only a disposable test target.
3. Capture baseline evidence, change one condition at a time, and write the decision before implementing a proposed remedy.

## Verification and evidence to retain

- Exercise connection-wait and query deadlines independently; assert classification and client cleanup after each failure.
- Compare equivalent samples with and without competing build/export work, retaining failures and recording environmental differences.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Before running the experiment, predict which measurement would distinguish pool starvation from a slow query. Submit a hypothesis table and the observation that would falsify each hypothesis.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which error categories and resource measurements are sufficient to make a decision, and what would justify a separate remediation ticket?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
