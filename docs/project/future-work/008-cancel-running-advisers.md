# FW-008: Cancel an adviser job while work is in flight

[Back to the review backlog](README.md)

| Field           | Proposed value                                                                       |
| --------------- | ------------------------------------------------------------------------------------ |
| Status          | Proposed — awaiting review                                                           |
| Theme           | Engineering and agent execution                                                      |
| Priority        | P1                                                                                   |
| Size            | M — relative complexity, not a time estimate                                         |
| Prerequisites   | [FW-007](007-durable-adviser-jobs.md), [FW-013](013-model-gateway-contract-tests.md) |
| Owner           | Unassigned                                                                           |
| Review decision | Pending                                                                              |

## User story

As an operator, I want a visible cancel action to stop further adviser work and prevent late results from becoming actionable, so that I can regain control without waiting for a provider deadline.

## Current baseline and evidence

The server checks persisted run status between steps and preserves a terminal cancellation. Cancellation does not abort an already submitted provider call, and the shared busy UI makes same-tab cancellation awkward during synchronous execution.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [src/server/model-gateway.ts](../../../src/server/model-gateway.ts)
- [src/components/operations-hub.tsx](../../../src/components/operations-hub.tsx)
- [src/components/intelligence-views.tsx](../../../src/components/intelligence-views.tsx)
- [tests/integration/intelligence.test.ts](../../../tests/integration/intelligence.test.ts)

## Proposed scope

Add usable cancellation to the durable runtime, with a defined race policy and best-effort provider abort. Cancellation cannot promise to reverse provider work or charges already incurred.

## Acceptance criteria

- [ ] The operator can cancel a queued or running job from its trace view while other UI work remains responsive.
- [ ] Cancellation is tenant-scoped, authorized and idempotent; repeated requests return the persisted decision rather than creating duplicate audit effects.
- [ ] The worker observes cancellation within a reviewed bounded interval and propagates an abort signal to an in-flight adapter when supported.
- [ ] A late provider response or stale worker token cannot append actionable approval records or overwrite CANCELLED with SUCCEEDED.
- [ ] The race between completion and cancellation has one documented winner based on committed state. A completed domain action is not silently reversed.

## Suggested implementation sequence

1. Define cancel-requested and terminal semantics with FW-007's lease owner and decide where cancellation becomes irrevocable.
2. Pass a combined cancellation/deadline signal through the gateway and stop committing steps after the final fence check.
3. Keep cancellation controls outside the general command busy lock and show provider-outcome uncertainty accurately.

## Verification and evidence to retain

- Cancel a queued job, a blocked read step and a delayed fake provider call; verify terminal status and absence of new proposals.
- Release the provider response concurrently with cancellation in repeated controlled interleavings and assert only allowed terminal states.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Draw the completion-versus-cancel race and identify the transaction that chooses the winner. Explain the difference between aborting a request and reversing an effect.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

What observation interval is useful for cancellation, and what should the user see if the provider completed before the cancellation took effect?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
