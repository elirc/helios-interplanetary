# Lab B: Request summaries without hiding zeroes or errors

Practice a transparent metric projection while keeping instrumentation claims separate.

## Exact teaching contract

Export `summarizeRequests(samples)`. Each sample has a trusted normalized route string, integer status, and finite nonnegative durationMs; reject invalid duration with TypeError. Group by route and status. Return `{route,status,count,sumMs,maxMs,meanMs}` rows sorted by route lexically then status numerically. Count zero-duration samples. Empty input returns []. Inputs are synthetic small values whose sum remains finite; no percentile, time window, route normalization, or sampling correction is implemented.

## Work the examples before the implementation

For one route, use durations 0 and 100 with status200, then 50 with status500. Calculate both groups and explain what a combined successful-only average would hide.

Read `check.mjs`, write expected results for two cases, and then run it. The starter deliberately throws `Not implemented`. Implement `exercise.mjs` yourself and keep the supplied assertions unchanged. Add one test for an edge that is not already asserted, then demonstrate a plausible wrong implementation fails it.

From this lab directory:

```powershell
node --test check.mjs
```

The file is explicitly named `check.mjs` rather than a test/spec filename so conventional app test discovery does not collect an unfinished teaching exercise. There is no npm install, database, network, paid model, or payment call. These are small JavaScript models; types and application integration are separate practice tasks.

## Connect the model to the application

Trace the actual HTTP observability boundary to verify status and route template before feeding a summary. A grouping test cannot detect mislabeled upstream samples.

Record what is simplified: input validation already assumed, event ordering promised by the caller, a missing persistence layer, or an injected clock. A passing model is useful only when you can name the guarantee the real app still needs.

After your own attempt, read [the reasoning guide](../../_answers/GUIDE.md). The separate reference is checked with:

```powershell
node check.mjs --reference
```

This second command verifies the author's answer, not your solution. If your solution differs but meets every stated contract, compare invariants and failure cases instead of matching lines. Save the failing output, corrected output, your extra assertion, and a short explanation of why the correction is sufficient for this model.
