# Sealed answers — learn/00-onramp.md

Verification status: every answer was checked by reading the cited lines on `main` (`9d64e5a` era). Nothing here was run
(docs-only pass, Docker down, no node_modules). Plan-shape claims are **reasoned** from Postgres 17 B-tree behaviour and
marked [Docker] where a live `EXPLAIN` would confirm them.

## 1. Bad cookie
a. `verifySession("abc")`: `token.split(".")` gives 1 part, so `identity.ts:86` throws `denied()`,
   which is `DomainError(401, "UNAUTHENTICATED", "Enter the local demo to continue.")` (`identity.ts:83`).
b. `handleRoute`'s `catch` (`http.ts:67`) builds `{ error: { code: "UNAUTHENTICATED", message: "Enter the local demo to continue.", requestId } }`
   with status 401 (`http.ts:82-99`) and logs a `request.failed` JSON line (`http.ts:72-80`). `route()` never sees an exception.
   `handleRoute` *returns* a response, it doesn't throw.
c. `assertLocalRequest` runs first (`identity.ts:109`) and throws `DomainError(403, "HOST_DENIED", ...)` at `identity.ts:56`.
   A 403, not a 401. That matters for INC-002 question 3: it's a second class of dropped span.

## 2. Does the failed request leave a row?
a. Yes. `span.end()` is in `finally` at `http.ts:47`, and because `handleRoute` returned normally, `http.ts:39-44` ran too.
b. `http.response.status_code: 401`, `helios.request_id: <uuid>` (`http.ts:39-42`), plus whatever `@vercel/otel` adds.
   **No `helios.organization_id`**: that's set only at `identity.ts:117`, which comes after the throw.
c. No. The filter at `observability.ts:7-10` keeps only `s.name === "helios.request" && typeof s.attributes["helios.organization_id"] === "string"`.
   The span is silently discarded, with no log and no counter.
d. `/api/metrics` is the endpoint that reports request health, and its own authentication failures are invisible to it.
   This is INC-002 in miniature.

## 3. Composite unique + composite FK
a. It gives Postgres a unique target for **composite foreign keys**: an FK must reference a unique/PK column set, and
   `(organization_id,id)` is that set.
b. It makes a `payment_attempts` row for tenant A that points at an invoice owned by tenant B impossible.
   The FK requires the `(organization_id, invoice_id)` pair to exist in `invoices`. This is tenant-safe keys
   (curriculum 19 (external apprenticeship curriculum, not in this repo)).
c. It helps the **filter** (the leading column is `organization_id`), so Postgres can find the tenant's rows. It doesn't help the **sort**:
   within one tenant, the index is ordered by `id` (a random uuid), not `created_at`, so a Sort node is still needed. That's INC-001 defect 1.

## 4. Index ↔ query matching
| line | verdict | why |
|---|---|---|
| 31 request_spans | **F+S** | `request_spans_tenant_time(organization_id, started_at DESC)`, `006:7`. The textbook case. |
| 37 incidents | **F** | Only `UNIQUE(organization_id,id)` (`001:58`) and the partial `one_active_incident_per_asset(organization_id, asset_id)` (`001:62`). Nothing ends in `opened_at`. **The sealed review doesn't list this table**, so you beat it here. |
| 40 work_orders | **F** (not F+S) | `work_orders_tenant_status(organization_id, status, created_at DESC)` (`002:113`). With no `status` predicate, one tenant's entries are grouped by status first, so `created_at` order only holds *within* each status. PG17 needs a Sort (top-N heapsort for `LIMIT 40`) over all the tenant's work orders. [Docker] to confirm. |
| 52 purchase_requests | **F** | `purchases_tenant_status(organization_id,status)` (`002:114`) and `UNIQUE(organization_id,id)` (`002:69`). No `created_at`. |
| 139 invoices | **F** | `UNIQUE(organization_id,id)` (`005:21`). See 3c. |
| 145 payment_attempts | **F** | `UNIQUE(organization_id,id)` / `UNIQUE(organization_id,invoice_id)` (`005:35`). |

Takeaway: "does an index lead with `organization_id`?" is the wrong question. The right one is "does it lead with the
equality columns **and then** continue with the `ORDER BY` columns, with nothing unfiltered in between?"

