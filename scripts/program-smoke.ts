import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
let cookie = "";
async function request(path: string, method = "GET", body?: unknown, status = 200) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return { response, result };
}
async function login(persona: string) {
  const { response } = await request("/api/session", "POST", { persona });
  cookie = response.headers.get("set-cookie")!.split(";")[0];
}
await login("controller");
const { result: hub, response } = await request("/api/operations");
assert.equal(hub.workforce.count, 120);
assert.ok(hub.documents.length >= 6);
assert.match(response.headers.get("x-trace-id") ?? "", /^[0-9a-f]{32}$/);
const { result: cases } = await request("/api/cases", "POST", {
  commandId: randomUUID(),
  action: "inject_security_campaign",
});
await request("/api/intelligence", "POST", {
  commandId: randomUUID(),
  action: "run_agent",
  agent: "diagnostic",
  exercise: "unsafe",
});
await request("/api/knowledge?q=coolant%20pressure");
await login("observer");
await request(
  "/api/cases",
  "POST",
  { commandId: randomUUID(), action: "investigate_security", id: cases.id },
  404,
);
const other = (await request("/api/operations")).result;
assert.equal(other.workforce.count, 80);
assert.ok(!other.investigations.some((i: { id: string }) => i.id === cases.id));
await login("auditor");
for (const [path, body] of [
  ["/api/simulation", { action: "advance", seconds: 900 }],
  ["/api/cases", { action: "inject_security_campaign" }],
  ["/api/billing", { action: "issue_invoice", subscriptionId: "org-helios-compute" }],
  ["/api/platform", { action: "inject_backlog" }],
  ["/api/intelligence", { action: "run_agent", agent: "diagnostic" }],
] as const)
  await request(path, "POST", { commandId: randomUUID(), ...body }, 403);
console.log(
  JSON.stringify({
    status: "passed",
    checks: [
      "hub",
      "tenant-scoped workforce",
      "knowledge",
      "trace header",
      "AI failure fixture",
      "case tenant isolation",
      "read-only denial across new domains",
    ],
  }),
);
