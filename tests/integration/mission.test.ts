import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../../src/server/migrations";
import { resetFixtures, seed } from "../../src/server/fixtures";
import { PERSONAS } from "../../src/server/identity";
import { ingestReading, ingestReadingTx } from "../../src/server/telemetry";
import { transaction } from "../../src/server/db";
import { getIncident, getSnapshot } from "../../src/server/queries";
import { runScenario, stableReadingId } from "../../src/server/scenarios";
import { transitionIncident } from "../../src/server/incidents";
import type { ReadingInput, ScenarioInput } from "../../src/domain/contracts";

const connectionString = process.env.TEST_DATABASE_URL;
assert.ok(
  connectionString,
  "TEST_DATABASE_URL must explicitly identify the disposable integration database.",
);
const target = new URL(connectionString);
assert.equal(target.pathname, "/helios_test", "Integration tests may only reset helios_test.");
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname),
  "Integration database must be local.",
);
if (process.env.DATABASE_URL)
  assert.notEqual(
    target.href,
    new URL(process.env.DATABASE_URL).href,
    "Integration tests cannot use the application database.",
  );
const pool = new Pool({ connectionString, max: 16 });
const actor = PERSONAS.controller;
const reading = (patch: Partial<ReadingInput> = {}): ReadingInput => ({
  id: randomUUID(),
  assetId: "pump-b17",
  observedAt: "2042-03-19T15:00:00Z",
  pressureBar: 1.8,
  vibrationMms: 8,
  temperatureC: 46,
  correlationId: randomUUID(),
  ...patch,
});
const scenario = (patch: Partial<ScenarioInput> = {}): ScenarioInput => ({
  runId: randomUUID(),
  assetId: "pump-b17",
  kind: "degradation",
  seed: 17,
  ...patch,
});

before(async () => {
  await migrate(pool);
});
beforeEach(async () => {
  await resetFixtures(pool);
});
after(async () => {
  await pool.end();
});

test("normal fixtures create no incidents and seed/migration commands are repeatable", async () => {
  await migrate(pool);
  await seed(pool);
  const snapshot = await getSnapshot(actor, pool);
  assert.equal(snapshot.stats.totalReadings, 36);
  assert.equal(snapshot.stats.activeIncidents, 0);
  assert.equal(snapshot.asset.status, "NOMINAL");
  await ingestReading(actor, reading({ pressureBar: 2.4, vibrationMms: 6.5 }), pool);
  assert.equal((await getSnapshot(actor, pool)).stats.activeIncidents, 0);
});

test("breach creates an attributable incident and subsequent abnormal observations share it", async () => {
  const input = reading();
  const first = await ingestReading(actor, input, pool);
  const next = await ingestReading(actor, reading({ observedAt: "2042-03-19T15:00:05Z" }), pool);
  assert.equal(first.incidentCreated, true);
  assert.equal(next.incidentId, first.incidentId);
  const detail = await getIncident(actor, first.incidentId!, pool);
  assert.equal(detail.trigger.id, input.id);
  assert.equal(detail.incident.correlationId, input.correlationId);
  assert.equal(detail.events.filter((event) => event.action === "IncidentOpened").length, 1);
  assert.ok(detail.events.every((event) => event.actorId === actor.id));
  assert.equal((await getSnapshot(actor, pool)).stats.activeIncidents, 1);
});

test("duplicate delivery creates no new reading, incident, or audit record", async () => {
  const input = reading();
  const first = await ingestReading(actor, input, pool);
  const count = (await pool.query("SELECT count(*) FROM audit_events")).rows[0].count;
  const replay = await ingestReading(actor, input, pool);
  assert.equal(replay.disposition, "duplicate");
  assert.equal(replay.incidentId, first.incidentId);
  assert.equal((await getSnapshot(actor, pool)).stats.totalReadings, 37);
  assert.equal((await pool.query("SELECT count(*) FROM audit_events")).rows[0].count, count);
  await assert.rejects(ingestReading(actor, { ...input, pressureBar: 1.7 }, pool), {
    code: "IDEMPOTENCY_CONFLICT",
  });
});