## 5. Empty tenant
a. `[]`. `COALESCE(jsonb_agg(...),'[]'::jsonb)` at `hub.ts:14`. `jsonb_agg` over zero rows is `NULL`, and COALESCE turns it into an empty array.
b. `samples 0`, `server_errors 0`, `p95_ms 0` (the `COALESCE(percentile_cont…,0)` at `hub.ts:27`).
c. "0 errors, p95 0 ms" looks like the healthiest possible state, but it also means "we measured nothing".
   Combined with exercise 2, a tenant whose every request is a 401 shows exactly this. A dashboard needs to show `samples`
   next to the rate, and ideally alert on zero traffic (curriculum 09 (external apprenticeship curriculum, not in this repo)).

## 6. Duplicates?
a. `queries.ts:28` selects the full `eventJson` object, `ORDER BY occurred_at DESC, id`, `LIMIT 100`.
   `agent-tools.ts:61` selects `action,details,occurred_at`, `ORDER BY occurred_at` (**ascending**, no tie-breaker), `LIMIT 80`.
b. The agent tool would get the **newest** 100 events instead of the **oldest** 80, in reverse order, with a different payload shape.
   The bounded adviser's reasoning about "what happened first" silently changes. A "pure refactor" that changes behaviour is a classic agent error.
c. Identical: `WHERE organization_id=$1 AND (resource_id=$2 OR details->>'incidentId'=$2)`. That predicate *is* the performance problem,
   so the fix must reach both call sites. The correct de-duplication shares the **predicate** (or a view/CTE of matching ids),
   not the whole query.

## 7. Characterization test (reference sketch)
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
delete process.env.DATABASE_URL; // .env may set it; without it getPool() throws (db.ts:6)
import { localSpanExporter } from "../../src/server/observability";

const span = (attrs: Record<string, unknown>) => ({
  name: "helios.request", attributes: attrs,
  spanContext: () => ({ traceId: "t".repeat(32), spanId: "s".repeat(16) }),
  duration: [0, 5_000_000], startTime: [1_700_000_000, 0],
}) as never;

test("CHARACTERIZATION: org-less request spans are dropped without touching the DB", async () => {
  const code = await new Promise<number>((r) =>
    localSpanExporter.export([span({ "http.response.status_code": 401 })], (res) => r(res.code)));
  assert.equal(code, 0); // if it had reached getPool(), the missing DATABASE_URL would make it reject -> code 1
});

test("contrast: an org-bearing span DOES reach the DB path", async () => {
  const code = await new Promise<number>((r) =>
    localSpanExporter.export([span({ "helios.organization_id": "org-helios", "http.response.status_code": 200 })], (res) => r(res.code)));
  assert.equal(code, 1); // proves the probe works: getPool() threw inside the async map
});
```
Note the ESM hoisting trap: `import` statements are hoisted above the `delete`. It still works here because
`getPool()` reads `process.env` lazily, at call time. If an agent "fixes" this by moving the delete, ask it why.
Name the test `CHARACTERIZATION:`. It pins current behaviour (the bug), and the INC-002 fix should *flip* the first assertion
(curriculum 04 (external apprenticeship curriculum, not in this repo)). UNVERIFIED: not executed (no node_modules).

## 8. Verifying the sealed answer
a. **Claim 1 is false.** `work_order_tasks` has `PRIMARY KEY(organization_id, work_order_id, task_key)` (`002:42`). Its first two
   columns are exactly the join key, so the join at `hub.ts:43` can nested-loop 40 index lookups (or bitmap-scan) instead of
   seq-scanning the tenant's tasks. The proposed `work_order_tasks_wo(organization_id, work_order_id)` index is **redundant**.
b. **Claim 2 is false in PG17.** For org X the index is ordered `(X, AWAITING_PARTS, t9) (X, AWAITING_PARTS, t2) … (X, COMPLETED, t10) (X, COMPLETED, t1) …`,
   so `created_at` order restarts in every status group. The inner subquery reads all of X's work orders through the prefix and top-N sorts them.
   It's cheap for `LIMIT 40`, but proportional to the tenant's work-order count, not bounded at 40.
c. Corrected Q2: the expensive part is the inner "latest 40 work orders", which scans and sorts all of the tenant's work orders.
   The outer task join is fine thanks to the PK. The fix is an index `(organization_id, created_at DESC)` on `work_orders`, not on `work_order_tasks`.
   Lesson: a claim marked "reasoned, not run" still needs reading against the migration. Run `\d work_order_tasks` before you believe any index claim.
d. [Docker] Expect a `Nested Loop` → `Index Scan using work_order_tasks_pkey` on the outer side, and a `Sort` (top-N heapsort) under the subquery's `Limit`.
