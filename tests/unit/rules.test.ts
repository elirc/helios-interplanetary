import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateReading } from "../../src/domain/telemetry-rules";
import { generateScenario } from "../../src/domain/simulation";
import { readingSchema } from "../../src/domain/contracts";

test("threshold boundaries are inclusive nominal values", () => {
  assert.equal(evaluateReading({ pressureBar: 2.4, vibrationMms: 6.5 }).breached, false);
  assert.equal(evaluateReading({ pressureBar: 2.399, vibrationMms: 6.5 }).breached, true);
  assert.equal(evaluateReading({ pressureBar: 2.4, vibrationMms: 6.501 }).breached, true);
  assert.equal(evaluateReading({ pressureBar: 2.0, vibrationMms: 8 }).reasons.length, 2);
});

test("seeded scenarios reproduce physical values and virtual timestamps", () => {
  const start = new Date("2042-03-19T14:20:00Z");
  const first = generateScenario("degradation", 17, start);
  assert.deepEqual(first, generateScenario("degradation", 17, start));
  assert.notDeepEqual(first, generateScenario("degradation", 18, start));
  assert.equal(first.at(-1)!.observedAt, "2042-03-19T14:21:00.000Z");
  assert.equal(first.length, 12);
  assert.equal(evaluateReading(first[0]).breached, false);
  assert.equal(evaluateReading(first.at(-1)!).breached, true);
  assert.equal(evaluateReading(generateScenario("recovery", 17, start).at(-1)!).breached, false);
  assert.ok(
    generateScenario("nominal", 17, start).every((reading) => !evaluateReading(reading).breached),
  );
});

test("the public reading contract rejects malformed and tenant-injection fields", () => {
  const valid = {
    id: "11111111-1111-4111-8111-111111111111",
    assetId: "pump-b17",
    observedAt: "2042-03-19T14:20:00Z",
    pressureBar: 3.2,
    vibrationMms: 2.1,
    temperatureC: 36.5,
    correlationId: "22222222-2222-4222-8222-222222222222",
  };
  assert.equal(readingSchema.safeParse(valid).success, true);
  for (const patch of [
    { pressureBar: -1 },
    { pressureBar: Infinity },
    { vibrationMms: NaN },
    { organizationId: "org-selene" },
    { observedAt: "yesterday" },
    { id: "not-an-id" },
  ])
    assert.equal(readingSchema.safeParse({ ...valid, ...patch }).success, false);
});
