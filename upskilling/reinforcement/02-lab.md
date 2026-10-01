# Isolated lab: Tenant-scoped keyset pages with tied timestamps

This is a small executable model, deliberately separate from the application. It uses Node's built-in test runner and has no package install, service, database, network call, or paid API dependency. It is JavaScript so you can focus on behavior first; the transfer task connects it back to this repository's JS/TS code.

## Contract

Implement `pageInvoices(rows, {tenantId, cursor = null, limit})`.

- Rows are validated synthetic records `{id, tenantId, createdAt}`. createdAt is an integer timestamp; IDs are unique lowercase ASCII strings within a tenant. Neither timestamps nor IDs change during one call.
- Require limit to be an integer from 1 to 100; reject otherwise with RangeError.
- Filter to tenantId first. Order descending by createdAt, then descending by ID using ordinary ASCII string comparison.
- A non-null cursor `{createdAt,id}` is exclusive: include rows strictly after it in that descending order. It may describe a row no longer present.
- Return at most limit rows in a new array, preserving row object references and leaving input unchanged.

The cursor is a position, not authorization. This lab does not encode/sign cursors, query PostgreSQL, or establish snapshot consistency across requests.

## Work sequence

1. Read `lab/contract-check.mjs`. Predict the output of two cases on paper before editing anything.
2. Run the command below. The checked-in starter throws `Not implemented`; this first failure is intentional.
3. Implement only `lab/exercise.mjs`. Keep the tests unchanged until the supplied contract passes.
4. Add one test from your own boundary case. Explain which plausible wrong implementation it rejects.
5. Change one line of your implementation to a plausible mistake and show a test turns red. Undo only that experimental change.
6. Write down the distinction between this pure model and the real app boundary. Continue to [transfer](03-transfer.md).

From this pack's directory:

```powershell
node --test lab/contract-check.mjs
```

Or from the repository root, use `upskilling/reinforcement/lab/contract-check.mjs` in that command.
Node 22.16.0 was available during authoring; no dependencies are needed for these `.mjs` files.

## Debugging prompts

- What happens when all rows have the same timestamp?
- Is the second sort direction explicit?
- Are you filtering tenant identity before limiting?
- Does the cursor comparison use strict inequality so the last row is not repeated?

## Completion evidence

Record the input, expected result, actual result, and the first place they diverge. A passing test with an assertion deleted does not count. Leave the app's source untouched while solving this lab.

After your attempt, compare [the reasoning guide](_answers/GUIDE.md). The separate reference implementation is checked with:

```powershell
node lab/contract-check.mjs --reference
```

That command exercises the answer, not your solution. It is for comparison after the attempt and for validating the teaching material.
