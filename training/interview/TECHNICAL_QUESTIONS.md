# TECHNICAL_QUESTIONS.md — Helios Interplanetary (raw-SQL performance + telemetry)

All 10 reference this codebase specifically. Answer in your own words before checking any code again.

1. **Indexing.** `invoices` has `UNIQUE(organization_id,id)` and `UNIQUE(organization_id,subscription_id,period)`.
   Why does neither of those help `SELECT ... WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40`
   (`src/server/hub.ts:139`)? What's the minimal index that would?

2. **OR and indexes.** `src/server/queries.ts:28` filters on `(resource_id=$2 OR details->>'incidentId'=$2)`.
   Name two different ways Postgres could execute this `OR`, and explain why neither is available here given
   the indexes on `audit_events` in `db/migrations/001-core.sql`.

3. **Pagination.** Why does `LIMIT $n OFFSET $m` get slower as `$m` grows, even though the number of rows
   *returned* stays the same? Describe the keyset-pagination rewrite for `src/server/hub.ts:139`'s invoices
   query, using columns that already exist on that table.

4. **Read the plan.** In `EXPLAIN (ANALYZE, BUFFERS)` output, what specifically tells you a sort spilled to
   disk instead of finishing in memory? What two things would you check first if you saw that on the ledger
   query in `src/server/hub.ts:151`?

5. **N+1 vs. not.** `src/server/hub.ts:43` joins `work_order_tasks` against a 40-row subquery of recent
   `work_orders` in one round trip. Is this N+1? Justify your answer, and then explain what *is* expensive
   about it despite not being N+1.

6. **Transactions and isolation.** `getHubSnapshot` (`src/server/hub.ts:19-21`) wraps ~25 queries in
   `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`. Why `REPEATABLE READ` here instead of the
   Postgres default `READ COMMITTED`, given this transaction only reads? What could go visibly wrong for the
   dashboard if it were `READ COMMITTED` instead?

7. **Telemetry completeness.** Trace `src/server/http.ts:35` → `src/server/identity.ts:108-119` →
   `src/server/observability.ts:5-35`. Under what exact condition does a real HTTP response *not* produce a
   row in `request_spans`? Is this a bug in the exporter, the span-attribute placement, or both?

8. **Metric definition vs. metric name.** `/api/metrics`'s `helios_request_server_errors` only counts
   `status_code>=500`. Is that wrong? What would you need to add (not change) to make 4xx spikes visible
   without breaking whatever currently depends on `helios_request_server_errors` meaning "5xx only"?

9. **Cardinality and PromQL-style labels.** `src/app/api/metrics/route.ts` emits one
   `helios_outbox_events{status="..."}` series per outbox status per org. If this endpoint were scraped
   globally across every tenant with one label set per org instead of being queried per-tenant as it is now,
   what would happen to the series count, and what's the general rule for keeping label cardinality bounded?

10. **Regression tests for performance bugs.** For the invoice-history incident (INC-001), explain why a test
    asserting `GET /api/billing?page=5` returns `200` is worthless as a regression test, and describe what a
    test *would* need to assert to actually catch this class of bug in CI.
