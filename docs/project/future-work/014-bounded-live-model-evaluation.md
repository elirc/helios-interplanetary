# FW-014: Run a reproducible live-model evaluation within a reviewed budget

[Back to the review backlog](README.md)

| Field           | Proposed value                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Status          | Proposed — awaiting review                                                                                                                 |
| Theme           | Approvals, model behavior and evidence                                                                                                     |
| Priority        | P2                                                                                                                                         |
| Size            | L — relative complexity, not a time estimate                                                                                               |
| Prerequisites   | [FW-009](009-agent-resource-budgets.md), [FW-012](012-adversarial-retrieval-evaluations.md), [FW-013](013-model-gateway-contract-tests.md) |
| Owner           | Unassigned                                                                                                                                 |
| Review decision | Pending                                                                                                                                    |

## User story

As an evaluator, I want a controlled comparison of configured live advisers so that adoption decisions depend on measured behavior and explicit cost limits.

## Current baseline and evidence

The local build defaults to deterministic adviser fixtures. An optional provider adapter exists, but no live calls, live quality score or coding-agent token/cost measurement was established by the completed build.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/model-gateway.ts](../../../src/server/model-gateway.ts)
- [src/server/evaluations.ts](../../../src/server/evaluations.ts)
- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [upskilling/templates/workflow-experiment.md](../../../upskilling/templates/workflow-experiment.md)

## Proposed scope

Build an opt-in evaluation runner with a frozen trial manifest, local dry run and bounded live mode. Execution requires a selected provider/model, credentials and a specific spend allowance. This story does not select a vendor, buy capacity or permit autonomous domain writes.

## Acceptance criteria

- [ ] The trial manifest records corpus split, prompt/tool/policy versions, provider/model configuration, scoring rubric, concurrency and maximum requests, tokens and configured spend allowance.
- [ ] Dry run resolves and validates every case with zero paid calls; live mode refuses to start without explicit configuration and enough reserved budget.
- [ ] Each case records trial identity, actual returned usage, latency, failures and unknown outcomes; any cost estimate states its dated rate assumptions and never treats unavailable usage as free.
- [ ] Baseline and candidate receive the same frozen inputs and independent judgments; the report preserves raw per-case outcomes, sample size and limitations alongside aggregates.
- [ ] Interrupted trials resume by case identity without silently repeating ambiguous calls; human-approved domain actions remain disabled throughout the evaluation.

## Suggested implementation sequence

1. Choose a small question the experiment can answer and preregister its rubric and stop conditions.
2. Reuse durable jobs and budget reservations for trial execution; store immutable input/configuration hashes and resumable case state.
3. Produce a comparison report with failure examples and a decision that can remain inconclusive.

## Verification and evidence to retain

- Use the local protocol server to exhaust budgets, interrupt cases and resume a partially completed trial without external calls.
- After explicit live configuration and allowance, run the agreed small trial and inspect a sample of judgments manually; if unavailable, report live validation as pending.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Before any trial, write what result would make you retain the fixture-only workflow, change the prompt, or reject the candidate model.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

What concrete decision will this trial inform, what is the maximum spend, and who will judge ambiguous answers?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
