# FW-004: Retry an uncertain browser command with its original identity

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

As an operator whose connection drops after a command, I want to recover its outcome or retry the same command identity, so that a repeated click does not accidentally repeat an effect.

## Current baseline and evidence

The server has payload-bound command receipts, but OperationsHub generates a new UUID for each invocation of send(). Server idempotency alone does not preserve the identity of an uncertain browser submission.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/components/operations-hub.tsx](../../../src/components/operations-hub.tsx)
- [src/server/operations.ts](../../../src/server/operations.ts)
- [src/server/scenarios.ts](../../../src/server/scenarios.ts)
- [src/app/api/operations/commands/route.ts](../../../src/app/api/operations/commands/route.ts)

## Proposed scope

Add a browser-side pending-command lifecycle and a tenant-scoped outcome lookup where needed. Cover ordinary operations and scenario run IDs; keep their existing contracts explicit.

## Acceptance criteria

- [ ] A command ID and immutable payload are created before submission and retained until a definitive outcome is known.
- [ ] A dropped response is shown as uncertain, with recovery/retry using that same ID and payload. A changed payload creates a separately identified command.
- [ ] An outcome lookup is scoped to the current principal and cannot expose another tenant's or unauthorized actor's receipt.
- [ ] Retrying a committed usage or clock-advance command after response loss produces one business effect, even after a page reload within the same authorized session.
- [ ] Signing out, changing persona or clearing the local pending state cannot cause an old command to be submitted under another identity. Unsupported legacy command types are explicitly handled rather than presented as safely replayable.

## Suggested implementation sequence

1. Define pending, uncertain, confirmed and rejected client states and their transitions before changing the buttons.
2. Store only the minimum recovery record for this local session and provide an explicit way to inspect or abandon it without asserting that the server rolled back.
3. Reuse existing command receipts and scenario identities; add read-only recovery routes with the same server authorization rules.

## Verification and evidence to retain

- Use a browser intercept that lets the server commit and then loses the response; retry after reload and assert one usage entry or one clock increment in PostgreSQL.
- Test changed payloads, a definitive 4xx rejection, and persona switching while an uncertain command exists.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Draw the timeline from browser click to commit to response loss. State why a disabled button and a fresh retry UUID do not establish idempotency.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which commands should retain recovery state across reload, and how should an operator distinguish an uncertain outcome from a rejected request?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
