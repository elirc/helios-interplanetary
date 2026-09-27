# Agentic practice — direct an agent on Helios, then review it like it's hostile

The loop for every drill: **(1) you write the spec by hand → (2) an agent implements it in a worktree →
(3) you review its diff against the checklist below → (4) you compare with the sealed rubric** in `learn/_answers/01-agentic-practice.md`.
Do the drill's diagnosis first (the related `training/` exercise). Never let the agent diagnose for you.

Setup for every drill: `git worktree add ../astra1-drill-X main` (or the incident branch). Run `npm ci` inside it.
**Don't** point an agent at the main checkout: it holds 7 uncommitted files that belong to someone else's in-progress work.
[Docker] steps require Docker, which is currently down. Until it's back, grade the agent on static checks and on claims it
*can't* have verified. An agent that says "tested against Postgres" today is fabricating.

---

## Drill A — J1 finance indexes (45 min)
Source: `training/ladder/J1-finance-composite-indexes.md`.
1. **HAND:** write a ≤ 12-line spec: which four indexes, which migration file name, and the runner facts the agent must respect
   (you'll find them in `src/server/migrations.ts`). Don't mention the traps by name. The question is whether your spec
   prevents them anyway.
2. **DELEGATE:** "Implement this spec. Show me the diff and the exact commands you ran."
3. **REVIEW:** run the checklist. Specifically: did it touch `005`? Did it use `CONCURRENTLY`? Did it add a redundant `payment_attempts(invoice_id)` index?
   Did it claim a plan it couldn't run?

## Drill B — M1 audit OR query (60 min)
Source: `training/ladder/M1-audit-or-query.md`. Prerequisite: on-ramp exercise 6.
1. **HAND:** spec that freezes behaviour: newest-100 `eventJson` for `queries.ts:28`, oldest-80 `action,details,occurred_at` for `agent-tools.ts:61`.
   Ask for approach (a) *or* (b) with a justification.
2. **DELEGATE** the migration, the query change (if any) and the regression tests.
3. **REVIEW:** diff the two SQL strings before and after, character by character, for `ORDER BY` and `LIMIT`. Check that the partial-index `WHERE` is
   implied by the query predicate. Check that tests assert ordering, not just `length > 0`.

## Drill C — Fix INC-002 (telemetry blind spot) (60 min)
Source: `training/incidents/002-metrics-blind-spot.md` (do it first, by hand). Prerequisite: on-ramp exercise 7, your characterization test.
1. **HAND:** decide the design yourself: sentinel org id set early in `route()`, *or* nullable `request_spans.organization_id` + exporter filter change.
   Write down why. Include in the spec: "the characterization test in `tests/unit/observability.test.ts` must flip, and say which assertion flips".
2. **DELEGATE** the implementation plus a `helios_request_client_errors` line in `src/app/api/metrics/route.ts`.
3. **REVIEW** against these questions:
   - Does every insert still satisfy `request_spans.organization_id NOT NULL REFERENCES organizations(id)` (`db/migrations/006-observability-and-run-recovery.sql:2`)?
     A sentinel like `"unknown"` violates the FK unless a matching `organizations` row exists.
   - Does `/api/metrics`, which is per-tenant (`metrics/route.ts:11`), now show a tenant's 401s? Which tenant does an unauthenticated request belong to?
   - Is the 403 `HOST_DENIED` path (`identity.ts:56`) covered too?

## Drill D — INC-001 keyset pagination + a test that would actually catch it (45 min)
Source: `training/incidents/001-invoice-history-pagination.md` on branch `training/incidents/001-invoice-history-pagination`.
1. **HAND:** specify the cursor contract (`?before=<createdAt>,<id>` or an opaque base64 cursor), the response shape (`nextCursor`), and what the regression test asserts.
2. **DELEGATE** `listInvoiceHistory` + the route + the test.
3. **REVIEW:** is the tuple comparison `(created_at, id) < ($2, $3)` paired with `ORDER BY created_at DESC, id DESC` (same direction on both keys)?
   Is the cursor validated (zod), or can `?before=garbage` produce a 500? Does the test assert on the plan or row-count shape, not just `200`?

---

## Verification checklist — before you trust agent output in astra1

**Build and tests**
- [ ] `npm run lint`, `npm run typecheck`, `npm test` (unit, no DB) pass in the worktree. Needs `npm ci` first.
- [ ] [Docker] `npm run test:integration`. Until Docker is back, list the integration tests that *would* cover the change (`tests/integration/billing.test.ts`,
      `mission.test.ts`, `intelligence.test.ts`, `platform.test.ts`) and mark the PR UNVERIFIED.
- [ ] New tests fail when the fix is reverted. Check by reverting it yourself. "Returns 200" tests don't count.

**Schema and migrations** (`src/server/migrations.ts`)
- [ ] No existing `db/migrations/00N-*.sql` file was edited (the checksum guard at `migrations.ts:22-23` will crash every existing DB).
- [ ] No `CREATE INDEX CONCURRENTLY` (or any other non-transactional statement) inside a migration: `migrations.ts:10` wraps them all in one transaction.
- [ ] Index column order: equality columns first, then the `ORDER BY` columns, with nothing unfiltered between them (on-ramp 4).
- [ ] No redundant index: check existing `UNIQUE(...)` / `PRIMARY KEY(...)` first (on-ramp 8 caught a sealed answer making that mistake).

**Tenant safety invariants** (easy to break during a "perf rewrite")
- [ ] Every new or rewritten query still has `organization_id=$1` in **every** branch, including each side of a `UNION` and each subquery.
- [ ] Tenant id comes from `principalFromRequest` (`src/server/identity.ts:108-119`), never from a query param or body.
- [ ] Composite FKs `(organization_id, x)` are preserved in any new table ([curriculum 19](../../opusorganize/apprenticeship/curriculum/19-rls-defense-in-depth.md)).

**Behaviour and contracts**
- [ ] Ordering, limits and projections of existing reads are unchanged unless the spec said otherwise. Diff the SQL strings.
- [ ] Route handlers still go through `route()` (`src/server/http.ts:35`) so the span and `request.failed` logging stay intact.
- [ ] Input validation uses zod like `billingSchema` (`src/server/billing.ts:14`). New query params are parsed, not `Number(x) || 0`.

**Telemetry**
- [ ] Anything that affects `request_spans` is checked against the exporter filter (`src/server/observability.ts:7-10`) and the table constraints (`006:1-7`).
- [ ] Metric names match their definitions (`helios_request_server_errors` = 5xx only, `metrics/route.ts:11`).

**Claims**
- [ ] Every performance claim comes with an `EXPLAIN (ANALYZE, BUFFERS)` from a dataset big enough to matter, or it's labelled UNVERIFIED.
      Demo-scale seeds (`src/server/fixtures.ts`) make a seq scan optimal, so "it uses a seq scan, so it's slow" and "it's fast now" are both meaningless there.
