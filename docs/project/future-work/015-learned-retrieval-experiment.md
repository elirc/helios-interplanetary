# FW-015: Compare learned retrieval against the token-hash baseline

[Back to the review backlog](README.md)

| Field           | Proposed value                                     |
| --------------- | -------------------------------------------------- |
| Status          | Proposed — awaiting review                         |
| Theme           | Approvals, model behavior and evidence             |
| Priority        | P2                                                 |
| Size            | L — relative complexity, not a time estimate       |
| Prerequisites   | [FW-012](012-adversarial-retrieval-evaluations.md) |
| Owner           | Unassigned                                         |
| Review decision | Pending                                            |

## User story

As an operator, I want evidence that a different retrieval method finds better procedures before we replace a working, inexpensive baseline.

## Current baseline and evidence

Knowledge retrieval combines PostgreSQL full-text search with documented 128-dimensional token-hash vectors. This is a local lexical baseline, not learned semantic embeddings. Approved versions and tenant eligibility are already enforced.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/knowledge.ts](../../../src/server/knowledge.ts)
- [src/server/evaluations.ts](../../../src/server/evaluations.ts)
- [src/domain/intelligence.ts](../../../src/domain/intelligence.ts)

## Proposed scope

Introduce a versioned retrieval backend interface and one explicitly selected learned candidate. Preserve the existing backend as a reproducible comparator. Support a local dry run; any external embedding calls require a configured allowance before execution.

## Acceptance criteria

- [ ] Stored embeddings identify backend, model/version, dimensions and content digest; incompatible vectors cannot be mixed or silently reused after content or configuration changes.
- [ ] Tenant scope and approved-version eligibility are applied before candidates reach the adviser, including when caches or precomputed indexes are used.
- [ ] The same frozen relevance judgments compare baseline and candidate using defined recall/ranking metrics, latency, indexing effort and measured or explicitly estimated cost.
- [ ] Reindexing is resumable and idempotent by content/configuration identity; incomplete candidate indexes do not make the working baseline unavailable.
- [ ] The experiment report includes regressions, abstention/zero-result behavior and sample limitations; switching the default requires an explicit review decision supported by the results.

## Suggested implementation sequence

1. Extract the current scorer behind a minimal interface and preserve its behavior in the comparison harness.
2. Add one backend with versioned cache/index metadata and a bounded indexing job.
3. Run the agreed corpus through both methods and inspect the largest ranking changes against the source text.

## Verification and evidence to retain

- Test version changes, interrupted indexing, wrong-dimension data and cross-tenant near matches with deterministic local embeddings.
- Run the selected candidate only in its configured environment; report retrieval results separately from answer quality and leave unexecuted live measurements pending.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Predict which paraphrase case the token-hash baseline will miss and which exact-code case it may already handle well. Compare those predictions with ranked source lists.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Is retrieval quality currently limiting a user workflow enough to justify model/index complexity, and what improvement would justify switching?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
