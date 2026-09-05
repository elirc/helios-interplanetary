# 2. Feedback loops that test correctness

During the second build, six targeted repair tests passed before the broader interface was integrated. They covered duplicate work creation, tenant/role denial, last-item contention, budget contention, receipt replay and repair verification. That established domain behavior, not browser correctness. The later browser journey had a different job: prove the visible controls invoked those real transitions.

## Trace the last item

Read [inventory.ts](../../src/server/inventory.ts) and locate the stock-row lock. Two work orders can each pass a check performed outside the transaction and both believe they own the last part. The implementation checks available stock while holding the database lock, then writes the reservation and work-order status in that transaction.

Before reading the test body, predict the persisted outcome of:

1. One cartridge is on hand and none are reserved.
2. Work orders A and B attempt reservation concurrently.
3. The winner is cancelled.
4. The loser retries.

Write expected stock, reservation and work-order states after each step. Then run:

```sh
node --env-file-if-exists=.env --import tsx --test --test-name-pattern="two simultaneous reservations" tests/integration/repair.test.ts
```

This resets `helios_test`. Do not run another integration or browser suite at the same time. It does not reset the development world.

## Review a check, not just its green result

Does the test create real competing transactions? Does it assert both the winner and the loser? Could the code leave the loser silently marked ready while still preserving the numeric stock constraint? Could a later cancellation release the same part twice?

If your assertion only checks the final `on_hand` value, it can miss reservation defects. If it only checks a returned status, it can miss a rollback or stale display. A useful test links externally meaningful outcomes to durable state.

## Follow the accounting boundary

Receipt changes origin stock, destination stock, budget commitment, spend, shipment state and work readiness. Those changes are in [one transaction](../../src/server/logistics.ts). Payment-provider uncertainty uses a different design: the [simulated provider charge](../../src/server/billing.ts) commits separately from Helios settlement so a timeout can leave an authentic local uncertainty gap.

Explain why making everything one database transaction would erase the payment lesson, while splitting the local receipt transaction would introduce unnecessary inconsistency.

The database also enforces journal balance at commit and prevents later edits or appends. Inspect [migration 005](../../db/migrations/005-finance-support-security.sql). Predict why checking each inserted line immediately would reject a legitimate two-line entry before its second line arrives.

Your evidence: a predicted interleaving, a result comparison, and one plausible faulty implementation that your proposed check would reject. [Answer key](../solutions/02-program-invariants.md).
