# Helios Interplanetary — B03 training pack (DRILL tier)

Focus of this batch: **raw-SQL performance diagnosis** and **telemetry correctness** — deliberately *not*
authz/concurrency (already saturated elsewhere in this program; see
`apprenticeship\COMPETENCY_GRAPH.md`). Central concept pages this pack drills against (read, don't
re-explain): [`10-query-plans-and-indexes.md`](../../opusorganize/apprenticeship/curriculum/10-query-plans-and-indexes.md),
[`09-telemetry-correctness.md`](../../opusorganize/apprenticeship/curriculum/09-telemetry-correctness.md).

This repo already has two rich, unrelated learning trees — `astraupskill/` (generic template) and
`upskilling/` (bespoke build retrospective). Neither touches SQL performance or telemetry, so there's no
overlap with what's below.

## Suggested order (~3–4 hours total)

1. **`review/EXERCISE.md`** (60 min, blind) — review the tenant-scoped read paths for performance. Then fill
   in `review/COMPARE.md` against the sealed `_answers/review.md`.
2. **`review/EXPLAIN-JOURNAL.md`** (45–60 min) — predict, then (if you have Docker running) verify, the query
   plans for the 3 heaviest queries in the app. Sealed reference: `_answers/explain-journal.md`.
3. **`incidents/001-invoice-history-pagination.md`** (30–45 min) — diagnose a planted bug on
   `training/incidents/001-invoice-history-pagination` (missing index + OFFSET pagination trap). Sealed:
   `_answers/incidents/001-invoice-history-pagination.md`.
4. **`incidents/002-metrics-blind-spot.md`** (30–45 min) — diagnose a real, already-shipped bug (branch
   `training/incidents/002-metrics-blind-spot`, same code as `main` HEAD) where unauthenticated failures never
   reach the metrics endpoint. Sealed: `_answers/incidents/002-metrics-blind-spot.md`.
5. **`interview/PROJECT_STORIES.md`** and **`interview/TECHNICAL_QUESTIONS.md`** (30 min) — turn the above
   into interview-ready answers, specific to this codebase.

## What's real vs. reasoned

- The **missing composite index** on `invoices` (and the same gap on `support_tickets`, `payment_attempts`,
  `provider_charges`) is verified directly against `db/migrations/005-finance-support-security.sql` — no
  index on those tables matches their `ORDER BY created_at/charged_at DESC` reads, while five sibling tables
  in the same schema got this right. High confidence, static verification.
- The **OR-defeats-index** audit-trail query is verified directly against `db/migrations/001-core.sql`'s
  `audit_resource` index and the query text in `src/server/queries.ts:28` / `src/server/agent-tools.ts:61`
  (same bug, two files). High confidence, static verification.
- The **telemetry blind spot** (INC-002) is a real, already-committed bug at `main` HEAD, traced line-by-line
  through `src/server/http.ts`, `src/server/identity.ts`, `src/server/observability.ts`. High confidence,
  static verification (control flow is synchronous and unconditional — no live server needed to confirm it).
- **`EXPLAIN (ANALYZE, BUFFERS)` output itself is UNVERIFIED.** Docker is installed but its daemon was not
  running in this session (`docker compose up -d --wait` failed fast with a named-pipe connection error, not a
  hang, so no timeout was needed — Docker Desktop was not started to bring the daemon up, which was out of
  scope). All plan-shape reasoning in `_answers/explain-journal.md` is derived from the schema and standard
  Postgres planner behavior, not from a run. Re-run instructions are in that file.
- The **planted incident commit** (INC-001, `training/incidents/001-invoice-history-pagination`) was hand-
  checked for type consistency against existing patterns in `src/server/billing.ts`/`queries.ts` but **not**
  compiled (`BUILD: UNVERIFIED` — no `node_modules` installed in this session; installing them was judged not
  worth the time budget for a ~30-line diff that mirrors an existing, working pattern almost exactly).

## Incident branches created this batch

- `training/incidents/001-invoice-history-pagination` — commit `c2b2688`, planted PR-sized diff.
- `training/incidents/002-metrics-blind-spot` — no new commit; branch pins `main` HEAD `3a9bc1e` because the
  defect is already shipped there.
