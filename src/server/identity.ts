import { createHmac, timingSafeEqual } from "node:crypto";
import type { Principal } from "../domain/contracts";
import { DomainError } from "./errors";
import { trace } from "@opentelemetry/api";

export const PERSONAS: Record<string, Principal> = {
  controller: {
    id: "operator-vale",
    name: "Avery Vale",
    organizationId: "org-helios",
    organizationName: "Helios Interplanetary",
    role: "operator",
  },
  observer: {
    id: "operator-chen",
    name: "Morgan Chen",
    organizationId: "org-selene",
    organizationName: "Selene Research",
    role: "operator",
  },
  auditor: {
    id: "auditor-reyes",
    name: "Jordan Reyes",
    organizationId: "org-helios",
    organizationName: "Helios Interplanetary",
    role: "viewer",
  },
};
export const SESSION_COOKIE = "helios_session";
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function demoConfig() {
  const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
  if (process.env.DEMO_MODE !== "true" || !LOOPBACK.has(new URL(origin).hostname)) {
    throw new DomainError(403, "DEMO_DISABLED", "Local demo access is disabled.");
  }
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith("replace-with")) {
    throw new DomainError(
      503,
      "SESSION_NOT_CONFIGURED",
      "Generate local configuration with npm run configure.",
    );
  }
  return { origin, secret };
}

export function assertLocalRequest(request: Request) {
  const { origin } = demoConfig();
  const configured = new URL(origin);
  const requestUrl = new URL(request.url);
  // NextURL normalizes loopback URLs to localhost. The original Host header
  // preserves the actual browser authority; never trust forwarded-host headers.
  const host = request.headers.get("host") ?? requestUrl.host;
  if (host !== configured.host || requestUrl.protocol !== configured.protocol) {
    throw new DomainError(403, "HOST_DENIED", "Use the configured local application address.");
  }
}

export function assertSameOrigin(request: Request) {
  assertLocalRequest(request);
  if (request.headers.get("origin") !== demoConfig().origin) {
    throw new DomainError(
      403,
      "ORIGIN_DENIED",
      "Mutation requires the configured application origin.",
    );
  }
}

export function signSession(persona: string, now = Date.now()) {
  if (!Object.hasOwn(PERSONAS, persona))
    throw new DomainError(400, "INVALID_PERSONA", "Unknown demo operator.");
  const payload = Buffer.from(
    JSON.stringify({ persona, expiresAt: now + 8 * 60 * 60 * 1000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", demoConfig().secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token: string | undefined, now = Date.now()): Principal {
  const { secret } = demoConfig();
  const denied = () => new DomainError(401, "UNAUTHENTICATED", "Enter the local demo to continue.");
  if (!token || token.length > 1024) throw denied();
  const parts = token.split(".");
  if (parts.length !== 2) throw denied();
  const expected = createHmac("sha256", secret).update(parts[0]).digest();
  const actual = Buffer.from(parts[1], "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw denied();
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as {
      persona?: string;
      expiresAt?: number;
    };
    if (
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= now ||
      !payload.persona ||
      !Object.hasOwn(PERSONAS, payload.persona)
    )
      throw denied();
    return PERSONAS[payload.persona];
  } catch {
    throw denied();
  }
}

export function principalFromRequest(request: Request) {
  assertLocalRequest(request);
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const principal = verifySession(token);
  trace.getActiveSpan()?.setAttribute("helios.organization_id", principal.organizationId);
  return principal;
}

export function requireOperator(principal: Principal) {
  if (principal.role !== "operator")
    throw new DomainError(403, "FORBIDDEN", "This operator has read-only access.");
}
