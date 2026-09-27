# Study guide — Helios Interplanetary (astra1), raw-SQL Postgres performance DRILL

## What this app is and why it's in the portfolio

Helios is a multi-tenant "interplanetary operations" simulator: Next.js route handlers (`src/app/api/**/route.ts`)
call hand-written SQL in `src/server/*.ts` against Postgres 17 (`compose.yaml`, schema in `db/migrations/001–006`).
There is **no ORM** — every query you optimise is a string you can read, and every index is a line in a migration.
It's in the portfolio as the place to learn **reading schemas against queries, predicting plans, and telemetry you
can trust** (`src/server/observability.ts`, `src/app/api/metrics/route.ts`). The exercises are in `training/`
(B03). This guide is the on-ramp to them.

## Machine state right now (read before session 1)

- **`node_modules` is absent.** Run `npm ci` before anything that runs TypeScript (`npm test`, `npm run typecheck`).
  Unit tests (`tests/unit/*.test.ts`) need **no database**.
- **Docker is currently down** (the WSL distro is gone). Anything marked **[Docker]** below
  (`npm run db:up`, `db:migrate`, `db:seed`, `test:integration`, `EXPLAIN ANALYZE`, `npm run dev`)
  **requires Docker, which is currently down**. Every session has a **no-Docker path**: read the schema, predict,
  then check against the sealed reasoned answers. When Docker comes back, redo the [Docker] exit criteria.
- The repo has 7 uncommitted files that belong to someone else's in-progress work (`git status`). Don't commit them. Use worktrees for incident branches.

## Prerequisites (do these first, ~2–3 h total)

1. **Read a query plan and match an index to a query**: [curriculum 10 — query plans & indexes](../../opusorganize/apprenticeship/curriculum/10-query-plans-and-indexes.md).
   This page already cites this repo (the aggregate-then-limit trap).
2. **Telemetry that lies by omission**: [curriculum 09 — telemetry correctness](../../opusorganize/apprenticeship/curriculum/09-telemetry-correctness.md).
3. **Verifying code (and answers) you didn't write**: [curriculum 05 — verify before trust](../../opusorganize/apprenticeship/curriculum/05-verify-before-trust.md).
   You'll use it on agent output *and* on this repo's own sealed answers (see on-ramp exercise 8).
4. **Characterization tests**: [curriculum 04](../../opusorganize/apprenticeship/curriculum/04-characterization-tests.md). You'll write the first test of the span exporter.
5. **Why index builds are a migration concern**: [curriculum 07 — zero-downtime migrations](../../opusorganize/apprenticeship/curriculum/07-zero-downtime-migrations.md) (the `CONCURRENTLY` line).
6. **How a request becomes a row here**: `upskilling/lessons/01-request-to-row.md` (existing, tracked, keep). Its "run it once" step is [Docker]; do the "Follow the code" half.

## Study route (10 sessions, ~9–10 h)

Legend: **HAND** = you do it yourself, no agent. **DELEGATE** = give it to a coding agent, then verify it yourself with the checklist in `01-agentic-practice.md`.

