# Boundary lessons: Ledger invariants and honest metric aggregation

## An invariant has a scope

Read assertBalanced and postJournalTx in ledger.ts. Record the required line count, positive integer cents, debit/credit balance, organization/reference uniqueness, and use of the supplied transaction client. Distinguish a valid journal from a valid authorization decision: balanced arithmetic does not prove the actor may post it.

The synthetic aggregation lab groups by organization and journal ID before balancing. If you sum all organizations together, one tenant's extra debit can cancel another tenant's extra credit. A global total of zero is therefore weaker than per-journal balance. Write two deliberately invalid journals whose errors cancel globally to make the distinction concrete.

## Integer inputs do not guarantee safe totals

Each line can contain a safe integer while a sum exceeds JavaScript's exact-integer range. The lab uses BigInt internally for exact aggregation and returns decimal strings. That choice avoids pretending an unsafe Number is exact, but it changes the serialization and consumer contract. The real application's amounts, database types, and bounds must be inspected before proposing a representation change.

A posted journal is also different from a mutable running total. Inspect the source's insertion behavior for an existing organization/reference. Decide which duplicate-payload question would need a further contract: is a repeated reference with different lines rejected, ignored, or compared? Reading ON CONFLICT alone does not settle every business requirement.

## Metrics are projections of events

Read the current observability/http boundary and identify how route, status, and duration reach telemetry. The second lab accepts already normalized route templates. A raw URL with customer IDs or arbitrary query strings would make an unbounded label dimension; averaging those values correctly does not fix the cardinality problem.

Group by route and status. Count every request, sum durations, and compute a maximum. A zero-duration request is still an observation. Empty input should remain no observations, not a fabricated healthy request. An average is useful for some questions but cannot reveal tail latency or guarantee that individual failures were recorded accurately.

## Existing verification stays scoped

The current-state document and Run 003 describe real PostgreSQL and browser evidence from earlier work. This expansion does not rerun that evidence. Keep historical application results, new pure-model results, and learner-generated integration results separate. The existing repair rollback exercise already covers late transactional failure; do not claim journal arithmetic replaces it.

## Make the boundary visible

For each source trace, record the caller, input representation, validation, state owner, returned value, and visible user consequence. Put a question mark beside every arrow you inferred rather than located. Resolve one question by reading its caller and one by proposing a focused test. A diagram full of accurate filenames can still miss an unhandled outcome.

End with three sentences: the invariant, the failure that would violate it, and the smallest observation that would detect the violation. Use [the source map](README.md) to keep this exercise attached to the actual repository.
