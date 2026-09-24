# Sealed: staff-level findings — Helios raw-SQL performance review

Scope: performance/read-path only (authz/concurrency intentionally excluded — already saturated elsewhere in
this program). Ranked by production severity. Each cites evidence; "why it matters" is one line.

## Performance

**P1 — `invoices` has no index that matches its hottest read shape.**
`src/server/hub.ts:139` and `src/server/agent-tools.ts:38` both run
`SELECT ... FROM invoices WHERE organization_id=$1 ORDER BY created_at DESC LIMIT N`. The only indexes on
`invoices` (`db/migrations/005-finance-support-security.sql:21`) are `UNIQUE(organization_id,id)` and
`UNIQUE(organization_id,subscription_id,period)` — neither ends in `created_at`. Postgres can use the
`(organization_id,id)` unique index to filter by org (an Index Scan, or Bitmap Index Scan) but then has to
sort the matched rows by `created_at` separately, or fall back to a Seq Scan + Sort once the org's row count
makes the index path look worse than a full scan to the planner. Compare the five *other* tenant-scoped list
tables that got the composite index right: `audit_tenant_time (organization_id, occurred_at DESC)`,
`work_orders_tenant_status (organization_id, status, created_at DESC)`,
`request_spans_tenant_time (organization_id, started_at DESC)`, `energy_history (organization_id, observed_at DESC)`,
`readings_asset_time (organization_id, asset_id, observed_at DESC)`. `invoices` (and, same defect,
`support_tickets` for `hub.ts:154`/`agent-tools.ts:44`, `payment_attempts` for `hub.ts:145`, and
`provider_charges` for `hub.ts:148`) were left out of that pattern. Why it matters: this is exactly the kind
of gap that's invisible at demo-fixture scale and shows up as a linear-then-superlinear latency climb once
one tenant has a real billing history — see INC-001.

**P1 — the incident/audit "OR" query can't use its own index.**
`src/server/queries.ts:28` (`getIncident`) and `src/server/agent-tools.ts:61` (duplicated, same shape) both run:
```sql
WHERE organization_id=$1 AND (resource_id=$2 OR details->>'incidentId'=$2)
```
The table has `audit_resource (organization_id, resource_id, occurred_at)` — useful for the *first* branch of
the `OR` only. `details->>'incidentId'` is a jsonb operator applied per row with no expression index behind
it, so the second branch can't use any index. Postgres's options for a two-branch `OR` where only one branch
is indexed are a `BitmapOr` (impossible here — no index for branch two) or a plan that abandons the index
entirely and scans `audit_events` for the whole org. Every incident detail-page load and every "bounded
adviser" agent tool call pays this. Why it matters: this table is append-only and grows forever (it's the
audit trail); the query gets slower every day the product is alive, and it's duplicated in two files so a fix
in one place is easy to miss in the other.

