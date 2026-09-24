# INC-002 — Error-rate graph says 0%, support says otherwise

**Branch:** `training/incidents/002-metrics-blind-spot` (== `main` HEAD `3a9bc1e`; the defect is already in
the code as shipped, so the branch is the app as-is — no additional commit needed to reproduce it)
**Severity:** P2 (observability blind spot masking a real user-facing failure pattern)
**Reported by:** Support, escalated from a customer complaint

## What on-call sees

> A tenant admin says several of their operators "keep getting logged out" and have to re-enter the demo
> session repeatedly. Support checks the ops dashboard's request-metrics tile (`GET /api/metrics`, backed by
> `helios_request_server_errors` and `helios_request_samples`) for that org over the last hour and it reads
> `helios_request_server_errors 0` the entire time — the dashboard says the service is healthy. Support has no
> way to confirm or deny the customer's report from telemetry alone.

Separately, application logs for the same window (`request.failed` events, `src/server/http.ts`) show this
is happening constantly:

```
{"event":"request.failed","requestId":"f1c3...","status":401,"code":"UNAUTHENTICATED","durationMs":4}
{"event":"request.failed","requestId":"a92e...","status":401,"code":"UNAUTHENTICATED","durationMs":3}
{"event":"request.failed","requestId":"77bd...","status":401,"code":"UNAUTHENTICATED","durationMs":5}
```

`/api/metrics` output for the same org, same window:

```
# TYPE helios_request_samples gauge
helios_request_samples 214
# TYPE helios_request_server_errors gauge
helios_request_server_errors 0
# TYPE helios_request_p95_ms gauge
helios_request_p95_ms 41
```

214 samples recorded, all the 401s from the log excerpt above are nowhere in that count, and
`helios_request_server_errors` only counts `status_code>=500` anyway — so even a perfectly complete sample
set wouldn't have shown these as "errors" the way support means it.

## Suspect PR (already merged, in the repo's real history — this is the commit that introduced the whole
OpenTelemetry pipeline these metrics depend on)

```
commit 75c4d82
    Complete local Helios milestone program and retrospective curriculum

diff --git a/src/server/http.ts b/src/server/http.ts
+import { trace, SpanStatusCode } from "@opentelemetry/api";
 export async function route(work: () => Promise<NextResponse>) {
+  return trace.getTracer("helios-http").startActiveSpan("helios.request", async (span) => {
+    try {
+      const response = await handleRoute(work);
+      span.setAttributes({ "http.response.status_code": response.status, ... });
+      if (response.status >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
+      return response;
+    } finally { span.end(); }
+  });
+}

diff --git a/src/server/identity.ts b/src/server/identity.ts
+import { trace } from "@opentelemetry/api";
 export function principalFromRequest(request: Request) {
   ...
-  return verifySession(token);
+  const principal = verifySession(token);
+  trace.getActiveSpan()?.setAttribute("helios.organization_id", principal.organizationId);
+  return principal;
 }

diff --git a/src/server/observability.ts b/src/server/observability.ts (new file)
+export const localSpanExporter: SpanExporter = {
+  export(spans, done) {
+    const relevant = spans.filter(
+      (s) => s.name === "helios.request" && typeof s.attributes["helios.organization_id"] === "string",
+    );
+    ... // only `relevant` spans are ever INSERTed into request_spans
```

## Your job

1. Trace one failed request end to end: `route()` in `src/server/http.ts` → the route handler → `verifySession`
   in `src/server/identity.ts`. At what point does a `401 UNAUTHENTICATED` response get produced relative to
   where `helios.organization_id` gets attached to the active span?
2. Given `observability.ts`'s exporter filter, what happens to the span for that request?
3. Which classes of failure does this affect — only `401`s, or others too? Check every call site that can
   throw *before* `principalFromRequest` successfully returns a principal (`assertLocalRequest`, cookie
   parsing, `verifySession`'s HMAC/expiry checks).
4. `/api/metrics`'s `errors` counter only counts `status_code>=500` in the first place — is that a second,
   independent problem, or the same one? Would fixing #1–3 alone make this metric mean what support needs it
   to mean?
5. Propose the fix and the regression test. What would the test need to assert about `request_spans`
   specifically (not just about the HTTP response) to catch a regression here?

No hints beyond this file. Sealed answer: `training/_answers/incidents/002-metrics-blind-spot.md`.
