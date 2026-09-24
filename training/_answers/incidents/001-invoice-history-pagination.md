# Sealed: INC-001 — invoice history pagination

**Verification status:** reasoned + schema-verified (index list read directly from
`db/migrations/005-finance-support-security.sql`); latency numbers in the incident brief are illustrative, not
measured (no live Postgres in this session — Docker daemon was down; `EXPLAIN`-level reasoning for the same
underlying query is in `training/_answers/explain-journal.md` Q1-adjacent reasoning, since `invoices` shares
the exact "no composite index" defect analyzed for `journal_entries`). **BUILD: UNVERIFIED** — the planted
diff was not compiled (`npm ci`/`tsc --noEmit`) in this session; it was hand-checked against the existing
`pool.query<{...}>` generic-row pattern used throughout `src/server/queries.ts` and the `Pool`/`Principal`
imports already present in `src/server/billing.ts`, so it should type-check, but that has not been confirmed
by actually running the compiler.

## Root cause

Two independent defects compound:

1. **No supporting index.** `invoices` has `UNIQUE(organization_id,id)` and
   `UNIQUE(organization_id,subscription_id,period)` — neither ends in `created_at`. The query
   `WHERE organization_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3` cannot use an index to produce rows
   in `created_at` order; Postgres must scan+filter by org, sort the full matching set by `created_at`, then
   walk `OFFSET` rows into that sorted set before returning `LIMIT` more.
2. **`OFFSET` pagination on an already-unindexed sort.** Even with the index added, `OFFSET` does not skip
   work — Postgres still produces and discards every row up to the offset. `page * pageSize` rows have to be
   materialized and thrown away on every request, so latency grows roughly linearly with `page`, and combined
   with defect 1's disk-spilling sort on a growing table, the growth is worse than linear once the sort
   itself starts spilling to disk (`work_mem` exceeded) as the org's invoice history grows.

This is exactly the "shipped fast, comes back later" pattern this codebase already exhibits elsewhere (5 of 9
tenant-scoped list tables got the composite-index treatment; `invoices` was one of the ones left out — see
`training/_answers/review.md` P1).

## The diagnostic path a senior would take

1. Notice latency correlates with `page`, not with load or deploys — rules out a resource contention or
   regression-from-a-deploy story, points at "cost proportional to depth" (classic `OFFSET` smell).
2. `EXPLAIN (ANALYZE, BUFFERS)` the exact query with a representative `page`/`OFFSET` for the affected tenant;
   look for `Sort` with `Sort Method: external merge` (disk spill) and compare `actual rows` at the `Sort` node
   to `rows` at the underlying scan — confirms the whole org's invoices are being sorted every time regardless
   of page.
3. Check `db/migrations/*.sql` for `invoices` indexes — confirms defect 1 in under a minute; this is the "read
   the schema, not just the query" habit the blind review exercise is specifically training.

## The fix

- Add `CREATE INDEX invoices_tenant_time ON invoices(organization_id, created_at DESC);` — matches the sibling
  pattern (`audit_tenant_time`, `work_orders_tenant_status`, etc.) exactly.
- Replace `OFFSET` with **keyset pagination**: the client passes the last-seen `(createdAt, id)` instead of a
  page number; the query becomes
  `WHERE organization_id=$1 AND (created_at, id) < ($cursorCreatedAt, $cursorId) ORDER BY created_at DESC, id
  DESC LIMIT $pageSize`. With the new index, this is an Index Scan bounded by `LIMIT`, with cost independent
  of how many pages the caller has already walked through.
- If the product genuinely needs page *numbers* (not just "next page") for finance's quarter-close UI, keep
  the index but cap how deep `OFFSET` is allowed to go, or precompute page boundaries — don't let the API
  accept an unbounded `page` query param against an `OFFSET` query.

## Regression test

A test asserting `GET /api/billing?page=5` returns `200` would not catch this — the bug is about cost shape,
not correctness of the response. The right test: seed a tenant with enough invoices to force at least two
plan-relevant thresholds (e.g. more rows than `work_mem` can sort in memory, or simply enough rows that a Seq
Scan is picked over an index), then assert on the query plan itself
(`EXPLAIN (FORMAT JSON) ...` parsed for `"Node Type": "Index Scan"` on the new index, and absence of
`"Sort Method": "external merge"`) rather than on the HTTP response — a plan-shape assertion, run once as part
of a migration/perf test suite, not on every CI run against tiny fixture data.

## Model postmortem (one paragraph, as you'd write it for the incident channel)

Finance's "load more" request landed as a straightforward `LIMIT/OFFSET` addition, the same shape used
throughout the codebase's fixed-`LIMIT` reads — but none of those existing reads ever paged past page 0, so
the `OFFSET` cost trap and the missing `invoices` index were both invisible until a tenant with years of
billing history exercised deep pages. Fix: add the composite index that four other tables in this schema
already have, switch to keyset pagination for anything that can page arbitrarily deep, and treat "add
`OFFSET`" as a code-review flag on any query lacking a supporting composite index, not just here.
