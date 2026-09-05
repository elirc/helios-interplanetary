import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const mode = process.argv[2];
assert.ok(
  ["capture", "verify"].includes(mode),
  "Use capture before a server restart and verify afterward.",
);
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname));
let ready = false;
for (let attempt = 0; attempt < 10; attempt++) {
  try {
    const health = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (health.ok) {
      ready = true;
      break;
    }
  } catch {
    /* A restarting process may not have bound its port yet. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.ok(ready, "Application did not become ready within the bounded readiness checks.");
const login = await fetch(`${origin}/api/session`, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ persona: "controller" }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie").split(";")[0];
const response = await fetch(`${origin}/api/mission`, { headers: { Cookie: cookie } });
assert.equal(response.status, 200);
const snapshot = await response.json();
const evidence = {
  asset: snapshot.asset,
  stats: snapshot.stats,
  readings: snapshot.readings.map((reading) => ({
    id: reading.id,
    observedAt: reading.observedAt,
    pressureBar: reading.pressureBar,
    incidentId: reading.incidentId,
  })),
  incidents: snapshot.incidents,
};
const path = new URL("../artifacts/restart-before.json", import.meta.url);
if (mode === "capture") {
  await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
  await writeFile(path, JSON.stringify(evidence, null, 2));
  console.log(
    "Captured persisted mission state. Restart the application process before verifying.",
  );
} else {
  assert.deepEqual(evidence, JSON.parse(await readFile(path, "utf8")));
  await writeFile(
    new URL("../artifacts/restart-result.json", import.meta.url),
    JSON.stringify(
      { status: "passed", verifiedAt: new Date().toISOString(), ...evidence.stats },
      null,
      2,
    ),
  );
  console.log(
    "PASS: readings, incident IDs/states, and asset state are unchanged after the application restart.",
  );
}
