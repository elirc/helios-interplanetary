# FW-022: Process persisted events and workflows across version changes

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Finance, workflow compatibility and delivery |
| Priority        | P1                                           |
| Size            | L — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a maintainer, I want a new worker release to handle old persisted work deliberately so that a long-running simulation survives code upgrades.

## Current baseline and evidence

The outbox already persists payloads, delivery state, fenced leases and consumer receipts. Workflow and event version fields exist, and the current projection uses a v1 consumer identity. Version fields alone do not prove compatibility between different deployed implementations.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/worker.ts](../../../src/server/worker.ts)
- [src/server/audit.ts](../../../src/server/audit.ts)
- [src/server/timers.ts](../../../src/server/timers.ts)
- [src/domain/hub.ts](../../../src/domain/hub.ts)
- [tests/integration/platform.test.ts](../../../tests/integration/platform.test.ts)

## Proposed scope

Define supported event/workflow versions and explicit dispatch or adaptation for one representative upgrade. Preserve authoritative domain state and receipt semantics. Include adviser job payloads when FW-007 is available; do not make that optional integration a hidden prerequisite.

## Acceptance criteria

- [ ] A checked-in compatibility matrix identifies supported payload versions, handler versions and required migrations; a worker never silently interprets an unknown schema as the current one.
- [ ] A recorded v1 event fixture remains processable by the new worker and produces the same domain/projection meaning, with any transformation explicit and tested.
- [ ] Unsupported future versions are parked with a diagnosable reason and bounded retry behavior; unrelated supported work continues to progress.
- [ ] Consumer/receipt version decisions prevent accidental duplicate business effects during upgrade or redrive; rebuilding a projection has a distinct, documented identity.
- [ ] The rehearsal covers old persisted work before upgrade, mixed compatible workers where supported, and rollback constraints; unsupported combinations fail clearly before claiming safe processing.

## Suggested implementation sequence

1. Inventory persisted version fields and distinguish event data contracts from implementation and projection versions.
2. Choose a small v2 schema change and implement dispatch/adaptation plus explicit unsupported-version handling.
3. Run an old/new fixture matrix with lease recovery and redrive, then record the supported deployment sequence.

## Verification and evidence to retain

- Process old, current and unknown future payload fixtures; assert receipts, projection values, dead/parked diagnostics and continued processing of valid neighbors.
- Repeat delivery across the upgrade boundary and inspect for duplicate effects; test the documented rollback combination rather than assuming arbitrary rollback works.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Explain how changing a consumer name can defeat deduplication. Design a projection rebuild that does not resend every old notification.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

How long must old payload versions remain supported, and which changes should require draining work before deployment?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
