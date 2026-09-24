# Sealed: reference EXPLAIN (ANALYZE, BUFFERS) analysis — 3 heaviest Helios queries

**Verification status: UNVERIFIED (reasoned, not run).** Docker is installed on this machine but the Docker
daemon was not running when this batch was built (`docker compose up -d --wait` failed immediately with
`failed to connect to the docker API ... dockerDesktopLinuxEngine: The system cannot find the file specified`
— a fast failure, not a hang, so no timeout was needed; Docker Desktop itself was not started because bringing
up a full Windows Docker Desktop boot was out of scope for this batch). No `EXPLAIN` output below is real.
Every plan-shape claim is derived from the schema in `db/migrations/*.sql`, the query text in the repo, and
standard Postgres planner behavior. **To get real numbers:** start Docker Desktop, then
`npm run db:up && npm run db:migrate && npm run db:seed`, connect with `psql "$DATABASE_URL"`, and run the
three `EXPLAIN (ANALYZE, BUFFERS)` statements from the exercise. Also note: this repo's seed/fixture data
(`src/server/fixtures.ts`, `enterprise-fixtures.ts`) is demo-scale — tens to low-hundreds of rows per tenant —
so even a live run against seeded data will **not** show the seq-scan/disk-sort patterns described below for
"3 years live" scale. That's expected: the exercise's point is learning to reason from the schema and the
planner's cost model to a scale you can't easily seed locally, which is what you actually have to do the first
time you're paged about a production-only slowdown.

---

## Q1 — Ledger view (`src/server/hub.ts:151`)

**Indexes available:** `journal_entries`: `PRIMARY KEY(id)`, `UNIQUE(organization_id,id)`,
`UNIQUE(organization_id,reference)` — none lead with `organization_id` *and* end in `created_at`.
`journal_lines`: `PRIMARY KEY(id)` only, plus FKs to `(organization_id,entry_id)` and `(organization_id,account)`
with no explicit index (Postgres does not auto-index FK columns) — so the join predicate
`l.organization_id=e.organization_id AND l.entry_id=e.id` has no index on the `journal_lines` side either.

**Predicted plan shape:**
- `journal_entries`: filter on `organization_id=$1` — likely an Index Scan using `(organization_id,id)` if
  selective enough, else Seq Scan; either way followed by a **Sort** on `created_at DESC` since no index
  supplies that order for this org's rows.
- `journal_lines`: no index on `(organization_id, entry_id)` → **Seq Scan** on `journal_lines`, then a
  **Hash Join** (build side = the entries already filtered/limited, if the planner can push the `LIMIT 40`
  down before the join — it likely *cannot*, because the join is needed to compute `debits`/`credits`/`lines`
  before the `GROUP BY`/`ORDER BY`/`LIMIT` can be applied) — meaning in the worst case Postgres has to join
  **every** `journal_lines` row for the org against **every** `journal_entries` row for the org, aggregate all
  of them, sort the aggregated rows by `created_at DESC`, and only then take the top 40.
- `GROUP BY e.id` with `jsonb_agg(... ORDER BY l.side,l.account)`: a per-group sort of `journal_lines`,
  cheap per group (ledger entries are small, 2+ balanced lines by the `check_journal_balance` trigger) but
  paid once per entry.

**Cost driver at scale:** `journal_lines` row count for the tenant, because there is no index that lets
Postgres avoid scanning the whole table for the join, and the `LIMIT 40` can't be pushed below the
aggregation. This is the "aggregate-then-limit" trap — a `LIMIT` after a `GROUP BY` does not bound the amount
of pre-aggregation work.

**Fix:** add `CREATE INDEX journal_lines_entry ON journal_lines(organization_id, entry_id);` (mirrors the FK,
matches the join predicate exactly) and `CREATE INDEX journal_entries_tenant_time ON journal_entries
(organization_id, created_at DESC);` so the entries side can at least be found and pre-ordered before the
join; the aggregate-then-limit cost remains inherent to "top 40 most recent, with their full line detail" and
would need a different shape (e.g. fetch the 40 entry ids first via the new index, *then* join lines only for
those 40 ids) to actually bound the join's input size — that rewrite is the real fix, not just the indexes.

