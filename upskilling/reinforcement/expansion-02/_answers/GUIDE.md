# Sealed reasoning guide

Attempt both labs and write the investigation hypotheses before reading. These answers concern only this expansion, not the existing Opus incidents.

## Group before balancing

Use the pair organizationId/journalId as the key. Add DEBIT and CREDIT lines separately with exact integers. Return totals as decimal strings and balanced as equality within that group. Sorting the output by the two identity fields makes fixtures deterministic without changing the financial meaning.

A global zero can hide opposite errors in different journals. A group can also appear balanced with only one invalid zero line, so line validity and minimum count belong to the posting contract; the aggregation lab intentionally validates positive lines but does not claim to implement postJournalTx.

## Aggregate every observation

The metrics lab counts zero-duration samples, retains separate status groups, and computes sum and maximum in milliseconds. It does not estimate percentiles. Grouping by route/status produces a bounded result only if route was normalized upstream and the allowed label domains remain bounded.

The model rejects invalid negative/nonfinite durations. The real instrumentation must separately establish that the supplied status and duration correspond to the request that actually completed. A correctly computed average over incorrectly labeled samples is still misleading.

## Evidence limits

Neither lab checks authorization, transaction rollback, database constraints, or HTTP instrumentation. A useful capstone compares pure expected outputs with a real authorized query and an error-path observation. Keep earlier Run 003 verification as historical evidence rather than describing it as rerun by this content expansion.

## Compare mechanisms, not spelling

For each difference from the reference, classify it as another valid implementation, a violated contract, or an assumption absent from the exercise. Show a concrete input for the second category. If you cannot produce one, do not call a stylistic preference a correctness defect.

Return to the application source before adopting a model. The reference deliberately omits infrastructure guarantees that would require browser, database, or provider evidence. It is an executable explanation, not a production patch.
