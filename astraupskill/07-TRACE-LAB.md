# Trace the same command through three attempts

Draw three columns labeled failed attempt, recovery, and replay. Use one command identifier across all columns. In the first, acquire the organization-scoped advisory lock, observe no receipt, and execute the real maintenance operation. Mark the inventory, work-order, crew, incident, and audit writes as tentative until commit.

At the postmortem insert, fire the test trigger. Roll back the transaction and query the database from outside it. Record the original VERIFYING repair and reserved inventory, unchanged audit count, and absent receipt. The exception alone is not your evidence; the stored values are.

Remove the trigger and start the second column with the same input. Again there is no receipt, so the operation executes. This time the postmortem and receipt are written and the transaction commits. Record replayed false and one durable completion effect.

In the third column, find the saved receipt before executing maintenance. Confirm actor and payload match, then return its result with replayed true. No second inventory consumption or postmortem should occur. For a final thought experiment, alter the payload while keeping the identifier and trace the existing IDEMPOTENCY_CONFLICT branch. That is a rejected identifier reuse, not a valid replay of the same command.

## Source excerpt

From [tests/integration/repair.test.ts](../tests/integration/repair.test.ts).

```ts
  const recovered = await executeOperation(actor, input, pool);
  const replayed = await executeOperation(actor, input, pool);
  assert.equal(recovered.replayed, false);
  assert.equal(replayed.replayed, true);
  assert.deepEqual(
    (
      await pool.query(
        "SELECT on_hand,reserved FROM inventory_stock WHERE warehouse_id='org-helios-local'",
      )
    ).rows[0],
    { on_hand: 0, reserved: 0 },
  );
  assert.equal(
    (await pool.query("SELECT status FROM incidents WHERE id=$1", [f.incidentId])).rows[0].status,
    "RESOLVED",
  );
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM postmortems WHERE incident_id=$1", [f.incidentId]))
      .rows[0].n,
    1,
  );
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM operation_commands WHERE id=$1", [commandId]))
      .rows[0].n,
    1,
  );
});
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