**P2 — no pagination shape exists past a fixed `LIMIT`, and the obvious fix (`OFFSET`) is a trap.**
Every list read in `hub.ts`, `queries.ts`, and `agent-tools.ts` is `ORDER BY <col> DESC LIMIT N` with no way
to see row `N+1`. If a feature request asks for "load more" (as in INC-001's planted PR), the fastest thing to
reach for is `LIMIT $2 OFFSET $3`. `OFFSET` doesn't skip work — Postgres still has to produce and discard the
first `page * pageSize` rows in sorted order before it can return the next page, so cost grows with page
depth, not with page *size*. Combined with the missing index above, this compounds: an unindexed sort that's
merely bad on page 0 becomes "redo an unindexed sort of everything before this offset" on page 40. The correct
shape, given these queries already have a strict total order (`created_at DESC, id` or similar), is **keyset
pagination**: `WHERE organization_id=$1 AND (created_at, id) < ($lastCreatedAt, $lastId) ORDER BY created_at
DESC, id DESC LIMIT N` — cost stays roughly flat regardless of how deep the caller pages, using the same
composite index recommended above (add `id` as a tiebreaker column or rely on the primary key for the tie).
Why it matters: this is a "the fix someone reaches for under deadline pressure is the shape that scales the
worst" trap — worth knowing generically, not just here.

**P3 — `getHubSnapshot`'s two-step "top-40-then-join" reads aren't N+1, but they do run the ordering work twice.**
`hub.ts:43` and `hub.ts:126`: `SELECT t.* FROM work_order_tasks t JOIN (SELECT id FROM work_orders WHERE
organization_id=$1 ORDER BY created_at DESC LIMIT 40) w ON t.work_order_id=w.id ...`. This is *not* N+1 (it's
one round trip, not 40), and it's a reasonable way to say "tasks for the 40 most recent work orders" without a
window function. But it means the planner re-derives and re-sorts the same top-40 id list that `hub.ts:40`
already fetched two lines earlier, inside the same transaction, and the result set for `tasks`/`agent_steps`
is unbounded per parent (a work order with 200 tasks returns 200 rows with no cap). Why it matters: it's a
correct-but-wasteful pattern worth naming precisely so it isn't confused with the P1/P1 findings above during
triage — and the unbounded per-parent fan-out is the part that could genuinely regress if a future feature
lets an operator add many more tasks to one work order.

## Old-AI-generated smells

- None of the above are the placeholder/fake-integration smell this program usually flags for
  COURSE/GENERATED apps — the schema shows real, deliberate composite-index thinking on 5 of 9 hot tables
  (see P1 above), which is the same team simply not finishing the pattern on the finance/support tables. Not
  malicious, not decorative — a genuine "shipped fast, came back later" gap, which is realistic and worth
  presenting as such rather than as an AI-slop signature.
- `getHubSnapshot`'s `rowsJson` helper (`hub.ts:7-18`) wraps every one of the ~25 queries in a
  `jsonb_agg(to_jsonb(t))` subquery — a deliberate, consistent choice to serialize once server-side rather
  than N+1 round trips from the client. Worth calling out as a strength, not a smell, so a reviewer doesn't
  waste review time flagging it.

## Telemetry correctness (see INC-002 for the full trace)

**P1 — the OTel exporter silently drops every span that never reaches `principalFromRequest`'s success path,**
which is every `401 UNAUTHENTICATED` and every `assertLocalRequest` rejection. `src/server/observability.ts:7-9`
filters spans to `s.name === "helios.request" && typeof s.attributes["helios.organization_id"] === "string"`.
`src/server/identity.ts:117` is the *only* place that attribute gets set, and it runs *after*
`verifySession(token)` — which throws before that line on any bad/missing/expired session
(`src/server/identity.ts:81-106`). The result: `/api/metrics`'s `helios_request_samples` and
`helios_request_server_errors` counters are computed entirely from `request_spans`, and unauthenticated
traffic never lands a row there. A wave of failed logins is invisible on the dashboard that exists specifically
to catch it. Why it matters: this is the worst kind of observability bug — the dashboard reports green, so
nobody escalates, and the gap is discovered by a customer complaint instead of an alert.

**P2 — `/api/metrics`'s error counter only counts `status_code>=500`,** so even after fixing the drop above,
a spike of `401`s would add to `helios_request_samples` but never to `helios_request_server_errors`. That's a
defensible choice for a "5xx = our fault" SLO, but it's not documented anywhere as intentional, and it's easy
to read `helios_request_server_errors 0` as "no problems" rather than "no *5xx* problems" — which is exactly
how support read it in INC-002. Why it matters: a metric whose name is broader than its definition needs a
comment or a second, explicitly-scoped metric (e.g. `helios_request_client_errors`), or it will keep getting
misread during incidents.

## Everything else (brief, since scope was performance/telemetry)

- `hub.ts:40`/`hub.ts:151` etc. use `SELECT *` on tables that have since grown columns across 6 migrations
  (`work_orders`, `purchase_requests`, `shipments`, `docking_reservations`, `subscriptions`,
  `payment_attempts`...). Not a bug today, but every new column silently joins the hub payload; worth a
  projection list the next time one of these tables changes shape.

## Severity legend
P1 = will surface in production at realistic tenant scale, no code change needed to trigger it, hard to detect
without this kind of review. P2 = real but needs a specific trigger or compounds with something else. P3 =
correct today, worth naming so it isn't mistaken for the P1s during triage.
