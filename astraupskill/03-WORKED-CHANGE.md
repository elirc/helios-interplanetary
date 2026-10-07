# Fail at the final postmortem insert

Walkthrough of `tests/integration/repair.test.ts:250-355`. The file's `beforeEach` calls `resetFixtures(pool)` (line 15), so every test starts from seed data.

## 1. Build a legitimate VERIFYING repair (lines 251-264)

```ts
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
```

Every step goes through the real `executeOperation`. Setting `on_hand=1` makes the later inventory assertion exact (`{1,1}` before, `{0,0}` after). The nominal scenario supplies the "newer nominal telemetry" that `complete_repair` demands (`src/server/maintenance.ts:177-183`); without it the call would fail with `VERIFICATION_REQUIRED` for the wrong reason.

## 2. Capture a baseline and inject the failure (lines 266-280)

The test fixes `commandId` and `input` once, records the organization's `audit_events` count, then creates `test_reject_postmortem_sol15()` and a `BEFORE INSERT` trigger on `postmortems` that raises `'injected postmortem failure'`. The postmortem insert is the **last** write in `complete_repair` (line 208), so every other repair effect has already been attempted when the trigger fires.

## 3. Assert the rollback (lines 281-323)

`assert.rejects(executeOperation(actor, input, pool), /injected postmortem failure/)`, then seven durable-state checks: work order `VERIFYING`, incident `ACKNOWLEDGED`, crew `available=false`, stock `{on_hand:1, reserved:1}`, zero postmortems for the incident, audit count equal to the baseline, zero `operation_commands` rows for `commandId`.

## 4. Clean up in `finally` (lines 324-327)

```ts
  } finally {
    await pool.query("DROP TRIGGER IF EXISTS test_reject_postmortem_sol15 ON postmortems");
    await pool.query("DROP FUNCTION IF EXISTS test_reject_postmortem_sol15()");
  }
```

If an assertion fails, the trigger still goes away, so later tests in the run are not poisoned.

## 5. Recover, then replay (lines 329-354)

The **same** `input` object is sent twice. The first call returns `replayed: false` (no receipt survived the rollback); the second returns `replayed: true`. Then: stock `{0,0}` (consumed once), incident `RESOLVED`, exactly one postmortem, exactly one receipt.

Production code was not changed for this regression; the transaction already existed. The execution plan (`docs/exec-plans/003-repair-rollback-regression.md`) records this bounded scope separately from the earlier M01-M15 program.

[02-CONCEPTS](02-CONCEPTS.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md)