## Q2 — Task fan-out (`src/server/hub.ts:43`)

**Indexes available:** `work_orders`: `work_orders_tenant_status(organization_id,status,created_at DESC)` —
usable for the inner subquery's `WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40` as an Index Scan
(status not filtered, so it's used as a plain `(organization_id, created_at DESC)` prefix — fine). `work_order_tasks`:
no listed index beyond its presumed primary key; no index on `(organization_id, work_order_id)` visible in
`002-repair-supply-chain.sql:39-44`.

**Predicted plan shape:** inner subquery `w` — Index Scan on `work_orders_tenant_status`, cheap, bounded to 40
rows regardless of tenant size (this part is fine). Outer join to `work_order_tasks` — with no index on
`(organization_id, work_order_id)`, the join to filter tasks down to just those 40 work orders is a
**Seq Scan on `work_order_tasks` for the whole org** (or the whole table, if the planner can't use
`organization_id` alone efficiently), Hash-Joined against the 40-row `w` set.

**Cost driver at scale:** total `work_order_tasks` row count for the tenant, not the 40 work orders returned —
every maintenance task ever logged gets scanned to find the ones belonging to this run's 40 work orders.

**Fix:** `CREATE INDEX work_order_tasks_wo ON work_order_tasks(organization_id, work_order_id);` turns the
outer side into an Index Scan (or Nested Loop with Index Scan, 40 lookups) instead of a full scan. This is
the cheapest fix of the three — a single supporting index, no query rewrite needed.

## Q3 — Incident audit trail (`src/server/queries.ts:28`, duplicated `src/server/agent-tools.ts:61`)

**Indexes available:** `audit_resource(organization_id, resource_id, occurred_at)` — matches the
`resource_id=$2` branch exactly. No index exists on the expression `details->>'incidentId'`.

**Predicted plan shape:** for `WHERE organization_id=$1 AND (resource_id=$2 OR details->>'incidentId'=$2)`,
Postgres's `OR`-of-two-conditions planning generally requires both branches to be satisfiable by index scans
combinable via `BitmapOr`, or it falls back to a scan that can evaluate the whole boolean per row. Since
`details->>'incidentId'=$2` has no index, there is no bitmap plan available for that branch — the realistic
plan is a **Seq Scan on `audit_events` filtered by `organization_id=$1`**, evaluating
`(resource_id=$2 OR details->>'incidentId'=$2)` per row, then a **Sort** on `occurred_at DESC, id` (no index
supplies that order once the scan isn't index-driven), then `LIMIT 100`. `audit_events` is append-only and has
no retention/partition scheme visible in the migrations, so this table only grows.

**Cost driver at scale:** total `audit_events` row count for the tenant. This is the worst of the three
because the table's growth is unbounded by design (it's the audit log) and the query runs on every incident
detail-page view and every "bounded adviser" tool call.

**Fix — two real options, not both needed:**
1. **Expression index:** `CREATE INDEX audit_incident_detail ON audit_events(organization_id,
   (details->>'incidentId'))` where the expression is non-null, letting the second branch use a real index
   and making a `BitmapOr` with `audit_resource` possible. Keeps the `OR` shape.
2. **Rewrite as `UNION`** of two independently-indexed queries (`... WHERE organization_id=$1 AND resource_id=$2`
   UNION `... WHERE organization_id=$1 AND details->>'incidentId'=$2`), each able to use its own index, then
   re-sort/re-limit the combined ~200-row set in the application or a wrapping query. Preferred when the two
   branches have very different selectivity, since each can be tuned independently.
Either way: **fix it in both `queries.ts:28` and `agent-tools.ts:61`** — the duplication means a fix in one
file leaves the other one slow.
