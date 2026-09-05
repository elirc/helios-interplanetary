import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname),
  "Benchmark is restricted to local Helios.",
);
const login = await fetch(`${origin}/api/session`, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ persona: "controller" }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie")!.split(";")[0];
const samples: number[] = [];
let failures = 0;
for (let batch = 0; batch < 10; batch++)
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      const started = performance.now();
      const r = await fetch(`${origin}/api/operations`, { headers: { Cookie: cookie } });
      await r.arrayBuffer();
      samples.push(performance.now() - started);
      if (!r.ok) failures++;
    }),
  );
samples.sort((a, b) => a - b);
const percentile = (p: number) => Number(samples[Math.ceil(samples.length * p) - 1].toFixed(1));
const result = {
  measuredAt: new Date().toISOString(),
  target: "GET /api/operations",
  environment: "Local Windows host with PostgreSQL in Docker; no production capacity claim",
  requests: samples.length,
  concurrency: 3,
  failures,
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
};
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/benchmark.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
assert.equal(failures, 0);