test("12 simultaneous deliveries of one reading have exactly one committed effect", async () => {
  const input = reading();
  const outcomes = await Promise.all(
    Array.from({ length: 12 }, () => ingestReading(actor, input, pool)),
  );
  assert.equal(outcomes.filter((result) => result.incidentCreated).length, 1);
  assert.equal(outcomes.filter((result) => result.disposition === "duplicate").length, 11);
  const snapshot = await getSnapshot(actor, pool);
  assert.equal(snapshot.stats.totalReadings, 37);
  assert.equal(snapshot.stats.activeIncidents, 1);
});

test("concurrent distinct abnormal readings cannot create multiple active incidents", async () => {
  await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      ingestReading(
        actor,
        reading({ observedAt: new Date(Date.UTC(2042, 2, 19, 15, 0, i)).toISOString() }),
        pool,
      ),
    ),
  );
  const snapshot = await getSnapshot(actor, pool);
  assert.equal(snapshot.stats.activeIncidents, 1);
  assert.equal(snapshot.stats.totalReadings, 48);
  assert.equal(new Date(snapshot.asset.lastObservedAt!).toISOString(), "2042-03-19T15:00:11.000Z");
});

test("out-of-order normal readings cannot clear a newer degraded state", async () => {
  await ingestReading(actor, reading(), pool);
  const late = await ingestReading(
    actor,
    reading({ observedAt: "2042-03-19T14:59:00Z", pressureBar: 3.2, vibrationMms: 2 }),
    pool,
  );
  assert.equal(late.disposition, "stale");
  const snapshot = await getSnapshot(actor, pool);
  assert.equal(snapshot.asset.status, "DEGRADED");
  assert.equal(snapshot.stats.activeIncidents, 1);
  assert.equal(snapshot.readings.find((item) => item.id === late.readingId)?.applied, false);
});

test("scenario replay is idempotent including under concurrent submission", async () => {
  const input = scenario();
  const results = await Promise.all([
    runScenario(actor, input, pool),
    runScenario(actor, input, pool),
  ]);
  assert.equal(results.filter((result) => result.replayed).length, 1);
  const snapshot = await getSnapshot(actor, pool);
  assert.equal(snapshot.stats.totalReadings, 48);
  assert.equal(snapshot.stats.scenarioRuns, 1);
  assert.equal(snapshot.stats.activeIncidents, 1);
  await assert.rejects(runScenario(actor, { ...input, seed: 18 }, pool), {
    code: "IDEMPOTENCY_CONFLICT",
  });
});

test("equal-time historical readings cannot crowd the applied current observation out of the UI window", async () => {
  const current = reading();
  await ingestReading(actor, current, pool);
  await transaction(pool, async (client) => {
    for (let index = 0; index < 61; index++) {
      const result = await ingestReadingTx(
        client,
        actor,
        reading({ observedAt: current.observedAt, pressureBar: 3.2, vibrationMms: 2 }),
      );
      assert.equal(result.disposition, "stale");
    }
  });
  const snapshot = await getSnapshot(actor, pool);
  assert.equal(snapshot.readings.length, 60);
  assert.equal(snapshot.readings.filter((item) => item.applied).at(-1)?.id, current.id);
  assert.equal(snapshot.asset.status, "DEGRADED");
  assert.equal(snapshot.stats.activeIncidents, 1);
});

test("a failure partway through a scenario rolls back its earlier readings and effects", async () => {
  const input = scenario();
  await ingestReading(actor, reading({ id: stableReadingId(input.runId, 5) }), pool);
  const before = await getSnapshot(actor, pool);
  const auditBefore = (await pool.query("SELECT count(*) FROM audit_events")).rows[0].count;
  await assert.rejects(runScenario(actor, input, pool), { code: "IDEMPOTENCY_CONFLICT" });
  const after = await getSnapshot(actor, pool);
  assert.deepEqual(after.stats, before.stats);
  assert.equal(after.asset.lastObservedAt, before.asset.lastObservedAt);
  assert.equal((await pool.query("SELECT count(*) FROM audit_events")).rows[0].count, auditBefore);
});

