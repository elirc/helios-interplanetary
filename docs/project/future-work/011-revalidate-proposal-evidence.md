# FW-011: Revalidate the evidence behind an adviser proposal

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Approvals, model behavior and evidence       |
| Priority        | P1                                           |
| Size            | L — relative complexity, not a time estimate |
| Prerequisites   | [FW-010](010-versioned-tool-policies.md)     |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As an operator, I want approval to detect changed operational evidence so that an old recommendation cannot silently authorize a different decision.

## Current baseline and evidence

Approvals already bind the action and resource, expire after eight hours, require an operator and recheck applicable domain state. Creating a work order rechecks the degraded asset. The extension is an explicit dependency record and decision policy for other evidence changes, not the introduction of approval from scratch.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [src/server/agent-tools.ts](../../../src/server/agent-tools.ts)
- [src/server/knowledge.ts](../../../src/server/knowledge.ts)
- [tests/integration/intelligence.test.ts](../../../tests/integration/intelligence.test.ts)

## Proposed scope

Persist the relevant resource and knowledge versions used by a proposal. Define, separately for each currently supported action, which changes invalidate approval, require a refreshed proposal, or remain harmless. Keep checks and effects inside the authorized transaction.

## Acceptance criteria

- [ ] Each proposal records a versioned evidence manifest identifying the resources, document versions and decision-relevant values it actually used; unrelated tenant data is excluded.
- [ ] A reviewed decision table covers changed incident state, existing work orders, changed material availability and superseded procedures for the actions to which they apply.
- [ ] Approval atomically validates the manifest and current domain rules; a conflicting change creates a clear stale-proposal outcome without a partial domain effect.
- [ ] Exact retries of a previously successful approval still return the original outcome, including after expiry; evidence refresh cannot change the meaning of an already consumed approval.
- [ ] The operator sees which dependency changed and can request a fresh proposal without approving the stale one; another tenant cannot inspect the dependency details.

## Suggested implementation sequence

1. Trace the two supported action paths and enumerate only facts that affect each decision.
2. Add an immutable evidence manifest and explicit comparison rules, then integrate them with the existing approval transaction and receipts.
3. Expose structured stale reasons and add an action-specific race matrix to the approval tests.

## Verification and evidence to retain

- Interleave a proposal, each relevant state change and approval; assert the expected decision and the absence of duplicate work orders or events.
- Cover harmless changes, successful replay after expiry, changed document versions and cross-tenant inspection with real PostgreSQL assertions.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Write the dependency decision table before changing code. Explain why rejecting every version change would be overly strict and ignoring every change would be unsafe.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which evidence changes should force new human consent, and which should be handled by existing domain validation?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
