import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertSameOrigin,
  assertLocalRequest,
  principalFromRequest,
  signSession,
  verifySession,
  requireOperator,
  PERSONAS,
} from "../../src/server/identity";

process.env.DEMO_MODE = "true";
process.env.APP_ORIGIN = "http://127.0.0.1:3000";
process.env.SESSION_SECRET = "unit-test-secret-that-is-at-least-thirty-two-characters";

test("signed identity determines the tenant and ignores spoofed tenant headers", () => {
  const token = signSession("controller");
  const request = new Request("http://127.0.0.1:3000/api/mission", {
    headers: { cookie: `helios_session=${token}`, "x-organization-id": "org-selene" },
  });
  assert.equal(principalFromRequest(request).organizationId, "org-helios");
});

test("tampered, missing, expired, and malformed sessions are denied", () => {
  const now = 1234567890000;
  const token = signSession("controller", now);
  assert.equal(verifySession(token, now).id, "operator-vale");
  for (const invalid of [undefined, "invalid", `${token}x`, token.replace(".", ".x.")])
    assert.throws(() => verifySession(invalid, now), /Enter the local demo/);
  assert.throws(() => verifySession(token, now + 9 * 60 * 60 * 1000), /Enter the local demo/);
  assert.throws(() => signSession("__proto__"), /Unknown demo operator/);
});

test("mutations require same-origin requests and viewer access cannot write", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("http://127.0.0.1:3000/api/scenarios", {
        headers: { origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("http://127.0.0.1:3000/api/scenarios", {
          headers: { origin: "https://untrusted.example" },
        }),
      ),
    /origin/,
  );
  assert.throws(
    () => assertSameOrigin(new Request("http://127.0.0.1:3000/api/scenarios")),
    /origin/,
  );
  assert.throws(() => requireOperator(PERSONAS.auditor), /read-only/);
});

test("framework-normalized loopback URLs retain strict validation of the original Host", () => {
  const normalized = new Request("http://localhost:3000/api/session", {
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
  });
  assert.doesNotThrow(() => assertSameOrigin(normalized));
  assert.throws(
    () =>
      assertLocalRequest(
        new Request("http://localhost:3000/api/mission", {
          headers: { host: "evil.example", "x-forwarded-host": "127.0.0.1:3000" },
        }),
      ),
    /configured local application address/,
  );
  assert.throws(
    () =>
      assertLocalRequest(
        new Request("http://localhost:3001/api/mission", { headers: { host: "127.0.0.1:3001" } }),
      ),
    /configured local application address/,
  );
});

test("demo identity fails closed when disabled or configured on a public hostname", () => {
  try {
    process.env.DEMO_MODE = "false";
    assert.throws(() => signSession("controller"), /disabled/);
    process.env.DEMO_MODE = "true";
    process.env.APP_ORIGIN = "https://helios.example";
    assert.throws(() => signSession("controller"), /disabled/);
  } finally {
    process.env.DEMO_MODE = "true";
    process.env.APP_ORIGIN = "http://127.0.0.1:3000";
  }
});
