# Checkpoint: Helios / astra1

Status: **not assessed**. Passing the reference tests is author verification, not evidence that you learned the topic.

## Closed-book recall

1. Why must every ORDER BY direction be read explicitly?
2. What guarantee does a tuple cursor provide, and what does it not provide across requests?
3. Why does the organization predicate belong before limit?
4. When might PostgreSQL ordering differ from the model, and how would you verify it?

## Score your evidence, 0–2 per row

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Source understanding | Cannot locate the boundary | Names a file | Traces input, transformation, and output with actual symbols |
| Model correctness | Starter or broken contract | Supplied tests pass | Own boundary test and a caught mutation too |
| Transfer | Claims app is fixed without evidence | Written change plan | Focused application check, or an explicit blocked check plus a precise reproduction plan |
| Explanation | Repeats a rule | Gives a correct example | Explains a counterexample and the model's limits |
| Ownership | Copied answer | Can explain copied code | Own prediction, spec, diff review, and revised reasoning |

Target: 8/10 and no zero in source understanding or model correctness. This is a learning checkpoint, not a production-readiness rating. A plan-only transfer remains pending even if your overall score passes.

## Three retrieval repetitions

- Tomorrow: answer the first two questions in five minutes without opening files.
- In seven days: reproduce one edge-case test from memory and explain why it matters.
- In three weeks: apply the idea to a different project in the [ten-project path](../../../opusorganize/junior-reinforcement/README.md). Name one assumption that changes.

## Record

Date / commit and working-tree context / prediction / failed case / smallest fix / app check run or pending / score / next repetition date.

Explain your result in 90 seconds: user symptom → relevant boundary → evidence → change → remaining limitation. Describe only work you actually performed.
