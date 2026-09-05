import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrate } from "../../src/server/migrations";
import { resetFixtures } from "../../src/server/fixtures";
import { PERSONAS } from "../../src/server/identity";
import { executeOperation } from "../../src/server/operations";
import { transitionIncident } from "../../src/server/incidents";
import { runScenario } from "../../src/server/scenarios";
import { ingestReading } from "../../src/server/telemetry";
import { actor, command, repairFixture, testPool } from "../helpers";

const pool = testPool();
before(() => migrate(pool));
beforeEach(() => resetFixtures(pool));
after(() => pool.end());

test("work order creation is unique under concurrent commands and binds command payload", async () => {
  const f = await repairFixture(pool);
  const input = { commandId: randomUUID(), action: "create_work_order", incidentId: f.incidentId };
  const results = await Promise.all([
    executeOperation(actor, input, pool),
    executeOperation(actor, input, pool),
    command(pool, "create_work_order", { incidentId: f.incidentId }),
  ]);
  assert.ok(results.every((r) => r.id === f.workOrderId));
  assert.equal(results.filter((r) => r.replayed).length, 1);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM work_orders")).rows[0].n, 1);
  await assert.rejects(executeOperation(actor, { ...input, incidentId: randomUUID() }, pool), {
    code: "IDEMPOTENCY_CONFLICT",
  });
});

test("new mutation boundaries reject viewers, tenant forgery, and invalid transitions", async () => {
  const f = await repairFixture(pool);
  for (const p of [PERSONAS.observer, PERSONAS.auditor])
    await assert.rejects(
      executeOperation(
        p,
        { commandId: randomUUID(), action: "reserve_parts", workOrderId: f.workOrderId },
        pool,
      ),
      { code: p.role === "viewer" ? "FORBIDDEN" : "NOT_FOUND" },
    );
  await assert.rejects(command(pool, "start_repair", { workOrderId: f.workOrderId }), {
    code: "NOT_READY",
  });
  await assert.rejects(
    executeOperation(
      actor,
      {
        commandId: randomUUID(),
        action: "reserve_parts",
        workOrderId: f.workOrderId,
        organizationId: "org-selene",
      },
      pool,
    ),
  );
  await command(pool, "reserve_parts", { workOrderId: f.workOrderId });
  const purchase = await command(pool, "request_purchase", { workOrderId: f.workOrderId });
  await assert.rejects(
    executeOperation(
      PERSONAS.observer,
      { commandId: randomUUID(), action: "approve_purchase", purchaseId: purchase.id },
      pool,
    ),
    { code: "NOT_FOUND" },
  );
  await assert.rejects(command(pool, "dispatch_purchase", { purchaseId: purchase.id }), {
    code: "APPROVAL_REQUIRED",
  });
});

test("two simultaneous reservations cannot take the same last item; cancellation releases it", async () => {
  const a = await repairFixture(pool),
    b = await repairFixture(pool, "pump-b18");
  await pool.query("UPDATE inventory_stock SET on_hand=1 WHERE warehouse_id='org-helios-local'");
  const outcomes = await Promise.all([
    command(pool, "reserve_parts", { workOrderId: a.workOrderId }),
    command(pool, "reserve_parts", { workOrderId: b.workOrderId }),
  ]);
  assert.deepEqual(outcomes.map((r) => r.status).sort(), ["AWAITING_PARTS", "READY"]);
  const winner = outcomes.find((r) => r.status === "READY")!,
    loser = outcomes.find((r) => r.status !== "READY")!;
  await command(pool, "cancel_work_order", { workOrderId: winner.id });
  assert.equal((await command(pool, "reserve_parts", { workOrderId: loser.id })).status, "READY");
  const stock = (
    await pool.query(
      "SELECT on_hand,reserved FROM inventory_stock WHERE warehouse_id='org-helios-local'",
    )
  ).rows[0];
  assert.deepEqual(stock, { on_hand: 1, reserved: 1 });
  await assert.rejects(
    pool.query("UPDATE inventory_stock SET reserved=2 WHERE warehouse_id='org-helios-local'"),
    { code: "23514" },
  );
});

