# EXPLAIN (ANALYZE, BUFFERS) journal — Helios's 3 heaviest queries

**Purpose:** most engineers can read an index list. Fewer can read a real query plan and say, precisely,
what will happen when this tenant's data is 100× bigger. This drill makes you write the plan-reading down
*before* you're allowed to guess the fix.

**Setup** (if you have Docker available locally — this repo was drilled without it; see the caveat in
`_answers/explain-journal.md`):
```
npm run db:up      # docker compose up -d --wait, Postgres 17 on 127.0.0.1:5438
npm run db:migrate
npm run db:seed
psql "$DATABASE_URL"
```

## The three queries

**Q1 — Ledger view, `src/server/hub.ts:151`** (`getHubSnapshot` → `journals`)
```sql
SELECT e.id,e.reference,e.description,e.created_at,
       COALESCE(sum(l.amount_cents) FILTER(WHERE l.side='DEBIT'),0)::int AS debits,
       COALESCE(sum(l.amount_cents) FILTER(WHERE l.side='CREDIT'),0)::int AS credits,
       jsonb_agg(jsonb_build_object('account',l.account,'side',l.side,'amount_cents',l.amount_cents)
                 ORDER BY l.side,l.account) AS lines
FROM journal_entries e
JOIN journal_lines l ON l.organization_id=e.organization_id AND l.entry_id=e.id
WHERE e.organization_id=$1
GROUP BY e.id
ORDER BY e.created_at DESC
LIMIT 40;
```

**Q2 — Task fan-out, `src/server/hub.ts:43`** (`getHubSnapshot` → `tasks`)
```sql
SELECT t.* FROM work_order_tasks t
JOIN (SELECT id FROM work_orders WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40) w
  ON t.work_order_id=w.id
WHERE t.organization_id=$1
ORDER BY t.ordinal;
```

**Q3 — Incident audit trail, `src/server/queries.ts:28`** (`getIncident` → `events`, duplicated at
`src/server/agent-tools.ts:61`)
```sql
SELECT ... FROM audit_events
WHERE organization_id=$1 AND (resource_id=$2 OR details->>'incidentId'=$2)
ORDER BY occurred_at DESC, id
LIMIT 100;
```

## For each query, in your own journal entry, answer before running anything

1. Which indexes exist that touch this query? (Check `db/migrations/001-core.sql`, `002-repair-supply-chain.sql`.)
2. Predict the plan shape: which nodes will be Index Scan / Bitmap Index Scan / Seq Scan / Sort / Hash Join /
   Nested Loop? Where would a Sort spill to disk, and at what row count?
3. Predict which node dominates total cost at (a) today's fixture-seed scale (dozens of rows per tenant) and
   (b) a "this account has been live 3 years" scale (order 10⁵–10⁶ rows in the touched tables for one tenant).
4. Run `EXPLAIN (ANALYZE, BUFFERS)` (or reason it through if you don't have Postgres running) and compare
   against your prediction. Where were you wrong?
5. Propose the smallest fix: an index, a rewritten predicate, or a rewritten join shape. State what you'd put
   in the PR description as the before/after evidence.

Write one entry per query. Seal your own answers before reading `training/_answers/explain-journal.md`.
