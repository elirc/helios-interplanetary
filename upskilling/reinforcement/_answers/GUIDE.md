# Sealed reasoning: Helios / astra1

Read after writing your own attempt. This guide answers only the new reinforcement exercises; it does not disclose the existing incident solutions.

## Page arithmetic

For A rows a,b,c at 20 and d at 10, the order is c,b,a,d. Page one at size two is c,b. The cursor `(20,b)` makes page two a,d. A non-strict comparison would repeat b. B's newer z is never eligible because tenant filtering is independent of sorting and cursor position.

The descending cursor predicate is `createdAt < cursor.createdAt OR (createdAt === cursor.createdAt AND id < cursor.id)`. It does not require the cursor row to exist. Filtering produces a new array before sorting, so the original array and row objects remain intact.

## SQL and snapshot limits

For compatible database types and ordering, `(created_at,id) < ($timestamp,$id)` with both ORDER BY terms DESC expresses the same boundary. Values must be parameterized, and the tenant constraint remains required. An index is a performance hypothesis until an actual plan and representative data support it.

Rows inserted ahead of a cursor will generally appear on a fresh traversal rather than later pages. Mutable sort keys can still cause misses or duplicates across requests. Snapshot guarantees require a separate product and data-consistency design.

## Respect the current Helios baseline

Current source contains tenant predicates and repeatable-read read-only transactions in the inspected query paths. This pack asks you to inspect their meaning, not to claim they are missing. A pure-array pass is not a substitute for a real PostgreSQL integration assertion.

## Reference limits

`reference.mjs` implements the simplified contract in this pack. It is not a production patch or a recommendation to replace existing library behavior. The app transfer requires its own tests, source review, and runtime evidence.
