# Sealed rubrics — learn/01-agentic-practice.md

Status: rubrics are derived from the code on `main` and the sealed training answers. No agent run was performed in the B08 pass.
Score your spec (S), your review (R) and the agent's output (O) separately. The spec and the review are **your** grade.

## Drill A — J1 indexes
**A good spec contains:** the four tables with their sort columns and call sites; "new file `db/migrations/007-…sql`, never edit applied files";
"migrations run inside one transaction (`migrations.ts:10`), so no CONCURRENTLY"; "don't change query text";
"report which checks you actually ran". (S: 1 point each, pass ≥ 4.)
**Expected agent failures to catch (R):** CONCURRENTLY in 007 (common, because it's the "best practice" answer out of context);
an extra `payment_attempts(invoice_id)` index; `(created_at, organization_id)` order; "verified with EXPLAIN" with Docker down.
Full reference: `training/_answers/ladder/J1.md`.
**Bonus insight to look for:** the agent (or you) spotting the `check_journal_balance` seq scan (`005:68`). Few do.

## Drill B — M1 OR query
**A good spec contains:** both call sites with their exact ordering, limit and projection frozen; the choice between approaches (a) and (b);
"regression tests must assert ordering and limit for both callers"; the migration rules from A.
**Expected agent failures (R):** only one call site fixed; the tool silently switched to newest-first; `UNION` without handling rows both
branches match; a non-partial expression index; a test asserting only `events.length > 0`. Reference: `training/_answers/ladder/M1.md`.
**Pass:** you caught ≥ 2 of these, or the agent made none and you can show where you checked.

## Drill C — INC-002 fix
**Design verdicts:**
- *Sentinel org id* (e.g. `"unauthenticated"`): the cleanest code change, **but** `request_spans.organization_id` is
  `NOT NULL REFERENCES organizations(id)` (`006:2`). Without a seeded `organizations` row for the sentinel, every insert fails, and because the exporter swallows
  errors (`observability.ts:29-32` → `done({code:1})`, nothing logged), you've swapped one silent drop for another.
  An agent that doesn't mention this failed the review.
- *Nullable column + exporter change*: needs migration `00N` (`ALTER TABLE request_spans ALTER COLUMN organization_id DROP NOT NULL`, and the FK still
  allows NULL). `/api/metrics` is per-tenant (`WHERE organization_id=$1`), so NULL-org rows still never show up in any tenant's
  metrics. You need a separate global/unauthenticated view. The honest answer says so.
- *Rejected design*: attributing the tenant **before** verification. The org claimed by an unverified cookie is attacker-controlled.
  A reviewer should reject "parse the payload's persona without checking the HMAC to get the org".
**Characterization test flip:** the first assertion in the on-ramp 7 test (`code === 0`, meaning "dropped") must change under either design.
If the agent deleted the test instead of updating it, that's a fail.
**403 path:** `assertLocalRequest` (`identity.ts:56`) runs before the cookie is read. A fix at `identity.ts:117` alone misses it. A fix in `route()` covers it.
Reference: `training/_answers/incidents/002-metrics-blind-spot.md`.

## Drill D — INC-001 keyset
**Correct core:** `WHERE organization_id=$1 AND (created_at, id) < ($2, $3) ORDER BY created_at DESC, id DESC LIMIT $4`, plus the index
`invoices(organization_id, created_at DESC, id DESC)` (or J1's index, where the tie-break needs a small sort, which is acceptable).
**Failures to catch:** mixed directions (`created_at DESC, id ASC`) with a row-value comparison, which skips or duplicates rows at timestamp ties;
an unvalidated cursor (`new Date("garbage")` → `Invalid Date` → a pg error → a 500); `nextCursor` built from the wrong row (the first instead of the last);
keeping `OFFSET` "for backwards compatibility" without a cap; a test asserting only `200`.
Reference: `training/_answers/incidents/001-invoice-history-pagination.md` (fix + regression test sections).

## Checklist self-check
If your review didn't use at least these items, redo it: the migration checksum, CONCURRENTLY/transaction, `organization_id` in every branch,
ordering/limit diff, exporter filter + `006` constraints, and an UNVERIFIED label on plan claims while Docker is down.
