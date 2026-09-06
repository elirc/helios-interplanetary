# FW-019: Schedule crew availability and reject overlapping assignments

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Knowledge and domain operations              |
| Priority        | P2                                           |
| Size            | L — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a maintenance planner, I want availability windows and conflict checks so that future assignments remain feasible when the simulation clock advances.

## Current baseline and evidence

Assignment already checks station, availability and current COOLANT_L2 certification. Starting repair revalidates availability and certification and marks the technician unavailable. The extension is planned time windows, absences and explicit handling of eligibility changes during work.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/maintenance.ts](../../../src/server/maintenance.ts)
- [src/server/simulation-clock.ts](../../../src/server/simulation-clock.ts)
- [src/server/enterprise-fixtures.ts](../../../src/server/enterprise-fixtures.ts)
- [src/components/repair-desk.tsx](../../../src/components/repair-desk.tsx)
- [tests/integration/repair.test.ts](../../../tests/integration/repair.test.ts)

## Proposed scope

Add simulation-time shift and absence intervals plus planned assignment windows for the existing technician role. Preserve certification checks and actual execution history. Define how a running repair responds to shift end, absence and certification expiry.

## Acceptance criteria

- [ ] An operator can record valid shift and absence intervals; interval semantics and boundary inclusivity are documented and use the persisted simulation clock.
- [ ] Assignment requires station eligibility, certification and a compatible availability window; competing transactions cannot allocate the same technician to overlapping active assignments.
- [ ] Starting a repair revalidates the actual start time and current eligibility, even if a previous planned assignment was valid.
- [ ] A reviewed policy determines whether a running repair continues, pauses or requires reassignment when eligibility changes; that transition is audited and cannot erase completed task attribution.
- [ ] The planner can inspect conflicts and reassign unfinished work without double-booking or losing prior history; other-tenant crew and schedules remain inaccessible.

## Suggested implementation sequence

1. Specify interval overlap and the running-work decision table before schema changes.
2. Implement transactional conflict protection and simulation-time validation, including assignment update/cancellation.
3. Expose schedule and conflict details in the repair view and preserve task-level attribution through reassignment.

## Verification and evidence to retain

- Race overlapping assignments, test adjacent non-overlapping intervals and advance across shift/certification boundaries with deterministic simulation time.
- Reassign a partially completed work order and verify existing task evidence, availability release and cross-tenant denial.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Draw two overlapping assignments on a time axis and identify the database operation that must serialize them. Distinguish planned availability from actual occupancy.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

What should happen to an in-progress coolant repair when a shift ends or a certification expires?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
