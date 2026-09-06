# FW-009: Enforce per-run and per-tenant adviser budgets

[Back to the review backlog](README.md)

| Field           | Proposed value                                                                       |
| --------------- | ------------------------------------------------------------------------------------ |
| Status          | Proposed — awaiting review                                                           |
| Theme           | Engineering and agent execution                                                      |
| Priority        | P1                                                                                   |
| Size            | L — relative complexity, not a time estimate                                         |
| Prerequisites   | [FW-007](007-durable-adviser-jobs.md), [FW-013](013-model-gateway-contract-tests.md) |
| Owner           | Unassigned                                                                           |
| Review decision | Pending                                                                              |

## User story

As the person supervising advisers, I want explicit limits on time, steps, concurrency and optional provider usage, so that a long run has a predictable stopping point and cannot consume an unbounded shared allowance.

## Current baseline and evidence

The current runtime caps steps at eight and the gateway caps output tokens and request duration. It has no persisted per-tenant concurrency reservation or durable accounting of a run's shared provider allowance.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [src/server/model-gateway.ts](../../../src/server/model-gateway.ts)
- [src/server/worker.ts](../../../src/server/worker.ts)
- [src/domain/intelligence.ts](../../../src/domain/intelligence.ts)
- [src/components/intelligence-views.tsx](../../../src/components/intelligence-views.tsx)

## Proposed scope

Add versioned runtime budget policy and durable reservation/accounting. Fixture runs remain distinct from measured provider usage; monetary limits require explicitly supplied, dated pricing assumptions.

## Acceptance criteria

- [ ] Each run snapshots a policy version with maximum steps, wall-time deadline, tenant concurrency and token/cost allowance where configured.
- [ ] Competing submissions reserve the available tenant allowance atomically; concurrent runs cannot all spend the same remaining reservation.
- [ ] The worker stops scheduling new work when a limit is reached, persists the reason and releases only reservations known to be unused.
- [ ] Recorded usage distinguishes provider-reported tokens, estimates and unknown outcomes. Fixture token/cost fields stay unavailable rather than becoming fabricated zeros.
- [ ] An unconfirmed provider outcome retains a conservative reservation until reconciliation or an explicit policy decision; process restart cannot reset the budget.

## Suggested implementation sequence

1. Write the accounting invariants and distinguish wall-clock deadlines from the station's virtual clock.
2. Persist policy snapshots and reservations with lease-aware release rules, then enforce them before each step/provider attempt.
3. Expose remaining allowance and the terminal stop reason in the run trace; make external usage configuration opt-in.

## Verification and evidence to retain

- Race more submissions than available concurrency/allowance and verify database totals after rollback, cancellation and worker restart.
- Use delayed, malformed and unknown-usage provider fixtures to test exhaustion and conservative reconciliation.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Propose a stopping rule for a long run and a counterexample to a process-local counter. Produce a reservation ledger for an ambiguous provider attempt.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which limits should initially be enforced in fixture mode, and what exact usage evidence would be required before enabling a monetary budget?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
