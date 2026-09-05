# 1. From a master prompt to executable work

The original brief named many domains and technologies. That was enough to establish a product direction, but it did not decide the smallest useful behavior or prove that an agent had finished it.

The first run selected telemetry → incident. The second user instruction explicitly expanded the authorized run to all milestones and deferred teaching review. The agent recorded that change in [Run 002](../../docs/exec-plans/002-complete-local-program.md), then built the dependent workflows. This distinction matters: a task boundary can grow when the user authorizes it; an agent should not silently grow or shrink it to make its own job easier.

## Exercise: reconstruct the M02 contract

Before opening `maintenance.ts`, write a task contract for this sentence:

> An operator can create a maintenance work order from an acknowledged coolant incident.

Decide what happens when the request is delivered twice, another organization supplies the incident ID, the incident is still open, or the incident has already resolved. Name one UI observation and one database assertion that would disprove a completion claim.

Then inspect [the service](../../src/server/maintenance.ts), [the command boundary](../../src/server/operations.ts), and [the repair tests](../../tests/integration/repair.test.ts). Record where your contract and the implementation differ. A difference is a review question, not automatically a bug.

## Why the contract includes constraints

The run retained PostgreSQL and direct domain calls. A separate worker was introduced for actual background progression and retried delivery. An event broker was not needed to demonstrate the database/publication gap. Live provider credentials and cloud identity were not available, so the implementation exposed those configuration boundaries instead of pretending to validate them.

These are consequential implementation choices. A good supervision prompt asks the agent to state them early and retain them in the checkpoint. It does not need a long list of forbidden frameworks.

## A better next instruction

Compare these two instructions:

```text
Make inventory production-ready and add lots of tests.
```

```text
Allow two different work orders to compete for the last cartridge.
Exactly one may reserve it; available stock must never become negative.
Use real PostgreSQL transactions and preserve tenant boundaries.
Verify the losing work order remains actionable and cancellation releases stock.
Record the result and any remaining evidence gap in the active run plan.
```

The second prompt specifies a falsifiable result while leaving routine code choices to the agent. The skill is choosing what must be explicit, not writing the longest possible prompt.

Your evidence: the first contract, your revised contract, and an explanation of one ambiguity you removed. Leave the progress tracker pending until that work exists.
