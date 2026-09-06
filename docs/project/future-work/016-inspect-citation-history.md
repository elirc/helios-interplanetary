# FW-016: Inspect the exact sources behind a historical adviser answer

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Knowledge and domain operations              |
| Priority        | P2                                           |
| Size            | M — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As an operator or auditor, I want to open a citation and see the source version used by that run so that I can judge the recommendation after procedures change.

## Current baseline and evidence

Knowledge documents and chunks are versioned, adviser traces retain tool evidence, and output citations are validated against retrieved chunk IDs. The next increment is a clear, accessible source inspector and a stable historical evidence contract.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/knowledge.ts](../../../src/server/knowledge.ts)
- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [src/components/intelligence-views.tsx](../../../src/components/intelligence-views.tsx)
- [src/domain/knowledge.ts](../../../src/domain/knowledge.ts)

## Proposed scope

Connect each recorded citation to its exact document version and excerpt. Show provenance, retrieval context and present approval status without suggesting that a valid citation proves the answer correct. Preserve read-only auditor access.

## Acceptance criteria

- [ ] A citation opens its original chunk, document title, version, content digest and the run that used it; it never silently resolves to the newest procedure.
- [ ] When a newer version is approved, the old run retains its original evidence while a new retrieval follows current eligibility rules.
- [ ] If historical content becomes unavailable under an explicit retention policy, the UI explains the gap and preserves the known identifier/digest instead of substituting different text.
- [ ] Source endpoints enforce both run and document tenant scope, including guessed IDs; read-only auditors can inspect eligible evidence without receiving mutation privileges.
- [ ] The inspector supports keyboard opening, focus return and readable long excerpts, and clearly separates source provenance from whether a claim is supported.

## Suggested implementation sequence

1. Define the minimum immutable reference a run needs and reconcile it with current stored tool output.
2. Add scoped historical-source reads and the inspector UI, with explicit unavailable/superseded states.
3. Document retention behavior and connect the new view to evaluation failure examples.

## Verification and evidence to retain

- Create a run, approve a changed procedure, then inspect both historical and new sources through the browser and database.
- Test another tenant's run/chunk IDs, missing historical content and keyboard navigation with the auditor persona.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Review a real recorded answer using only its cited excerpts. Write one supported claim, one unsupported inference and the evidence needed to resolve it.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

How long should exact historical excerpts remain available, and what should happen when source content must be removed?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
