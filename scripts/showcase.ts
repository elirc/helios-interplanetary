import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { getPool } from "../src/server/db";
import { migrate } from "../src/server/migrations";
import { resetFixtures } from "../src/server/fixtures";
import { PERSONAS } from "../src/server/identity";
import { runScenario } from "../src/server/scenarios";
import { transitionIncident } from "../src/server/incidents";
import { executeOperation } from "../src/server/operations";
import { executeClock } from "../src/server/simulation-clock";
import { runAgent, agentDecision } from "../src/server/intelligence";
import { runEvaluations } from "../src/server/evaluations";
import { executeBilling } from "../src/server/billing";
import { executeCase } from "../src/server/cases";
import { processNextEvent } from "../src/server/worker";

const target = new URL(process.env.DATABASE_URL ?? "http://missing");
assert.ok(
  process.argv.includes("--confirm-disposable") &&
    ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) &&
    target.pathname === "/helios",
  "Showcase resets only the explicitly confirmed local helios fixture database. Stop its worker first.",
);
process.env.HELIOS_MODEL_PROVIDER = "fixture";
const pool = getPool(),
  actor = PERSONAS.controller;
const op = (action: string, fields: Record<string, unknown> = {}) =>
  executeOperation(actor, { commandId: randomUUID(), action, ...fields }, pool);
const clock = (action: string, fields: Record<string, unknown> = {}) =>
  executeClock(actor, { commandId: randomUUID(), action, ...fields }, pool);
const scenario = (kind: "degradation" | "recovery") =>
  runScenario(actor, { runId: randomUUID(), assetId: "pump-b17", kind, seed: 17 }, pool);
try {
  await migrate(pool);
  await resetFixtures(pool);
  const failure = await scenario("degradation");
  await transitionIncident(actor, failure.incidentId!, "acknowledge", pool);
  const adviser = await runAgent(
    actor,
    {
      commandId: randomUUID(),
      action: "run_agent",
      agent: "diagnostic",
      incidentId: failure.incidentId,
    },
    pool,
  );
  const proposal = (
    await pool.query("SELECT id FROM agent_approvals WHERE run_id=$1", [adviser.id])
  ).rows[0];
  await agentDecision(
    actor,
    { commandId: randomUUID(), action: "approve_agent_action", id: proposal.id },
    pool,
  );
  const workOrderId = (
    await pool.query("SELECT id FROM work_orders WHERE incident_id=$1", [failure.incidentId])
  ).rows[0].id;
  await op("reserve_parts", { workOrderId });
  const purchase = await op("request_purchase", { workOrderId });
  await op("approve_purchase", { purchaseId: purchase.id });
  const shipment = await op("dispatch_purchase", { purchaseId: purchase.id });
  await op("delay_shipment", { shipmentId: shipment.id });
  await op("reroute_shipment", { shipmentId: shipment.id });
  await clock("advance", { seconds: 900 });
  await op("deliver_shipment", { shipmentId: shipment.id });
  await op("assign_crew", { workOrderId, crewId: "org-helios-crew-1" });
  await op("start_repair", { workOrderId });
  for (const taskKey of ["isolate", "replace", "inspect"])
    await op("complete_task", { workOrderId, taskKey });
  await op("begin_verification", { workOrderId });
  await scenario("recovery");
  await op("complete_repair", { workOrderId });
  await clock("solar_outage");
  await clock("advance", { seconds: 3600 });
  await clock("shed_load");
  await clock("repair_solar");
  await clock("restore_load");
  await executeBilling(
    actor,
    {
      commandId: randomUUID(),
      action: "record_usage",
      subscriptionId: "org-helios-compute",
      quantity: 240,
    },
    pool,
  );
  const invoice = await executeBilling(
    actor,
    { commandId: randomUUID(), action: "issue_invoice", subscriptionId: "org-helios-compute" },
    pool,
  );
  await executeBilling(
    actor,
    { commandId: randomUUID(), action: "pay_invoice", invoiceId: invoice.id, behavior: "timeout" },
    pool,
  );
  await executeCase(actor, { commandId: randomUUID(), action: "inject_security_campaign" }, pool);
  await runAgent(
    actor,
    { commandId: randomUUID(), action: "run_agent", agent: "diagnostic", exercise: "unsafe" },
    pool,
  );
  await runAgent(actor, { commandId: randomUUID(), action: "run_agent", agent: "support" }, pool);
  const evaluation = await runEvaluations(actor, pool);
  assert.equal(evaluation.status, "PASSED");
  for (const principal of [actor, PERSONAS.observer])
    for (let i = 0; i < 300; i++) if (!(await processNextEvent(principal, pool))) break;
  const snapshot = (
    await pool.query(
      "SELECT (SELECT count(*)::int FROM work_orders WHERE status='COMPLETED') AS completed_repairs,(SELECT count(*)::int FROM journal_entries) AS journal_entries,(SELECT count(*)::int FROM agent_runs) AS adviser_runs,(SELECT count(*)::int FROM notifications) AS notifications",
    )
  ).rows[0];
  assert.equal(snapshot.completed_repairs, 1);
  assert.ok(snapshot.journal_entries >= 2);
  const result = {
    status: "passed",
    createdAt: new Date().toISOString(),
    description:
      "Completed repair and restored solar history; uncertain payment and open security investigation for review. Both virtual clocks remain paused.",
    ...snapshot,
  };
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/showcase.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await pool.end();
}
