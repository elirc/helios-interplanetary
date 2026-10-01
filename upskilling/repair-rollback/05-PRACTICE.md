# Separate failed execution, recovery, and replay

Exercise one: list the expected state of the work order, incident, crew, inventory, postmortem table, audit count, and command receipt immediately after the injected failure. Explain why the correct inventory result is still reserved rather than consumed or released.

Exercise two: remove the trigger and resend the exact command object. Predict replayed and the durable receipt count. Then send it again and predict the second replay flag and inventory values. State why changing the command identifier between these calls would fail to test the intended recovery contract.

Exercise three: move receipt insertion outside the transaction in a disposable copy. Describe two possible inconsistencies depending on whether the receipt or domain effects commit first. Identify which existing assertions would catch the late-failure version of that defect.

Exercise four: omit finally cleanup and let an assertion fail. Explain how the next test could fail for an unrelated reason. Propose a cleanup strategy that removes only the test-owned trigger and function without resetting the user's development database.

Exercise five: compare a passing targeted integration test with a passing browser repair flow. Identify what each establishes and what remains unverified about deployment, real physical equipment, external models, and the learner's understanding. Keep those claims separate in a review report.

## Source excerpt

From [tests/integration/repair.test.ts](../../tests/integration/repair.test.ts).

```ts
  try {
    await assert.rejects(executeOperation(actor, input, pool), /injected postmortem failure/);
    assert.equal(
      (await pool.query("SELECT status FROM work_orders WHERE id=$1", [f.workOrderId])).rows[0]
        .status,
      "VERIFYING",
    );
    assert.equal(
      (await pool.query("SELECT status FROM incidents WHERE id=$1", [f.incidentId])).rows[0]
        .status,
      "ACKNOWLEDGED",
    );
    assert.equal(
      (await pool.query("SELECT available FROM crew_members WHERE id='org-helios-crew-1'"))
        .rows[0].available,
      false,
    );
    assert.deepEqual(
      (
        await pool.query(
          "SELECT on_hand,reserved FROM inventory_stock WHERE warehouse_id='org-helios-local'",
        )
      ).rows[0],
      { on_hand: 1, reserved: 1 },
    );
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM postmortems WHERE incident_id=$1", [f.incidentId]))
        .rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool.query("SELECT count(*)::int AS n FROM audit_events WHERE organization_id=$1", [
          actor.organizationId,
        ])
      ).rows[0].n,
      auditBefore,
    );
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM operation_commands WHERE id=$1", [commandId]))
        .rows[0].n,
      0,
    );
  } finally {
    await pool.query("DROP TRIGGER IF EXISTS test_reject_postmortem_sol15 ON postmortems");
    await pool.query("DROP FUNCTION IF EXISTS test_reject_postmortem_sol15()");
  }

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
