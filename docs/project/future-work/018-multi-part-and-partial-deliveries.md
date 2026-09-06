# FW-018: Handle repair material lists and partial cargo receipts

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

As a maintenance planner, I want to reserve several required parts and receive a shipment in portions so that readiness reflects the materials actually available.

## Current baseline and evidence

The current repair requires one SKU and quantity. Inventory reservations, procurement commitments and duplicate-safe full shipment receipt already work transactionally. This story extends their data model and allocation rules rather than adding a second competing stock system.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/inventory.ts](../../../src/server/inventory.ts)
- [src/server/procurement.ts](../../../src/server/procurement.ts)
- [src/server/logistics.ts](../../../src/server/logistics.ts)
- [src/server/maintenance.ts](../../../src/server/maintenance.ts)
- [src/server/ledger.ts](../../../src/server/ledger.ts)
- [tests/integration/repair.test.ts](../../../tests/integration/repair.test.ts)

## Proposed scope

Introduce work-order material lines and receipt lines for existing simulated procurement/cargo flows. Define a deterministic reservation lock order and integer-cent allocation policy. Defer substitutions, returns and currency conversion.

## Acceptance criteria

- [ ] A work order lists distinct SKUs and positive integer quantities; readiness requires every mandatory line to be fully reserved at the correct station.
- [ ] Concurrent reservations cannot oversubscribe any SKU, and cancellation releases only held quantities; multi-line failure behavior is explicitly atomic or explicitly partial in the contract and UI.
- [ ] Each partial delivery has an immutable command identity and line quantities; duplicate delivery is harmless and cumulative receipts cannot exceed the shipment's authorized quantities.
- [ ] Only received quantities affect stock and recognized receipt value; remaining commitments are retained or released according to explicit cancellation rules, and integer-cent allocations reconcile exactly.
- [ ] The UI displays required, reserved, shipped, received and outstanding quantities per line, and a partial arrival cannot start a repair that still lacks mandatory material.

## Suggested implementation sequence

1. Write quantity and money conservation equations, including a three-unit purchase whose total does not divide evenly.
2. Add line tables and a migration that preserves existing single-line histories; update reservation/receipt commands under consistent locks.
3. Carry line state through procurement, cargo and repair views, then exercise a delayed final portion.

## Verification and evidence to retain

- Race two work orders for overlapping SKUs and two receipts for the remaining shipment quantity; assert stock bounds, receipt uniqueness and balanced journals.
- Complete a two-part repair after multiple arrivals, replay each command, and verify exact cents, cancellation behavior and cross-station isolation.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Build a small quantity ledger before coding. Predict the state after each partial arrival and after canceling the undelivered remainder.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Should a reservation acquire all required lines atomically, or may it hold available lines while waiting for the remainder?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
