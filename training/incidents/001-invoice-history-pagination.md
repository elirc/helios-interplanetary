# INC-001 — Invoice history tab gets slower the deeper finance pages

**Branch:** `training/incidents/001-invoice-history-pagination` (based on `main` HEAD `3a9bc1e`)
**Severity:** P3 (no outage, growing latency, finance-facing)
**Reported by:** Finance ops, via the in-app "Invoice history" tab on Billing

## What on-call sees

> "Invoice history" used to be instant. Now paging past the first ~10 pages takes multiple seconds, and by
> page 40 it times out. This only affects the org with the longest billing history (the demo "enterprise"
> tenant seeded with years of invoices); other tenants say it's fine.

Request log excerpt (`request.completed` events from `src/server/http.ts`, one line per JSON log record,
trimmed to the relevant field):

```
{"event":"request.completed","requestId":"a1e2...","status":200,"durationMs":38}   # GET /api/billing?page=0
{"event":"request.completed","requestId":"b7f1...","status":200,"durationMs":61}   # GET /api/billing?page=5
{"event":"request.completed","requestId":"c9d4...","status":200,"durationMs":210}  # GET /api/billing?page=15
{"event":"request.completed","requestId":"d3a8...","status":200,"durationMs":740}  # GET /api/billing?page=30
{"event":"request.completed","requestId":"e0b2...","status":200,"durationMs":2380} # GET /api/billing?page=45
```

`/api/metrics` for this tenant shows `helios_request_p95_ms` climbing steadily over the same window with no
deploy in between — just finance paging further back as they reconcile a quarter-end close.

## Suspect PR (already merged, on this incident branch)

```
commit c2b2688
Author: Helios Build Agent <helios-agent@local.invalid>

    feat(billing): add GET invoice history endpoint for the finance tab

    Finance wants to page back through every invoice ever issued, newest
    first, 20 per page. Straightforward LIMIT/OFFSET pagination against
    invoices, same shape as the rest of the billing endpoints.

diff --git a/src/app/api/billing/route.ts b/src/app/api/billing/route.ts
+export async function GET(request: Request) {
+  return route(async () => {
+    const principal = principalFromRequest(request);
+    const url = new URL(request.url);
+    const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);
+    return json(await listInvoiceHistory(principal, page));
+  });
+}

diff --git a/src/server/billing.ts b/src/server/billing.ts
+export async function listInvoiceHistory(principal: Principal, page: number, pool: Pool = getPool()) {
+  const result = await pool.query(
+    `SELECT id, number, customer_id AS "customerId", period, status,
+            amount_cents AS "amountCents", created_at AS "createdAt"
+     FROM invoices
+     WHERE organization_id=$1
+     ORDER BY created_at DESC
+     LIMIT $2 OFFSET $3`,
+    [principal.organizationId, INVOICE_HISTORY_PAGE_SIZE, page * INVOICE_HISTORY_PAGE_SIZE],
+  );
+  return { page, pageSize: INVOICE_HISTORY_PAGE_SIZE, invoices: result.rows };
+}
```

## Your job

1. Diagnose why latency grows with page depth instead of staying flat.
2. Check it out: `git -C <repo> worktree add <scratch>/inc-001 training/incidents/001-invoice-history-pagination`,
   read `src/server/billing.ts` and `db/migrations/005-finance-support-security.sql` in full.
3. Decide: is the fix an index, a rewritten query shape, or both? What would you tell finance about whether
   this also affects the *other* `ORDER BY created_at DESC LIMIT N` reads in `hub.ts` (invoices, support
   tickets, payment attempts, provider charges)?
4. Write the regression test you'd add and what it would need to assert to actually catch this (hint: a test
   asserting "returns 200" would not catch this bug).

No hints beyond this file. Sealed answer: `training/_answers/incidents/001-invoice-history-pagination.md`.
