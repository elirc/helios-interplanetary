# Prove late repair failure rolls back and can recover

Helios already completes a repair through a PostgreSQL transaction. The existing workflow consumes reserved inventory, completes the work order, releases the crew, resolves the incident, records audit history, creates a postmortem, and saves the command receipt. The improvement adds evidence for a failure after most of those effects have been attempted.

The new regression installs a test-owned trigger that rejects the postmortem insert. It then invokes the real complete_repair operation and checks that earlier writes rolled back. After removing the trigger, it retries the exact same command identifier and payload, then replays that command again. The successful retry must complete once, and the replay must return the stored result without consuming inventory twice.

This is a focused verification improvement to the existing application, not a replacement of the completed local workflow program. Its prior source, prompts, and execution record remain intact. The new owned-database helper provides a reproducible environment for the repository checks, local API smoke, and affected repair browser flow.

Read the map and transaction concepts, then trace the failure through the worked example. Practice and the separate answers distinguish rollback from idempotent replay. Software verification does not establish human mastery; these lessons remain available for later review without interrupting the local build work.

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
