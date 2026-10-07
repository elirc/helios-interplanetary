# M1: Make the incident timeline query index-friendly, in both places it lives (mid)

*Added in B08 to fill a gap: the review's second P1 (the OR that defeats `audit_resource`) had no fix exercise, and
this pack had no mid-level ticket.*

## Context
The incident page (`getIncident`, `src/server/queries.ts:27-30`) and the adviser tool `get_incident_timeline`
(`src/server/agent-tools.ts:59-64`) both filter `audit_events` with
`organization_id=$1 AND (resource_id=$2 OR details->>'incidentId'=$2)`. Only the first branch has an index
(`audit_resource`, `db/migrations/001-core.sql:76`). `audit_events` is append-only, and **every telemetry reading** writes a
`TelemetryRecorded` row whose `details` carries `incidentId` (`src/server/telemetry.ts:140-148`, via `src/server/audit.ts`).
So the table grows with sensor traffic, not with incidents.

## Ticket
> The incident page and the adviser's timeline tool get slower every week. Make both reads cost roughly the same
> regardless of how many audit rows the tenant has, without changing what either caller receives.

## Constraints
- **Behaviour is frozen.** `queries.ts:28` returns the newest 100 events (`ORDER BY occurred_at DESC, id`) as `eventJson`.
  `agent-tools.ts:61` returns the oldest 80 (`ORDER BY occurred_at` ascending) as `action,details,occurred_at`. Both must still do exactly that.
- Pick **one** approach and defend it in the PR: (a) a (partial) expression index that makes a `BitmapOr` possible, or (b) a `UNION`/`UNION ALL` rewrite
  where each branch uses its own index. If you pick (b), say how you avoid returning an event twice when both branches match it.
- Any index goes in a **new** migration (`008-*.sql`, or `007` if J1 isn't merged yet). Same runner rules as J1.
- If you de-duplicate code, share the predicate (or a CTE of matching ids), not the whole query. See constraint 1.

## Definition of done
- Both call sites changed, or both served by the new index with the query text untouched. A reviewer can see why the two can't drift apart again.
- A test that pins **ordering and limits** for both callers. `tests/integration/mission.test.ts` / `intelligence.test.ts` are the homes. [Docker]
- [Docker] `EXPLAIN (ANALYZE, BUFFERS)` before/after for one incident on a tenant with ≥ 50k `TelemetryRecorded` rows. Say how you generated them
  (e.g. `npm run scenario` in a loop, or an `INSERT … SELECT generate_series`).
- No-Docker path: a PR description with the predicted before/after plan trees, marked UNVERIFIED.

## Explain before touching
1. Why can't Postgres use `audit_resource` for the whole `OR`? What plan does it fall back to?
2. What fraction of `audit_events` rows have a non-null `details->>'incidentId'`? (Hint: look at what `telemetry.ts:140` writes when no incident is active.) How does that change your index definition?
3. With `UNION` (not `UNION ALL`), what does Postgres dedupe on for `queries.ts`'s `eventJson` output? Is that the same as deduping on `id`?
4. `ORDER BY occurred_at DESC, id` vs `ORDER BY occurred_at` with no tie-breaker: which one is deterministic, and does the agent tool's caller care?
5. What would a regression test need to assert so that a future "cleanup" merging the two queries fails CI?

Sealed answer: `_answers/ladder/M1.md`
