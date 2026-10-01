# Fail at the final postmortem insert

The new test first prepares a valid repair using the existing application commands. It reserves one local item, assigns an eligible crew member, starts repair, completes checklist tasks in order, begins verification, and supplies fresh nominal telemetry. This setup avoids confusing a prerequisite rejection with the intended late database failure.

It captures the organization's audit count and creates a PostgreSQL trigger function that raises an injected exception before postmortem insertion. The real executeOperation call must reject with that message. The test then queries work-order status, incident status, crew availability, inventory counts, postmortems, audit rows, and the command receipt.

The trigger and function are removed in finally so an assertion failure cannot leave failure injection active for later tests. The same command object is then submitted twice: first recovery, then replay. Assertions check replay flags, one inventory consumption, resolved incident state, one postmortem, and one receipt.

Production repair code already contains the transaction and is preserved. The added helper and regression make that behavior reviewable under a concrete late failure. The execution plan records this bounded scope separately from the prior local M01–M15 completion record, avoiding a claim that the earlier application was rebuilt in this pass.

## Source excerpt

From [tests/integration/repair.test.ts](../tests/integration/repair.test.ts).

```ts
test("late completion failure rolls back every repair effect and the same command can recover", async () => {
  const f = await repairFixture(pool);
  const fields = { workOrderId: f.workOrderId };
  await pool.query("UPDATE inventory_stock SET on_hand=1 WHERE warehouse_id='org-helios-local'");
  await command(pool, "reserve_parts", fields);
  await command(pool, "assign_crew", { ...fields, crewId: "org-helios-crew-1" });
  await command(pool, "start_repair", fields);
  for (const taskKey of ["isolate", "replace", "inspect"])
    await command(pool, "complete_task", { ...fields, taskKey });
  await command(pool, "begin_verification", fields);
  await runScenario(
    actor,
    { runId: randomUUID(), assetId: f.assetId, kind: "nominal", seed: 23 },
    pool,
  );

  const commandId = randomUUID();
  const input = { commandId, action: "complete_repair" as const, ...fields };
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
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