test("server-side tenant scope protects reads, telemetry, scenarios, and incident transitions", async () => {
  const result = await ingestReading(actor, reading(), pool);
  const other = PERSONAS.observer;
  await assert.rejects(getIncident(other, result.incidentId!, pool), { code: "NOT_FOUND" });
  await assert.rejects(ingestReading(other, reading(), pool), { code: "NOT_FOUND" });
  await assert.rejects(runScenario(other, scenario(), pool), { code: "NOT_FOUND" });
  await assert.rejects(transitionIncident(other, result.incidentId!, "acknowledge", pool), {
    code: "NOT_FOUND",
  });
  const snapshot = await getSnapshot(other, pool);
  assert.equal(snapshot.station.name, "Selene Outpost");
  assert.equal(snapshot.stats.activeIncidents, 0);
  assert.equal(snapshot.stats.totalReadings, 36);
  assert.ok(snapshot.events.every((event) => event.actorId === other.id));
});

test("read-only auditors can inspect but cannot mutate", async () => {
  const result = await ingestReading(actor, reading(), pool);
  assert.equal(
    (await getIncident(PERSONAS.auditor, result.incidentId!, pool)).incident.id,
    result.incidentId,
  );
  await assert.rejects(ingestReading(PERSONAS.auditor, reading(), pool), { code: "FORBIDDEN" });
  await assert.rejects(runScenario(PERSONAS.auditor, scenario(), pool), { code: "FORBIDDEN" });
  await assert.rejects(
    transitionIncident(PERSONAS.auditor, result.incidentId!, "acknowledge", pool),
    { code: "FORBIDDEN" },
  );
});

test("resolution requires acknowledgement and restored telemetry; a later episode can open anew", async () => {
  const first = await runScenario(actor, scenario(), pool);
  await assert.rejects(transitionIncident(actor, first.incidentId!, "resolve", pool), {
    code: "ASSET_DEGRADED",
  });
  await transitionIncident(actor, first.incidentId!, "acknowledge", pool);
  assert.equal(
    (await transitionIncident(actor, first.incidentId!, "acknowledge", pool)).changed,
    false,
  );
  await runScenario(actor, scenario({ kind: "recovery" }), pool);
  await transitionIncident(actor, first.incidentId!, "resolve", pool);
  assert.equal(
    (await transitionIncident(actor, first.incidentId!, "resolve", pool)).changed,
    false,
  );
  assert.equal((await getSnapshot(actor, pool)).stats.activeIncidents, 0);
  await assert.rejects(transitionIncident(actor, first.incidentId!, "acknowledge", pool), {
    code: "INVALID_TRANSITION",
  });
  const late = await ingestReading(actor, reading({ observedAt: "2042-03-19T14:23:20Z" }), pool);
  assert.equal(late.disposition, "stale");
  assert.equal((await getSnapshot(actor, pool)).stats.activeIncidents, 0);
  const second = await runScenario(actor, scenario(), pool);
  assert.notEqual(second.incidentId, first.incidentId);
  assert.equal((await getSnapshot(actor, pool)).stats.activeIncidents, 1);
});

test("committed readings and incidents survive a new application database connection", async () => {
  const writer = new Pool({ connectionString });
  const input = reading();
  const result = await ingestReading(actor, input, writer);
  await writer.end();
  const reader = new Pool({ connectionString });
  try {
    const detail = await getIncident(actor, result.incidentId!, reader);
    assert.equal(detail.trigger.id, input.id);
    assert.equal(detail.incident.status, "OPEN");
  } finally {
    await reader.end();
  }
});
