import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PERSONAS } from "../src/server/identity";
import { runScenario } from "../src/server/scenarios";
import { transitionIncident } from "../src/server/incidents";
import { executeOperation } from "../src/server/operations";

export const actor = PERSONAS.controller;
export function testPool() {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, "TEST_DATABASE_URL is required.");
  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/helios_test");
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname));
  assert.notEqual(url, process.env.DATABASE_URL);
  return new Pool({ connectionString: url, max: 16 });
}
export function command(pool: Pool, action: string, fields: Record<string, unknown> = {}) {
  return executeOperation(actor, { commandId: randomUUID(), action, ...fields }, pool);
}
export async function repairFixture(pool: Pool, assetId = "pump-b17") {
  if (assetId !== "pump-b17")
    await pool.query(
      "INSERT INTO assets(id,organization_id,station_id,name,designation) VALUES($1,'org-helios','station-kepler','Secondary pump',$1) ON CONFLICT DO NOTHING",
      [assetId],
    );
  const run = await runScenario(
    actor,
    { runId: randomUUID(), assetId, kind: "degradation", seed: 17 },
    pool,
  );
  await transitionIncident(actor, run.incidentId!, "acknowledge", pool);
  const work = await command(pool, "create_work_order", { incidentId: run.incidentId });
  return { incidentId: run.incidentId!, workOrderId: work.id, assetId };
}
