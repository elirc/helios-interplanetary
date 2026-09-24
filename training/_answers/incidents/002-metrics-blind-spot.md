# Sealed: INC-002 — metrics blind spot on unauthenticated failures

**Verification status:** verified by reading, not by running a live server (no Postgres/Docker in this
session). Every line cited was read directly and the control flow was traced by hand; this is a static-analysis
verification, which is sufficient here because the bug is in synchronous, unconditional code (no
timing/concurrency dependency to reproduce).

## Root cause

`src/server/observability.ts:7-9` only forwards spans to `request_spans` when
`s.attributes["helios.organization_id"]` is a string. The **only** place that attribute is ever set is
`src/server/identity.ts:117`, inside `principalFromRequest`, on the line **after** `verifySession(token)`
returns successfully:

```ts
const principal = verifySession(token);
trace.getActiveSpan()?.setAttribute("helios.organization_id", principal.organizationId);
```

`verifySession` (`identity.ts:81-106`) throws a `401 UNAUTHENTICATED` `DomainError` in every one of these
cases, all of which return *before* line 117 ever runs:
- no cookie / no session token
- token longer than 1024 chars
- token that doesn't split into exactly 2 `.`-separated parts
- HMAC signature mismatch (`timingSafeEqual` fails)
- payload doesn't parse as JSON, or is missing `expiresAt`/`persona`, or `persona` isn't a known key
- `expiresAt` in the past

`assertLocalRequest`, called at the very top of `principalFromRequest` (`identity.ts:109`) before any of the
above, can also throw and would likewise leave the attribute unset.

Because `route()` (`src/server/http.ts:35-50`) still `span.end()`s the span in its `finally` block regardless
of how `work()` failed, a span **is** created and exported for every one of these requests — it's just missing
the one attribute the exporter filters on, so `observability.ts`'s `relevant` array silently excludes it, and
`await Promise.all(relevant.map(...))` never inserts a row for it. No error is thrown, nothing is logged about
the drop — from the exporter's perspective this is working as coded, not crashing.

Consequently: `/api/metrics`'s `SELECT count(*) ... FROM request_spans WHERE organization_id=$1 ...` (the
`samples` and `p95` figures) and the `errors` count are both computed from a set of rows that structurally
excludes every unauthenticated request for that org. The dashboard isn't lying about what it measures — it's
measuring a population that quietly excludes the exact traffic support was asked about.

## Is the `status_code>=500`-only error counter a second, independent problem?

Yes — two separate bugs stacked. Even after fixing the attribute-before-throw ordering so `401`s land in
`request_spans`, `src/app/api/metrics/route.ts`'s `errors` field is defined as
`count(*) FILTER(WHERE status_code>=500)`, which would still show `0` for a wave of `401`s (client errors, not
server errors) — that part of the metric is arguably correct by its own definition (a "server error rate" SLI
legitimately excludes 4xx), but it's undocumented, and "errors" as a metric name reads to an on-call engineer
as "things going wrong," not "things that are *our* fault." Fixing bug #1 alone would at least make the 401s
*visible* in `helios_request_samples` (denominator goes up, and a new `helios_request_client_errors` metric
could be added), but would not by itself change what `helios_request_server_errors` reports.

## The fix

1. **Set the span attribute before the throw can happen, not after.** Either: (a) set
   `helios.organization_id` (or an explicit `unknown`/`unauthenticated` sentinel) as early as possible in
   `route()`/`handleRoute` regardless of outcome, so every span is exportable independent of auth success; or
   (b) change the exporter's filter in `observability.ts:7-9` to export every `helios.request` span
   unconditionally, and make `organization_id` nullable in `request_spans` (it's currently `NOT NULL`,
   `db/migrations/006-observability-and-run-recovery.sql`, which is presumably *why* the exporter filters in
   the first place — this is a real constraint that needs a decision, not just a one-line fix). Option (a)
   with a sentinel org id (or a separate cross-tenant `request_spans_unauthenticated` counter path) fits the
   schema without a migration.
2. **Add a second, explicitly-scoped metric** for non-5xx failures — e.g. `helios_request_client_errors`
   (`status_code>=400 AND status_code<500`) — so "auth is failing for this tenant" has its own signal instead
   of being folded into "samples" with no error flag at all.

## Regression test

A test asserting the `401` HTTP response shape (status code, error body) would not catch this — the bug is
entirely about what gets *recorded*, not what gets *returned*. The right test: send an unauthenticated request
through `route()` with a real (or fake, matching the `SpanExporter` interface) exporter, and assert that a
span **is** produced by the exporter for that request — i.e. test `localSpanExporter.export` directly with a
synthetic span that has `http.response.status_code` set but no `helios.organization_id` attribute, and assert
it still gets included (post-fix) or is explicitly, intentionally excluded with a documented reason (if the
team decides sentinel-org-id tracking isn't worth it). Either way, the test needs to inspect
`request_spans`/the exporter's behavior, not the HTTP layer.

## Model postmortem

The OpenTelemetry pipeline (`75c4d82`) was built and wired correctly for the success path — span in, status
code recorded, exported to Postgres, queryable from `/api/metrics`. What wasn't considered was *where in the
control flow* the one attribute the exporter depends on gets set: `principalFromRequest` sets it as a
side-effect of successfully resolving a principal, which means "the exporter's completeness" was silently
made contingent on "the request being authenticated." For a security-adjacent metric (login failures), that's
the one class of request most likely to matter and least likely to have a principal. Fix: telemetry
completeness should never depend on business-logic success; span attributes needed for export/dashboarding
belong at the top of the request lifecycle, not attached opportunistically wherever a value happens to become
available.
