# Transfer the idea into Helios / astra1

## Translate, then verify against a disposable database

Choose an actual read in `queries.ts` whose pagination or ordering you want to characterize. Preserve its current direction choices unless a new contract explicitly changes them. Write five fixtures: tied timestamps, another organization with newer rows, an empty page, a cursor whose source row was deleted, and an insertion ahead of the cursor.

Implement a small test-owned query matching the proposed tuple contract, or add a regression to an existing paginated read if one already exists. Compare real PostgreSQL results with the pure model. Parameterize values. Explain how your SQL collation and ID type relate to the model's lowercase ASCII ordering; do not assume JavaScript lexical ordering is identical to every database collation.

Follow the repository's current test-fixture rules: the separate isolated test database is mandatory for integration assertions. Keep checks sequential because suites may reset the same fixture. This task needs no change to immutable migrations, the review world's development data, or the existing repair transaction.

Deliver the ordering contract, SQL, expected pages, actual database result or an explicit pending status, and a measured EXPLAIN only if you ran one.

## Review a proposed change

An agent adds `ORDER BY created_at DESC LIMIT $1 OFFSET $2` and says “stable pagination solved,” without a tie-breaker or a tenant predicate. Explain the correctness questions before discussing speed. Another proposes a tuple cursor but uses `<=`; demonstrate the repeated boundary row with a two-page fixture.

## Evidence boundary

Work in your own practice branch or isolated workspace and inspect existing changes first. Do not switch or reset the owner's working tree. Describe any uncommitted source your exercise depends on; a worktree from HEAD does not include it. Use the existing package scripts after reading their targets. Run one repository at a time, with disposable fixtures for data tests. The authoring pass supplied exercises, not these application changes.

For a TS repository, sketch the input/output types and one discriminated union before implementation. Name which invalid input still needs runtime validation. For GitJira's JS code, use its existing JSDoc/shared-schema conventions instead of converting the app to TypeScript.
