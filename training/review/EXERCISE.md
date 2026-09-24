# Blind code review — Helios Interplanetary (raw-SQL performance)

**Time box: 60 minutes. Don't open `training/_answers/` first.**

Scope this review to **raw-SQL performance and read-path shape**, not authz/concurrency (already covered
elsewhere in this program). You're reviewing the tenant-scoped read queries that back the operator dashboard,
Mission Control snapshot, and the ops hub — the code a customer notices as "the app feels slow" long before
anyone files a ticket.

Start here:
- `src/server/queries.ts` — `getIncident`, `getSnapshot`
- `src/server/hub.ts` — `getHubSnapshot` (the single biggest fan-out of tenant-scoped queries in the app: ~25 queries in one transaction)
- `src/server/agent-tools.ts` — the "bounded adviser" tool queries (same DB, different caller)
- `db/migrations/001-core.sql` through `006-observability-and-run-recovery.sql` — every index actually created
- `src/app/api/metrics/route.ts` and `src/server/observability.ts` — what Helios's own `/api/metrics` endpoint measures itself with

Find and rank (severity: correctness / data-integrity / performance / operability / maintainability), citing
`file:line` for each:

1. Which tenant-scoped `WHERE organization_id=$1 ... ORDER BY ... LIMIT N` queries in `hub.ts` and `billing.ts`
   have **no matching composite index** — i.e. the only indexes touching that table don't lead with
   `organization_id` *and* end in the sort column? Compare against the tables that got this right
   (`audit_tenant_time`, `work_orders_tenant_status`, `request_spans_tenant_time`, `energy_history`,
   `readings_asset_time` — five different tables, same pattern). Which tables were left out of that pattern?
2. Find a query whose `WHERE` clause combines an indexed equality with an `OR` branch that **cannot** use the
   same index (a JSON-path extraction, a computed expression, or a second column with no index). What would
   the planner actually have to do to satisfy that `OR`? Is this query duplicated anywhere else in the codebase
   with the same shape?
3. None of Helios's list endpoints support paging past their fixed `LIMIT`. If product asked for a "load more"
   button on an audit trail or billing history list tomorrow, what's the naive fix an agent would reach for,
   and why would it get slower, not just linearly, the deeper a tenant paged? What would the correct pagination
   shape look like given the `ORDER BY` these queries already use?
4. `getHubSnapshot` runs inside one `REPEATABLE READ READ ONLY` transaction and executes on the order of 25
   separate round-trip queries (`hub.ts:19-158`), several of them followed by a second query that re-derives
   the same "top 40" id list via a nested subquery (e.g. `hub.ts:43`, `hub.ts:126`). Is that a real N+1, or
   something else? What does it cost as tenants and their row counts grow?
5. Helios instruments itself with OpenTelemetry (`src/instrumentation.ts`, `src/server/observability.ts`) and
   exposes `/api/metrics` reading from `request_spans`. Walk the path from `route()` in `src/server/http.ts`
   through `principalFromRequest` in `src/server/identity.ts` to the exporter's filter in `observability.ts:7-9`.
   Is every HTTP response guaranteed to produce a row in `request_spans`? What would you need to be true of a
   request for its span to be silently dropped by the exporter, and what would `/api/metrics`'s error rate and
   p95 look like during a spike of exactly that kind of request?
6. Anything else standard for a staff-level review pass: missing `EXPLAIN`-worthy joins, columns selected that
   are never used downstream, places `SELECT *` would bite a future migration, etc.

Write your findings as a ranked list with evidence. Then open `training/review/COMPARE.md` and fill it in against
`training/_answers/review.md`.
