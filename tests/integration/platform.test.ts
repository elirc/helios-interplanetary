import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrate } from "../../src/server/migrations";
import { resetFixtures } from "../../src/server/fixtures";
import { executeClock, tickSimulation } from "../../src/server/simulation-clock";
import {
  claimEvent,
  deliverEvent,
  processNextEvent,
  resolveAndRedrive,
} from "../../src/server/worker";
import { transaction } from "../../src/server/db";
import { audit } from "../../src/server/audit";
import { actor, testPool, repairFixture, command } from "../helpers";
import { processTimers } from "../../src/server/timers";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const pool = testPool();
const execAsync = promisify(execFile);
before(() => migrate(pool));
beforeEach(() => resetFixtures(pool));
after(() => pool.end());
const clock = (action: string, fields = {}) =>
  executeClock(actor, { commandId: randomUUID(), action, ...fields }, pool);

test("clock pause, seeded advancement and solar isolation produce an energy cascade", async () => {
  assert.equal(await tickSimulation(actor, pool), false);
  await clock("solar_outage");
  await clock("advance", { seconds: 900 });
  const first = (
    await pool.query("SELECT battery_kwh FROM energy_grids WHERE organization_id='org-helios'")
  ).rows[0].battery_kwh;
  assert.ok(Math.abs(first - 274.2) < 0.001);
  await assert.rejects(clock("repair_solar"), { code: "ISOLATION_REQUIRED" });
  await clock("shed_load");
  await clock("advance", { seconds: 900 });
  const next = (
    await pool.query("SELECT battery_kwh FROM energy_grids WHERE organization_id='org-helios'")
  ).rows[0].battery_kwh;
  assert.ok(first - next < 25.8);
  assert.equal(
    (await pool.query("SELECT status FROM projects WHERE organization_id='org-helios'")).rows[0]
      .status,
    "BLOCKED_ENERGY",
  );
  await assert.rejects(clock("restore_load"), { code: "SOLAR_REPAIR_REQUIRED" });
  await clock("repair_solar");
  await clock("restore_load");
  await clock("advance", { seconds: 900 });
  assert.equal(
    (await pool.query("SELECT status FROM projects WHERE organization_id='org-helios'")).rows[0]
      .status,
    "ACTIVE",
  );
});

test("domain audit and outbox roll back together", async () => {
  const before = (await pool.query("SELECT count(*)::int AS n FROM outbox_events")).rows[0].n;
  await assert.rejects(
    transaction(pool, async (c) => {
      await audit(c, actor, "RollbackProbe", "probe", randomUUID(), {});
      throw new Error("abort");
    }),
  );
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM outbox_events")).rows[0].n,
    before,
  );
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM audit_events WHERE action='RollbackProbe'"))
      .rows[0].n,
    0,
  );
});

test("redelivering the same committed event preserves one notification and consumer receipt", async () => {
  const event = (await claimEvent(actor, pool))!;
  assert.ok(event);
  await deliverEvent(actor, event, pool);
  await pool.query(
    "UPDATE outbox_events SET status='PENDING',available_at=clock_timestamp() WHERE id=$1",
    [event.id],
  );
  const retry = (await claimEvent(actor, pool))!;
  assert.equal(retry.id, event.id);
  assert.equal((await deliverEvent(actor, retry, pool)).duplicate, true);
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM notifications WHERE event_id=$1", [event.id]))
      .rows[0].n,
    1,
  );
  assert.equal(
    (
      await pool.query("SELECT count(*)::int AS n FROM event_receipts WHERE event_id=$1", [
        event.id,
      ])
    ).rows[0].n,
    1,
  );
});

test("a crashed worker lease can be reclaimed and its stale token is fenced", async () => {
  const abandoned = (await claimEvent(actor, pool, 0))!;
  const replacement = (await claimEvent(actor, pool))!;
  assert.equal(replacement.id, abandoned.id);
  assert.notEqual(replacement.lease_token, abandoned.lease_token);
  await assert.rejects(deliverEvent(actor, abandoned, pool), { code: "LEASE_LOST" });
  assert.equal((await deliverEvent(actor, replacement, pool)).status, "DELIVERED");
});

