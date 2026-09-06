# FW-021: Issue partial simulated refunds with immutable credit notes

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Finance, workflow compatibility and delivery |
| Priority        | P2                                           |
| Size            | L — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a billing operator, I want to refund part of a paid invoice and explain the adjustment so that customer history remains consistent with the simulated ledger.

## Current baseline and evidence

Billing already handles integer-cent invoices, simulated payment uncertainty, reconciliation, signed webhooks and full refunds with balanced immutable journals. Partial refunds need their own identities, remaining-refundable balance and append-only adjustment history.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/billing.ts](../../../src/server/billing.ts)
- [src/server/ledger.ts](../../../src/server/ledger.ts)
- [src/components/enterprise-views.tsx](../../../src/components/enterprise-views.tsx)
- [tests/integration/billing.test.ts](../../../tests/integration/billing.test.ts)

## Proposed scope

Extend the simulated provider and billing commands with partial refund attempts and credit notes. Define the demo's allocation rules explicitly; real payment providers, tax calculation and jurisdiction-specific accounting compliance remain separate work.

## Acceptance criteria

- [ ] An authorized operator can request a positive integer-cent refund with a reason against a settled invoice; cumulative successful and reserved in-flight refunds cannot exceed the captured refundable amount.
- [ ] Each refund attempt retains its command/provider identity across retries and uncertain outcomes; a fresh browser retry cannot create a second refund for the same attempt.
- [ ] Concurrent requests serialize the refundable balance, and provider-success/local-timeout scenarios remain reconcilable without issuing another provider refund.
- [ ] Each confirmed partial refund produces one immutable credit note and balanced journal; originals remain unchanged and rounding allocations sum exactly to the refunded amount.
- [ ] The UI shows captured, refunded, reserved/unknown and remaining amounts, links adjustments to the invoice, and rejects cross-tenant or auditor mutation attempts.

## Suggested implementation sequence

1. Specify the refund state machine and conservation equation, including unknown provider outcomes.
2. Add additive attempt/credit-note records and extend the simulated provider's idempotent behavior before changing the UI.
3. Reuse journal posting and reconciliation mechanisms with unique per-refund posting keys.

## Verification and evidence to retain

- Race requests whose combined amounts exceed the remaining balance; inspect both provider and ledger records and confirm no over-refund.
- Simulate success followed by lost confirmation, reconcile twice, then fully refund the remainder; assert exact cents, one credit note per success and immutable originals.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Write the equation relating captured funds, confirmed refunds, held refund attempts and available balance. Mark which terms remain uncertain after a timeout.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Should the operator choose invoice lines or only a total amount in the first increment, and how will any line allocation be explained?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
