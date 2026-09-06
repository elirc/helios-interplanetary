# FW-007: Run advisers as durable background jobs

[Back to the review backlog](README.md)

| Field           | Proposed value                                  |
| --------------- | ----------------------------------------------- |
| Status          | Proposed — awaiting review                      |
| Theme           | Engineering and agent execution                 |
| Priority        | P1                                              |
| Size            | L — relative complexity, not a time estimate    |
| Prerequisites   | [FW-006](006-reproducible-agent-checkpoints.md) |
| Owner           | Unassigned                                      |
| Review decision | Pending                                         |

## User story

As an operator, I want to submit an adviser job and return to it later, so that closing a tab or restarting an application process does not leave execution dependent on one HTTP request.

## Current baseline and evidence

runAgent performs tools, model work and policy checks inside the request lifetime. Runs and steps are persisted, and the timer marks abandoned runs FAILED after two minutes. This detects interruption but is not resumable job execution.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [src/app/api/intelligence/route.ts](../../../src/app/api/intelligence/route.ts)
- [src/server/worker.ts](../../../src/server/worker.ts)
- [src/server/timers.ts](../../../src/server/timers.ts)
- [scripts/worker.ts](../../../scripts/worker.ts)
- [src/components/intelligence-views.tsx](../../../src/components/intelligence-views.tsx)

## Proposed scope

Introduce queued adviser jobs with leases and persisted step boundaries, reusing the domain authority and bounded tool plan. Define recovery rules for read steps and ambiguous model attempts.

## Acceptance criteria

- [ ] Submission returns an accepted run identity promptly; submitting the same command and payload produces one job, while changed payload conflicts.
- [ ] A worker claims the job with a lease and fencing token. Two workers cannot commit the same step or approval effect.
- [ ] Each step records input/evidence versions and terminal output before a successor is selected. Recovery distinguishes a completed step from an unconfirmed attempt.
- [ ] After process loss between steps, another worker resumes from a valid checkpoint. After an ambiguous provider call, it follows an explicit bounded retry/stop policy and preserves possible duplicate-cost uncertainty.
- [ ] The UI can reload, display the persisted job state, and show completed, failed or review-required outcomes. Human approval remains a separate authorized domain transaction.

## Suggested implementation sequence

1. Specify run/step state transitions and crash boundaries before adding an additive migration.
2. Separate submission from execution and add a dedicated bounded adviser worker claim path, with transaction fences for committing results.
3. Replace the generic two-minute abandonment rule for queued jobs with lease-aware recovery and adapt the UI to poll run status.

## Verification and evidence to retain

- Terminate a real child process after a persisted read step and verify another process resumes without duplicate approvals.
- Simulate provider completion followed by lost confirmation; verify the documented uncertainty policy and that no domain write occurs automatically.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Predict the durable state at three crash points. Explain why a stored RUNNING row is insufficient to resume execution safely.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which steps may be repeated, and what should happen when a provider request may have completed but its response was never persisted?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