test("poison deliveries stop after three attempts and an audited resolution allows redrive", async () => {
  await pool.query("UPDATE outbox_events SET status='DELIVERED'");
  await transaction(pool, (c) =>
    audit(c, actor, "ExercisePoisonEvent", "exercise", randomUUID(), { simulated: true }),
  );
  const id = (
    await pool.query("SELECT id FROM outbox_events WHERE event_type='ExercisePoisonEvent'")
  ).rows[0].id;
  for (let i = 0; i < 3; i++) {
    await processNextEvent(actor, pool);
    await pool.query(
      "UPDATE outbox_events SET available_at=clock_timestamp()-interval '1 second' WHERE id=$1",
      [id],
    );
  }
  assert.equal(
    (await pool.query("SELECT status FROM outbox_events WHERE id=$1", [id])).rows[0].status,
    "DEAD",
  );
  assert.equal(await processNextEvent(actor, pool), null);
  await resolveAndRedrive(actor, id, pool);
  await processNextEvent(actor, pool);
  assert.equal(
    (await pool.query("SELECT status FROM outbox_events WHERE id=$1", [id])).rows[0].status,
    "DELIVERED",
  );
});

test("late workflow projection events read current domain status instead of regressing it", async () => {
  const f = await repairFixture(pool);
  await command(pool, "reserve_parts", { workOrderId: f.workOrderId });
  for (let i = 0; i < 12; i++) {
    if (!(await processNextEvent(actor, pool))) break;
  }
  const workflow = (
    await pool.query("SELECT status FROM workflow_instances WHERE resource_id=$1", [f.workOrderId])
  ).rows[0];
  assert.equal(workflow.status, "AWAITING_PARTS");
});

test("an actual child process exits after claim and a new process recovers its delivery", async () => {
  let claimed = "";
  try {
    await execAsync(
      process.execPath,
      ["--import", "tsx", "scripts/worker-crash-probe.ts", "--crash"],
      { env: process.env },
    );
    assert.fail("Probe must exit before acknowledgement.");
  } catch (error) {
    const result = error as Error & { code: number; stdout: string };
    assert.equal(result.code, 17);
    claimed = JSON.parse(result.stdout).claimed;
  }
  assert.ok(claimed);
  await pool.query(
    "UPDATE outbox_events SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",
    [claimed],
  );
  const result = await execAsync(
    process.execPath,
    ["--import", "tsx", "scripts/worker-crash-probe.ts"],
    { env: process.env },
  );
  assert.equal(JSON.parse(result.stdout).status, "DELIVERED");
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM event_receipts WHERE event_id=$1", [claimed]))
      .rows[0].n,
    1,
  );
});

test("workflow deadlines escalate once and interrupted agent runs reach a terminal state", async () => {
  const workflowId = randomUUID(),
    runId = randomUUID();
  await pool.query(
    "INSERT INTO workflow_instances(id,organization_id,kind,resource_id,status,due_at) VALUES($1,'org-helios','procurement-approval','timer-probe','PENDING_APPROVAL',clock_timestamp()-interval '1 hour')",
    [workflowId],
  );
  await pool.query(
    "INSERT INTO agent_runs(id,organization_id,agent,provider,model,prompt_version,status,requested_by,input,started_at) VALUES($1,'org-helios','diagnostic','fixture','fixture','v1','RUNNING','test','{}',clock_timestamp()-interval '3 minutes')",
    [runId],
  );
  assert.deepEqual(await processTimers(actor, pool), { escalated: 1, recovered: 1 });
  assert.deepEqual(await processTimers(actor, pool), { escalated: 0, recovered: 0 });
  assert.equal(
    (await pool.query("SELECT status FROM agent_runs WHERE id=$1", [runId])).rows[0].status,
    "FAILED",
  );
});
