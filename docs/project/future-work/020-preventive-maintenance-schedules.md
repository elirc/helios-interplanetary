# FW-020: Create preventive work from versioned simulation-time schedules

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Knowledge and domain operations              |
| Priority        | P2                                           |
| Size            | L — relative complexity, not a time estimate |
| Prerequisites   | [FW-017](017-asset-and-station-registry.md)  |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a station operator, I want preventive maintenance to become due predictably so that routine work does not require manufacturing a failure incident.

## Current baseline and evidence

Work orders currently originate from acknowledged incidents, and the worker already advances a persisted simulation clock and processes timers. Planned maintenance needs its own work origin and occurrence identity while reusing the existing repair controls.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/maintenance.ts](../../../src/server/maintenance.ts)
- [src/server/timers.ts](../../../src/server/timers.ts)
- [src/server/simulation-clock.ts](../../../src/server/simulation-clock.ts)
- [src/server/worker.ts](../../../src/server/worker.ts)
- [src/domain/operations.ts](../../../src/domain/operations.ts)
- [tests/integration/platform.test.ts](../../../tests/integration/platform.test.ts)

## Proposed scope

Support one bounded schedule type: a fixed simulation-time interval per coolant asset with a versioned checklist template. Keep incident-driven recovery semantics distinct from planned-work completion. Defer calendar cron expressions and condition-prediction models.

## Acceptance criteria

- [ ] An operator can create, pause and revise a schedule with a valid first due time, positive interval and checklist version; historical occurrences retain their original rule.
- [ ] Each occurrence has a unique tenant/asset/schedule-version/due-time identity so worker restart, duplicate delivery and repeated ticking create at most one work order.
- [ ] A reviewed catch-up rule bounds work after a large clock jump and exposes skipped or coalesced occurrences; paused simulation does not advance due work.
- [ ] Preventive work has an explicit origin and completion rule without a fabricated incident; parts, crew, checklist and audit protections still apply.
- [ ] Schedule edits, cancellation and asset retirement have defined effects on pending versus in-progress occurrences and do not alter completed repair evidence.

## Suggested implementation sequence

1. Define origin, occurrence identity, catch-up limits and planned completion semantics.
2. Add an additive migration that preserves incident-work uniqueness, then enqueue due occurrences through existing durable processing.
3. Add schedule and due-work views and one end-to-end planned maintenance demonstration.

## Verification and evidence to retain

- Advance time across several intervals, restart the worker between claim and effect, and replay the same occurrence; assert the contract's exact work-order count.
- Test schedule revision at a due boundary, pause/resume, retirement and cancellation while an occurrence is already in progress.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Predict how many work orders should exist after a ten-interval jump under your chosen catch-up rule. Explain why unlimited catch-up could make a long-running worker unhealthy.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Should missed occurrences create individual work orders, one coalesced task, or an explicit operator review item?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