test("competing purchase approvals enforce budget; cancellation restores commitment", async () => {
  const a = await repairFixture(pool),
    b = await repairFixture(pool, "pump-b18");
  const ids = [];
  for (const f of [a, b]) {
    await command(pool, "reserve_parts", { workOrderId: f.workOrderId });
    ids.push((await command(pool, "request_purchase", { workOrderId: f.workOrderId })).id);
  }
  await pool.query("UPDATE budgets SET limit_cents=480000 WHERE organization_id='org-helios'");
  const results = await Promise.allSettled(
    ids.map((purchaseId) => command(pool, "approve_purchase", { purchaseId })),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert.equal(rejected.reason.code, "BUDGET_EXCEEDED");
  const approved = ids[results.findIndex((r) => r.status === "fulfilled")];
  await command(pool, "cancel_purchase", { purchaseId: approved });
  assert.equal(
    (await pool.query("SELECT committed_cents FROM budgets WHERE organization_id='org-helios'"))
      .rows[0].committed_cents,
    0,
  );
});

test("delay, reroute and idempotent receipt move stock once and ready the repair", async () => {
  const f = await repairFixture(pool);
  await command(pool, "reserve_parts", { workOrderId: f.workOrderId });
  const p = await command(pool, "request_purchase", { workOrderId: f.workOrderId });
  await command(pool, "approve_purchase", { purchaseId: p.id });
  const s = await command(pool, "dispatch_purchase", { purchaseId: p.id });
  await assert.rejects(command(pool, "deliver_shipment", { shipmentId: s.id }), {
    code: "NOT_ARRIVED",
  });
  await command(pool, "delay_shipment", { shipmentId: s.id });
  assert.equal(
    (await pool.query("SELECT status FROM docking_reservations WHERE shipment_id=$1", [s.id]))
      .rows[0].status,
    "MISSED",
  );
  await command(pool, "reroute_shipment", { shipmentId: s.id });
  const eta = (await pool.query("SELECT eta FROM shipments WHERE id=$1", [s.id])).rows[0].eta;
  await ingestReading(
    actor,
    {
      id: randomUUID(),
      assetId: f.assetId,
      observedAt: eta.toISOString(),
      pressureBar: 1.7,
      vibrationMms: 8,
      temperatureC: 46,
      correlationId: randomUUID(),
    },
    pool,
  );
  await Promise.all([
    command(pool, "deliver_shipment", { shipmentId: s.id }),
    command(pool, "deliver_shipment", { shipmentId: s.id }),
  ]);
  assert.deepEqual(
    (
      await pool.query(
        "SELECT on_hand,reserved FROM inventory_stock WHERE warehouse_id='org-helios-local'",
      )
    ).rows[0],
    { on_hand: 1, reserved: 1 },
  );
  assert.deepEqual(
    (
      await pool.query(
        "SELECT on_hand,reserved FROM inventory_stock WHERE warehouse_id='org-helios-earth'",
      )
    ).rows[0],
    { on_hand: 11, reserved: 0 },
  );
  assert.deepEqual(
    (
      await pool.query(
        "SELECT committed_cents,spent_cents FROM budgets WHERE organization_id='org-helios'",
      )
    ).rows[0],
    { committed_cents: 0, spent_cents: 480000 },
  );
  assert.equal(
    (await pool.query("SELECT status FROM work_orders WHERE id=$1", [f.workOrderId])).rows[0]
      .status,
    "READY",
  );
});

test("repair enforces crew eligibility, checklist order and fresh verification before consuming parts", async () => {
  const f = await repairFixture(pool),
    fields = { workOrderId: f.workOrderId };
  await pool.query("UPDATE inventory_stock SET on_hand=1 WHERE warehouse_id='org-helios-local'");
  await command(pool, "reserve_parts", fields);
  for (const crewId of ["org-helios-crew-3", "org-helios-crew-4"])
    await assert.rejects(command(pool, "assign_crew", { ...fields, crewId }), {
      code: "CREW_INELIGIBLE",
    });
  await command(pool, "assign_crew", { ...fields, crewId: "org-helios-crew-1" });
  await command(pool, "start_repair", fields);
  await assert.rejects(command(pool, "complete_task", { ...fields, taskKey: "replace" }), {
    code: "TASK_ORDER",
  });
  await assert.rejects(command(pool, "begin_verification", fields), { code: "TASKS_INCOMPLETE" });
  for (const taskKey of ["isolate", "replace", "inspect"])
    await command(pool, "complete_task", { ...fields, taskKey });
  await runScenario(
    actor,
    { runId: randomUUID(), assetId: f.assetId, kind: "recovery", seed: 17 },
    pool,
  );
  await assert.rejects(transitionIncident(actor, f.incidentId, "resolve", pool), {
    code: "REPAIR_INCOMPLETE",
  });
  await command(pool, "begin_verification", fields);
  await assert.rejects(command(pool, "complete_repair", fields), { code: "VERIFICATION_REQUIRED" });
  await runScenario(
    actor,
    { runId: randomUUID(), assetId: f.assetId, kind: "nominal", seed: 17 },
    pool,
  );
  await command(pool, "complete_repair", fields);
  await command(pool, "complete_repair", fields);
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
    (
      await pool.query("SELECT count(*)::int AS n FROM postmortems WHERE incident_id=$1", [
        f.incidentId,
      ])
    ).rows[0].n,
    1,
  );
  assert.equal(
    (await pool.query("SELECT available FROM crew_members WHERE id='org-helios-crew-1'")).rows[0]
      .available,
    true,
  );
});
