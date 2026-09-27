# J1: Give the finance/support list reads the index pattern the rest of the schema already uses (junior)

*Added in B08 to fill a gap: this DRILL pack had only 2 incidents and no ladder tickets. The review's top P1 finding
(missing composite indexes) had no "now fix it" exercise.*

## Context
Five tables follow the tenant-list pattern `(organization_id, <sort col> DESC)`: `audit_tenant_time` (`db/migrations/001-core.sql:75`),
`readings_asset_time` (`001:43`), `energy_history` (`003:24`), `request_spans_tenant_time` (`006:7`), and, partly,
`work_orders_tenant_status` (`002:113`). The finance/support reads in `src/server/hub.ts` and `src/server/agent-tools.ts` were left out:

| Read | Table | ORDER BY |
|---|---|---|
| `hub.ts:139`, `agent-tools.ts:38` | invoices | created_at DESC |
| `hub.ts:145` | payment_attempts | created_at DESC |
| `hub.ts:148` | provider_charges | charged_at DESC |
| `hub.ts:154`, `agent-tools.ts:44` | support_tickets | created_at DESC |

Migrations are applied by `src/server/migrations.ts`. Read all 33 lines of it before you write any SQL.

## Ticket
> As finance ops I want the Billing and Support panels to stay fast as a tenant's history grows.
> Add the supporting indexes so these four reads are served by an index for both filter and sort.

## Constraints
- **A new migration file**, `db/migrations/007-<name>.sql`. Why can't you add the lines to `005-finance-support-security.sql`? (See `migrations.ts:22-23`.)
- Decide whether `CREATE INDEX CONCURRENTLY` is possible **with this migration runner**. Look at `migrations.ts:10` and at
  [curriculum 07](../../../opusorganize/apprenticeship/curriculum/07-zero-downtime-migrations.md). Write down what you'd do instead for a large production table.
- Name the indexes after the sibling convention (`<table>_tenant_time`).
- Don't change any query text in this ticket. INC-001 (keyset pagination) and M1 (audit OR) are separate.

## Definition of done
- `007-*.sql` exists with four `CREATE INDEX` statements, one per row of the table above.
- [Docker, currently down] `npm run db:migrate` succeeds on a DB already at 006. `EXPLAIN` of `hub.ts:139`'s query for the seeded tenant shows no `Sort` node
  (use `SET enable_seqscan = off` on demo-scale data, or the planner will rightly prefer a seq scan of 20 rows).
- [Docker] `npm run test:integration` still passes (billing suite: `tests/integration/billing.test.ts`).
- No-Docker path: a PR description that lists, for each index, the query it serves (file:line) and why the column order is right.

## Explain before touching (write the answers in your PR description first)
1. What would `npm run db:migrate` do on a developer DB if you edited `005` instead? What would it do in production?
2. Why `(organization_id, created_at DESC)` and not `(created_at DESC, organization_id)`?
3. Is `payment_attempts` read anywhere by `invoice_id`? Does `UNIQUE(organization_id,invoice_id)` (`005:35`) already cover that? (Don't add redundant indexes.)
4. What's the write-side cost of four more indexes on tables written inside `billing.ts` transactions?
5. Bonus: look at `check_journal_balance()` (`005:64-71`). Which query in that trigger runs on **every** journal-line insert, and which index would it need?

Sealed answer: `_answers/ladder/J1.md`
