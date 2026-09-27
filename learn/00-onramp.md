# On-ramp — Helios warm-ups (do these before `training/`)

Eight short exercises, 10–25 min each. Write your answer down **before** you open `learn/_answers/00-onramp.md`.
Exercises 1–6 and 8 need only an editor. Exercise 7 needs `npm ci` (node_modules is currently absent) but **no Docker**.
Anything marked [Docker] requires Docker, which is currently down. Skip that part and come back later.

---

## 1. Read and predict: what does a bad cookie return? (10 min)

Read `src/server/identity.ts:81-119` and `src/server/http.ts:52-100`.
A request hits `GET /api/metrics` with the cookie `helios_session=abc` (and a correct `Host` header).

a. Which exact line throws, and what `DomainError` (status, code) does it throw?
b. Which function catches it, and what JSON body and status go back to the browser? Write the body's shape.
c. Now the same request arrives with `Host: evil.example`. Which line throws first, and with what status/code?

## 2. Trace: does that failed request leave a row in `request_spans`? (15 min)

Keep going from exercise 1a. Follow the span opened at `src/server/http.ts:36` until it's exported by
`src/server/observability.ts:5-35` (wired up in `src/instrumentation.ts`).

a. Is `span.end()` called for the failed request? Which line?
b. Which attributes does the span have when it ends? List them.
c. Does the exporter insert it? Quote the condition that decides.
d. What's ironic about the endpoint you picked in exercise 1?

## 3. Explain the schema: why `UNIQUE(organization_id, id)` next to a primary key? (15 min)

Open `db/migrations/005-finance-support-security.sql:15-37`. `invoices.id` is already `PRIMARY KEY`, yet the table also declares
`UNIQUE(organization_id,id)`, and `payment_attempts` has `FOREIGN KEY(organization_id,invoice_id) REFERENCES invoices(organization_id,id)`.

a. What does the composite unique constraint make possible that the PK alone doesn't?
b. What bad row does the composite FK make impossible? Describe it in one sentence using two tenants.
c. Does this unique index help `SELECT ... FROM invoices WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40`
   (`src/server/hub.ts:139`)? Say which half of that query it helps and which half it doesn't.

## 4. Match indexes to queries by reading only migrations (25 min)

For each query in `src/server/hub.ts`, say whether an existing index serves **(F)** the `organization_id` filter only,
**(F+S)** the filter *and* the `ORDER BY` (so no Sort node is needed), or **(none)**. Cite the index name or constraint and the migration line.

| hub.ts line | table | ORDER BY |
|---|---|---|
| 31 | request_spans | started_at DESC |
| 37 | incidents | opened_at DESC |
| 40 | work_orders | created_at DESC |
| 52 | purchase_requests | created_at DESC |
| 139 | invoices | created_at DESC |
| 145 | payment_attempts | created_at DESC |

Careful with line 40: read the index's **column order**, not just its column list.

## 5. Predict output: what does the hub show a tenant with no data? (10 min)

Read `rowsJson` (`src/server/hub.ts:7-18`) and the `requestMetrics` query (`hub.ts:26-29`).

a. For a brand-new tenant with zero invoices, what's `invoices` in the returned object: `null`, `[]`, or an error?
b. With zero `request_spans` rows in the last hour, what are `samples`, `server_errors` and `p95_ms`?
c. Why is (b) dangerous on a dashboard? Tie it to exercise 2.

## 6. Are these two queries really duplicates? (10 min)

`training/_answers/review.md` says the audit-trail query at `src/server/queries.ts:28` is "duplicated, same shape" at
`src/server/agent-tools.ts:61`. Put the two SQL strings side by side.

a. List every difference: columns selected, `ORDER BY` direction, tie-breaker, `LIMIT`.
b. If an agent "de-duplicates" them into one shared function using the `queries.ts` version, what changes for the agent tool's caller?
c. What's the same in both, and is it the part that matters for performance?

## 7. Write one characterization test: pin the exporter's drop behaviour (25 min, needs `npm ci`, no Docker)

There's no test anywhere that mentions `observability` or `localSpanExporter` (`grep -rn observab tests/` returns nothing).
Write `tests/unit/observability.test.ts` in the style of `tests/unit/identity.test.ts` (`node:test` + `node:assert/strict`).
**Keep this file local. Don't commit it** (this is a docs-only pass on main).

Test: calling `localSpanExporter.export([span], done)` with a fake span named `helios.request` that has
`http.response.status_code: 401` and **no** `helios.organization_id` calls `done` with `{ code: 0 }`, and the
database is never touched.

Hints: a fake span only needs `name`, `attributes`, `spanContext()`, `duration`, `startTime` (cast it).
`npm test` loads `.env` (`--env-file-if-exists=.env`), so `DATABASE_URL` may be set. Think about how to *prove* the pool
was never touched without Docker. (What does `getPool()` in `src/server/db.ts:5-6` do when `DATABASE_URL` is missing?)

Exit: `npm test` passes. Deleting the `typeof s.attributes["helios.organization_id"] === "string"` clause
(`observability.ts:9`) makes your test fail. Restore it afterwards and check `git diff src/` is empty.

## 8. Verify the sealed answer, not just your own (20 min)

The sealed EXPLAIN reference (`training/_answers/explain-journal.md`, Q2) was written without a running database. It says:

> `work_order_tasks`: no listed index beyond its presumed primary key; no index on `(organization_id, work_order_id)`

and it says `work_orders_tenant_status(organization_id,status,created_at DESC)` is usable for
`WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40` "as a plain `(organization_id, created_at DESC)` prefix — fine".

Check both claims against `db/migrations/002-repair-supply-chain.sql:25-44` and `:113`.

a. Is claim 1 true? What does the table's primary key look like, and what does that mean for the join at `hub.ts:43`?
b. Is claim 2 true in Postgres 17 (`compose.yaml`)? Draw the index's sort order for one tenant with rows in two statuses.
c. What's the corrected cost story for Q2? Which of the sealed answer's proposed fixes is unnecessary?
d. [Docker] Confirm with `EXPLAIN (ANALYZE, BUFFERS)` on seeded data.

This is the verify-before-trust habit ([curriculum 05](../../opusorganize/apprenticeship/curriculum/05-verify-before-trust.md)) applied to answer keys.
A sealed answer is also an agent's output.

---
Stretch (no answer sealed): `src/server/queries.ts:49` orders by `observed_at DESC, applied DESC, received_at DESC`.
Index `readings_asset_time` (`001-core.sql:43`) covers only the first key. Look up "Incremental Sort" and predict the plan.
