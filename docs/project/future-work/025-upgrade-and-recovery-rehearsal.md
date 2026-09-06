# FW-025: Rehearse schema upgrades and recovery on a disposable preview

[Back to the review backlog](README.md)

| Field           | Proposed value                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Status          | Proposed — awaiting review                                                                         |
| Theme           | Finance, workflow compatibility and delivery                                                       |
| Priority        | P1                                                                                                 |
| Size            | L — relative complexity, not a time estimate                                                       |
| Prerequisites   | [FW-022](022-workflow-version-compatibility.md), [FW-024](024-isolated-ci-and-release-evidence.md) |
| Owner           | Unassigned                                                                                         |
| Review decision | Pending                                                                                            |

## User story

As an operator, I want to prove the upgrade and recovery procedure with populated in-flight work so that a successful backup count is not mistaken for complete operational recoverability.

## Current baseline and evidence

The local backup rehearsal restored a separate database and matched selected counts and journal balances. Container replacement also preserved operational counts. That establishes useful persistence evidence, but not full record equivalence, schema-upgrade compatibility or a production recovery-time objective.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [scripts/backup-rehearsal.mjs](../../../scripts/backup-rehearsal.mjs)
- [scripts/persistence-check.mjs](../../../scripts/persistence-check.mjs)
- [src/server/migrations.ts](../../../src/server/migrations.ts)
- [deploy/README.md](../../../deploy/README.md)
- [docs/exec-plans/002-complete-local-program.md](../../../docs/exec-plans/002-complete-local-program.md)

## Proposed scope

Build a guarded local rehearsal around an old and candidate preview, representative in-flight states and an isolated restore target. Test one additive schema upgrade using the FW-022 compatibility contract. Keep all destructive cleanup confined to resources created and verified by that rehearsal.

## Acceptance criteria

- [ ] The fixture includes unfinished repair/reservation work, an unknown payment outcome, pending and leased events, and recorded adviser evidence; manifests identify the exact snapshots and code/schema versions.
- [ ] The upgrade sequence explicitly states when writes pause, which old/new app and worker combinations are supported, and when rollback becomes unavailable without restoring a backup.
- [ ] Restoration verifies canonical record digests and domain invariants, including references, reserved stock, balanced journals, payment identities, receipts and citation provenance; count equality alone cannot pass.
- [ ] After recovery, the worker and operator can finish the representative workflows without duplicate payment, notification or inventory effects; any unavailable historical evidence is reported.
- [ ] The report measures actual interruption and recovery duration and data freshness for the rehearsal, records failure/abort behavior and cleanup ownership, and makes no unmeasured production SLA claim.

## Suggested implementation sequence

1. Define the recovery invariant set and populate a disposable preview with reproducible in-flight states.
2. Add guarded clone/restore, canonical digest comparison and a candidate migration/compatibility step.
3. Exercise recovery and the documented rollback path, preserving manifests and an operator checklist with explicit stop conditions.

## Verification and evidence to retain

- Rehearse success plus an interrupted migration or incompatible worker; assert the tool stops safely and the documented recovery path restores a usable preview.
- Alter a restored row while preserving table counts and confirm verification fails; resume pending work and inspect exact domain/provider/receipt effects.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Choose one row-level corruption that count checks miss. Explain which invariant detects it and how you would recover without blindly reversing a migration.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

What interruption and data-loss bounds should a future deployed environment target, and which rollback combinations will this first rehearsal actually support?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
