import { test } from "node:test";
import assert from "node:assert/strict";
import { energyBalance } from "../../src/domain/energy";
import { tokenEmbedding, chunkDocument } from "../../src/domain/knowledge";
import { assertBalanced } from "../../src/server/ledger";
test("energy clamps physical bounds and uses net deficit for reserve endurance", () => {
  const grid = {
    solar_kw: 100,
    critical_kw: 60,
    industrial_kw: 40,
    battery_kwh: 100,
    capacity_kwh: 100,
    load_shed: false,
    outage: false,
  };
  assert.equal(energyBalance(grid, 3600).batteryKwh, 100);
  assert.equal(energyBalance(grid, 0).reserveMinutes, null);
  assert.equal(energyBalance({ ...grid, outage: true }, 7200).batteryKwh, 0);
  assert.ok(
    energyBalance({ ...grid, outage: true, load_shed: true }, 0).reserveMinutes! >
      energyBalance({ ...grid, outage: true }, 0).reserveMinutes!,
  );
});
test("document chunks preserve overlap and hash vectors are deterministic and normalized", () => {
  const words = Array.from({ length: 400 }, (_, i) => `word${i}`),
    chunks = chunkDocument(words.join(" "));
  assert.equal(chunks.length, 3);
  assert.ok(chunks[0].endsWith("word179"));
  assert.ok(chunks[1].startsWith("word150 "));
  const vector = tokenEmbedding("coolant pressure coolant");
  assert.deepEqual(vector, tokenEmbedding("coolant pressure coolant"));
  assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-10);
});
test("journal validation rejects fractional cents and unequal totals", () => {
  assert.throws(
    () =>
      assertBalanced([
        { account: "AR", side: "DEBIT", cents: 100 },
        { account: "CASH", side: "CREDIT", cents: 99 },
      ]),
    { code: "UNBALANCED_JOURNAL" },
  );
  assert.throws(
    () =>
      assertBalanced([
        { account: "AR", side: "DEBIT", cents: 1.5 },
        { account: "CASH", side: "CREDIT", cents: 1.5 },
      ]),
    { code: "INVALID_JOURNAL" },
  );
});
