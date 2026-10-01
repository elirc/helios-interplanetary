# Inspect all effects after the rejected transaction

The regression runs on real PostgreSQL. Its trigger executes inside the transaction that attempts to insert the postmortem, causing the preceding repair writes to roll back. Repository mocks or an in-memory model could imitate those final values without exercising the database behavior, so they are not substituted here.

The audit assertion compares with a captured baseline rather than requiring an empty table. Fixture setup legitimately creates audit history. The command-receipt assertion uses the exact command identifier, while postmortem checks use the fixture incident. Those scopes distinguish this attempted repair from unrelated setup effects.

When the expected exception is missing, verify that the postmortem insert was reached and that the trigger was installed in the owned test database. When an earlier prerequisite fails, inspect checklist completion and fresh telemetry rather than weakening the late-failure assertion. When cleanup fails, keep that failure visible because an active trigger can contaminate subsequent tests.

The repository's broader acceptance commands include lint, type generation, unit tests, integration tests, a production build, local API smoke, and the coolant-repair browser flow. Each provides different evidence. The trigger regression proves a local persistence property; browser success demonstrates an affected visible workflow but does not replace the database rollback assertions.

## Source excerpt

From [tests/integration/repair.test.ts](../../tests/integration/repair.test.ts).

```ts
  const auditBefore = (
    await pool.query("SELECT count(*)::int AS n FROM audit_events WHERE organization_id=$1", [
      actor.organizationId,
    ])
  ).rows[0].n;

  await pool.query(`
    CREATE OR REPLACE FUNCTION test_reject_postmortem_sol15() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected postmortem failure'; END $$;
    CREATE TRIGGER test_reject_postmortem_sol15
    BEFORE INSERT ON postmortems
    FOR EACH ROW EXECUTE FUNCTION test_reject_postmortem_sol15();
  `);
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
