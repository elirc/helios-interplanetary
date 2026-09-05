import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Snapshot } from "../src/domain/contracts";

const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname),
  "Smoke tests only target the local demo.",
);
async function call(
  path: string,
  options: { method?: string; cookie?: string; body?: unknown; requestOrigin?: string } = {},
) {
  return fetch(`${origin}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: options.requestOrigin || origin,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}
async function login(persona: string) {
  const response = await call("/api/session", { method: "POST", body: { persona } });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!.split(";")[0];
}

assert.equal((await call("/api/health")).status, 200);
assert.equal((await call("/api/mission")).status, 401);
const cookie = await login("controller");
const before: Snapshot = await (await call("/api/mission", { cookie })).json();
const runId = randomUUID();
const body = { runId, assetId: before.asset.id, kind: "degradation", seed: 17 };
const created = await call("/api/scenarios", { cookie, method: "POST", body });
assert.equal(created.status, 201);
const result = await created.json();
assert.ok(result.incidentId);
const replay = await call("/api/scenarios", { cookie, method: "POST", body });
assert.equal(replay.status, 200);
assert.equal((await replay.json()).replayed, true);
const after: Snapshot = await (await call("/api/mission", { cookie })).json();
assert.equal(after.stats.totalReadings, before.stats.totalReadings + 12);
assert.equal(after.stats.activeIncidents, 1);
assert.equal((await call("/api/incidents/" + result.incidentId, { cookie })).status, 200);
assert.equal(
  (
    await call("/api/scenarios", {
      cookie,
      method: "POST",
      body,
      requestOrigin: "https://untrusted.example",
    })
  ).status,
  403,
);
const other = await login("observer");
assert.equal((await call("/api/incidents/" + result.incidentId, { cookie: other })).status, 404);
assert.equal(
  (
    await call("/api/incidents/" + result.incidentId, {
      cookie: other,
      method: "PATCH",
      body: { action: "acknowledge" },
    })
  ).status,
  404,
);
assert.equal(
  (
    await call("/api/scenarios", {
      cookie: other,
      method: "POST",
      body: { ...body, runId: randomUUID() },
    })
  ).status,
  404,
);
const auditor = await login("auditor");
assert.equal(
  (
    await call("/api/scenarios", {
      cookie: auditor,
      method: "POST",
      body: { ...body, runId: randomUUID() },
    })
  ).status,
  403,
);
assert.equal(
  (await call("/api/telemetry", { cookie, method: "POST", body: { organizationId: "org-selene" } }))
    .status,
  400,
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      checks: [
        "health",
        "unauthenticated denial",
        "scenario",
        "idempotent replay",
        "persisted counts",
        "incident evidence",
        "origin denial",
        "cross-tenant read/write denial",
        "viewer denial",
        "input validation",
      ],
      runId,
      incidentId: result.incidentId,
      note: "One degradation sequence added to the local demo; inspect it in Mission Control.",
    },
    null,
    2,
  ),
);
