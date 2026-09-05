import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrate } from "../../src/server/migrations";
import { resetFixtures } from "../../src/server/fixtures";
import { runAgent, agentDecision } from "../../src/server/intelligence";
import { executeAgentTool } from "../../src/server/agent-tools";
import { runEvaluations } from "../../src/server/evaluations";
import { documentCommand, searchKnowledge } from "../../src/server/knowledge";
import { PERSONAS } from "../../src/server/identity";
import { runScenario } from "../../src/server/scenarios";
import { transitionIncident } from "../../src/server/incidents";
import { actor, testPool } from "../helpers";
const pool = testPool();
before(async () => {
  process.env.HELIOS_MODEL_PROVIDER = "fixture";
  await migrate(pool);
});
beforeEach(() => resetFixtures(pool));
after(() => pool.end());
test("agent records bounded tools and sources; a bound human approval executes once", async () => {
  const scenario = await runScenario(
    actor,
    { runId: randomUUID(), assetId: "pump-b17", kind: "degradation", seed: 17 },
    pool,
  );
  const input = {
    commandId: randomUUID(),
    action: "run_agent",
    agent: "diagnostic",
    incidentId: scenario.incidentId,
  };
  const run = await runAgent(actor, input, pool);
  assert.equal(run.status, "SUCCEEDED");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM work_orders")).rows[0].n, 0);
  const approval = (await pool.query("SELECT * FROM agent_approvals WHERE run_id=$1", [run.id]))
    .rows[0];
  await assert.rejects(
    agentDecision(
      actor,
      { commandId: randomUUID(), action: "approve_agent_action", id: approval.id },
      pool,
    ),
    { code: "ACKNOWLEDGEMENT_REQUIRED" },
  );
  await transitionIncident(actor, scenario.incidentId!, "acknowledge", pool);
  await Promise.all(
    [1, 2].map(() =>
      agentDecision(
        actor,
        { commandId: randomUUID(), action: "approve_agent_action", id: approval.id },
        pool,
      ),
    ),
  );
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM work_orders")).rows[0].n, 1);
  const steps = (await pool.query("SELECT * FROM agent_steps WHERE run_id=$1", [run.id])).rows;
  assert.equal(steps.length, 7);
  assert.ok(steps.every((s) => s.status === "SUCCEEDED"));
  assert.equal((await runAgent(actor, input, pool)).replayed, true);
  await pool.query(
    "UPDATE agent_approvals SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
    [approval.id],
  );
  assert.equal(
    (
      await agentDecision(
        actor,
        { commandId: randomUUID(), action: "approve_agent_action", id: approval.id },
        pool,
      )
    ).status,
    "APPROVED",
  );
  assert.equal(
    (await pool.query("SELECT input_tokens FROM agent_runs WHERE id=$1", [run.id])).rows[0]
      .input_tokens,
    null,
  );
});

test("pending approvals expire and a recovered asset invalidates its earlier proposal", async () => {
  const scenario = await runScenario(
    actor,
    { runId: randomUUID(), assetId: "pump-b17", kind: "degradation", seed: 17 },
    pool,
  );
  await transitionIncident(actor, scenario.incidentId!, "acknowledge", pool);
  const run = await runAgent(
    actor,
    {
      commandId: randomUUID(),
      action: "run_agent",
      agent: "diagnostic",
      incidentId: scenario.incidentId,
    },
    pool,
  );
  const approval = (await pool.query("SELECT id FROM agent_approvals WHERE run_id=$1", [run.id]))
    .rows[0];
  const approve = () =>
    agentDecision(
      actor,
      { commandId: randomUUID(), action: "approve_agent_action", id: approval.id },
      pool,
    );
  await pool.query(
    "UPDATE agent_approvals SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
    [approval.id],
  );
  await assert.rejects(approve(), { code: "APPROVAL_EXPIRED" });
  await pool.query(
    "UPDATE agent_approvals SET expires_at=clock_timestamp()+interval '1 hour' WHERE id=$1",
    [approval.id],
  );
  await runScenario(
    actor,
    { runId: randomUUID(), assetId: "pump-b17", kind: "recovery", seed: 17 },
    pool,
  );
  await assert.rejects(approve(), { code: "PROPOSAL_STALE" });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM work_orders")).rows[0].n, 0);
  assert.equal(
    (await pool.query("SELECT status FROM agent_approvals WHERE id=$1", [approval.id])).rows[0]
      .status,
    "PENDING",
  );
});
test("unsafe/malformed/provider-failure fixtures preserve terminal traces and create no approval", async () => {
  for (const exercise of ["unsafe", "malformed", "provider_failure"]) {
    const run = await runAgent(
      actor,
      { commandId: randomUUID(), action: "run_agent", agent: "diagnostic", exercise },
      pool,
    );
    assert.equal(run.status, exercise === "provider_failure" ? "FAILED" : "BLOCKED");
  }
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM agent_approvals")).rows[0].n, 0);
  await assert.rejects(
    executeAgentTool(PERSONAS.observer, "get_asset_details", { assetId: "pump-b17" }, pool),
    { code: "NOT_FOUND" },
  );
  await assert.rejects(
    executeAgentTool(
      actor,
      "get_sensor_history",
      { assetId: "pump-b17", organizationId: "org-selene" },
      pool,
    ),
  );
  await assert.rejects(
    runAgent(
      PERSONAS.auditor,
      { commandId: randomUUID(), action: "run_agent", agent: "support" },
      pool,
    ),
    { code: "FORBIDDEN" },
  );
});
test("retrieval excludes drafts and other tenants; approved replacement versions supersede old chunks", async () => {
  const input = {
    commandId: randomUUID(),
    action: "ingest_document",
    slug: "coolant-pump",
    title: "Revised coolant procedure",
    body: "Coolant pump pressure vibration inspection. Revised protocol: isolate coolant pump before inspecting seals; this fictional version supersedes the original procedure.",
  };
  const draft = await documentCommand(actor, input, pool);
  assert.ok(
    (await searchKnowledge(actor, "coolant pump inspection", pool))
      .filter((s) => s.slug === "coolant-pump")
      .every((s) => s.version === 1),
  );
  await documentCommand(
    actor,
    { commandId: randomUUID(), action: "approve_document", id: draft.id },
    pool,
  );
  const results = await searchKnowledge(actor, "coolant pump inspection", pool);
  assert.ok(results.some((s) => s.slug === "coolant-pump" && s.version === 2));
  assert.ok(!results.some((s) => s.slug === "coolant-pump" && s.version === 1));
  assert.ok(
    (await searchKnowledge(PERSONAS.observer, "coolant pump inspection", pool)).every(
      (s) => s.document_id !== draft.id,
    ),
  );
});
test("the recorded fixture evaluation reports every retrieval and policy case", async () => {
  const result = await runEvaluations(actor, pool);
  assert.equal(result.results.length, 14);
  assert.equal(result.status, "PASSED", JSON.stringify(result.results.filter((r) => !r.passed)));
  assert.equal(result.results.filter((r) => r.split === "held-out").length, 2);
});