| # | Time | Session | Exact material | Exit criterion (verifiable) |
|---|---|---|---|---|
| 1 | 60 min | **Orient: follow one request** | `src/server/http.ts:35-89` (`route`/`handleRoute`), `src/server/identity.ts:81-119`, `src/server/queries.ts:19-33`, `upskilling/lessons/01-request-to-row.md` | Without notes, you can say which function catches a `DomainError`, where the `X-Request-Id` header is set, and which line attaches `helios.organization_id` to the span. |
| 2 | 60 min | **On-ramp part 1** | `learn/00-onramp.md` exercises 1–4 | Your written answers match `learn/_answers/00-onramp.md` on ≥ 3 of 4. |
| 3 | 60 min | **On-ramp part 2 + first test** | `learn/00-onramp.md` exercises 5–8 (needs `npm ci`, no Docker) | Your new `tests/unit/observability.test.ts` (kept local, not committed) passes with `npm test` and **documents** the drop of an org-less span. |
| 4 | 60 min | **Blind review** | `training/review/EXERCISE.md` → `training/review/COMPARE.md` vs `training/_answers/review.md` | COMPARE filled in with a score. You found both P1 index findings (invoices family + audit OR). |
| 5 | 60 min | **EXPLAIN journal** | `training/review/EXPLAIN-JOURNAL.md`; sealed `training/_answers/explain-journal.md` | No-Docker: 3 written journal entries with predictions made **before** reading the answer, plus one place where you think the sealed answer is wrong (on-ramp 8 gives a hint). [Docker]: real `EXPLAIN (ANALYZE, BUFFERS)` pasted for all 3. |
| 6 | 45 min | **INC-001** (OFFSET on unindexed sort) | `training/incidents/001-invoice-history-pagination.md`, branch `training/incidents/001-invoice-history-pagination` (commit `c2b2688`) in a worktree | You can say both defects in one sentence each, and you've written the keyset `WHERE (created_at,id) < ($1,$2)` query. [Docker]: plan shows `Index Scan` after your index. |
| 7 | 45 min | **INC-002** (metrics blind spot, real bug on `main`) | `training/incidents/002-metrics-blind-spot.md` | You can list every throw site before `identity.ts:117`, and you can explain why `errors` in `metrics/route.ts:11` is a *second* bug. |
| 8 | 60 min | **Ladder J1 — finance indexes (agent drill A)** | `training/ladder/J1-finance-composite-indexes.md` + `learn/01-agentic-practice.md` Drill A | Your spec is written before the agent runs. The agent's migration is a **new** `db/migrations/007-*.sql`, doesn't use `CONCURRENTLY` inside `migrate()`'s transaction, and you caught at least one trap from the sealed rubric. |
| 9 | 60 min | **Ladder M1 — audit OR query (agent drill B) + INC-002 fix (drill C)** | `training/ladder/M1-audit-or-query.md`, `learn/01-agentic-practice.md` Drills B–C | Your review notes say whether the agent kept the **different** ordering/limits of `queries.ts:28` vs `agent-tools.ts:61`, and whether its telemetry fix keeps `request_spans.organization_id NOT NULL` satisfied. |
| 10 | 45 min | **Interview kit** | `training/interview/PROJECT_STORIES.md` (5), `training/interview/TECHNICAL_QUESTIONS.md` (10) | You answer TQ 1, 2, 3, 7 and 10 aloud in under 2 min each, with file names, and without notes. |

## Do vs. delegate, per session

| # | Do BY HAND | Delegate to an agent, then verify |
|---|---|---|
| 1 | All of it. Reading code is the skill. | Nothing. At most, ask an agent "where is X defined?" and then open the file yourself. |
| 2–3 | Predictions, schema reading, and the *assertion* in the characterization test (what behaviour you're pinning). | The test file's boilerplate (imports, `node:test` scaffolding) once you've written the assertion in a comment. Verify that it fails if you delete the filter in `observability.ts:7-10`. |
| 4 | The whole blind review. An agent-written review teaches you nothing. | Afterwards, optionally ask an agent for its own review and score it against `_answers/review.md` like you scored yourself. |
| 5 | Predictions and plan reading. | [Docker] Running the three `EXPLAIN` statements and pasting output is fine to delegate. Interpreting it is not. |
| 6–7 | Diagnosis: symptom → hypothesis → evidence in schema/code. | Writing the regression test **after** you've written what it must assert (a plan shape for 001, an exporter behaviour for 002). |
| 8–9 | The spec/prompt, the review, and deciding on the fix shape (index vs rewrite, sentinel vs nullable column). | The migration SQL, the query rewrite, the exporter change, the tests. Then run the checklist. |
| 10 | Everything. | An agent can play interviewer and ask the follow-ups in `MOCK`-style. Don't let it answer. |

## How you know you're done here

- You can open any `SELECT ... WHERE organization_id=$1 ORDER BY x DESC LIMIT n` in `src/server/hub.ts` and say,
  from `db/migrations/*.sql` alone, whether an index serves both the filter and the sort.
- You can explain `OFFSET` vs keyset pagination and aggregate-then-limit with Helios examples.
- You've found and explained one error in a sealed answer (on-ramp 8), which shows you verify the answers too.
- You've directed an agent through J1 and M1 and caught at least two of its mistakes with the checklist.
- COMPARE score ≥ 5/7 on the review. You can answer the interview TQs without notes.

**Next repo:** **atlas** (`Desktop\gitvg\atlas`, training M1 / INC-001 / INC-003). It's the same plan-reading skill at
EF Core scale, then the SQL Server arc (curriculum 22). If you want tenant isolation next instead, go to **aaa1** (RLS lab, curriculum 19).
The live-stack telemetry follow-on to INC-002 is **astraspacegameweb** LAB0 + M1.
