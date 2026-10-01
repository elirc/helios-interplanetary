# Tests that reject a plausible wrong implementation

## Scenario: the dashboard says balanced

Organization A journal J has debit 100 and credit 90. Organization B journal J has debit 90 and credit 100. A global reducer reports net zero. Identify the missing grouping dimensions and write a fixture where journal IDs collide across organizations. Then add two journals within A to prove organization alone is also insufficient.

## Scenario: latency improves while failures disappear

A refactor filters samples with `if (durationMs)` and records status from a default response object instead of the actual error path. Zero-duration samples vanish and failures may be counted as successes. Separate aggregation correctness from instrumentation correctness: the pure lab can catch the truthiness bug, but the HTTP error-path test must supply the status evidence.

Create one 200 sample and one 500 sample for the same route, then compare the group counts. Do not interpret an average over successful requests as overall service health. If the real telemetry path is already correct, characterize it and preserve the test rather than injecting an application defect.

## Investigation method

Start with two competing hypotheses. For each, predict an observation that would be different if it were true. Inspect the smallest relevant boundary before editing. Preserve the original failing input and record whether you observed a symptom, reproduced a mechanism, or merely reasoned about it.

Build three layers of evidence: a pure contract case; the real module or adapter with controlled dependencies; and one user-visible or database-visible outcome. State explicitly which layers you ran. Avoid replacing the boundary under investigation with a mock that already assumes the desired answer.

For timing cases, control a clock or promise rather than sleeping. For data cases, include at least two organizations or two independent entities where relevant. For mutation cases, assert both the returned outcome and unchanged unrelated state. Include a negative test that would reject the tempting shortcut named in the scenario.

After the first passing fix, introduce one small wrong variation in your own lab solution, run the relevant check, and revert only that variation. Keep the failing assertion as evidence that the test can detect the mechanism. Do not seed defects in the application's main working tree.

Write a short handoff: symptom; reproduction input; confirmed cause or remaining hypotheses; smallest change; tests actually run; remaining integration risk. A reviewer should be able to resume without reading your entire chat history.
