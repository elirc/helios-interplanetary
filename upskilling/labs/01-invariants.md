# Lab 1: prove the invariants

Attempt these before opening [the answer key](../solutions/01-invariants.md). Keep the application correct; no intentionally broken production code is needed. Run integration checks only against the configured local `helios_test` database.

## A. Predict a duplicate

Start from a nominal fixture. Predict the number of readings, active incidents, and new incident-opening audit records after:

1. One degradation sequence.
2. An identical replay using the same run ID.
3. A new degradation sequence with the same seed and a new run ID.

Explain why equal seed and equal request identity have different meanings. Run the UI or CLI sequence and compare your prediction with persisted counts.

## B. Identify the race

Read the test named “concurrent distinct abnormal readings cannot create multiple active incidents.” Sketch the interleaving if both the asset lock and partial unique index were absent. Then explain the different result if only the lock were absent.

Do not remove safeguards from the main application. If you want to observe a broken version, create an explicit LAB branch or disposable copy and establish the failing check before modifying it.

## C. Late data

Predict the result when a normal reading with an older timestamp arrives after an abnormal reading. Which fields and records should change? Which should stay unchanged? Find the code and database assertion that establish this policy.

Now identify a domain limitation: what happens if an old reading reveals a genuine historical anomaly? Write a requirement for a future historical-analysis feature without silently changing current-state semantics.

## D. Tenant boundaries

Explain why hiding Selene incidents in a React filter would be insufficient. Find one protected read, one protected write, and one database constraint that matter. Distinguish the local fixture identity mechanism from production authentication.

## E. Evidence strength

Choose a test in [mission.test.ts](../../tests/integration/mission.test.ts). Write a plausible incorrect implementation that it would reject, and a separate defect that it might miss. Propose one focused improvement only if it closes a meaningful gap.

## Passing evidence

Save your prediction, actual result, relevant file/function references, and any revised explanation. You pass when your claims match observed behavior and you can identify the limits of the evidence. Test output alone does not complete the lab.
