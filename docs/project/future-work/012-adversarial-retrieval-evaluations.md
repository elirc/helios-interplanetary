# FW-012: Expand adversarial knowledge and policy evaluations

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Approvals, model behavior and evidence       |
| Priority        | P1                                           |
| Size            | M — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a reviewer, I want evaluations that expose misleading or hostile evidence so that a green fixture report has a clear and limited meaning.

## Current baseline and evidence

The recorded evaluation suite has 14 fixtures: six retrieval cases, including two held out, and eight policy cases. Retrieval scopes approved document versions to the tenant. Valid citation IDs establish source provenance; they do not establish that the cited text supports the answer.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/evaluations.ts](../../../src/server/evaluations.ts)
- [src/server/knowledge.ts](../../../src/server/knowledge.ts)
- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [tests/integration/intelligence.test.ts](../../../tests/integration/intelligence.test.ts)

## Proposed scope

Extend the local deterministic suite with a versioned corpus, explicit expected judgments and separate retrieval, citation-support and policy results. Include instructions embedded in documents as untrusted content. Do not relabel fixture results as live-model quality.

## Acceptance criteria

- [ ] The corpus includes conflicting procedures, superseded and draft documents, irrelevant but plausible chunks, cross-tenant near matches and document text that asks the adviser to ignore its rules.
- [ ] Each case states expected eligible sources, forbidden behavior and the reason for its label; labels distinguish citation existence from support for a concrete claim.
- [ ] Development cases and frozen held-out cases have distinct identifiers and versioned manifests; tuning on held-out failures requires a new declared evaluation split.
- [ ] Reports expose per-case failures and denominators for retrieval, citation support and policy independently, including zero-result and abstention outcomes.
- [ ] A deliberately incorrect candidate that cites an unrelated valid chunk or follows a retrieved instruction fails the corresponding check, while the approved baseline's actual results are reported without edited expectations.

## Suggested implementation sequence

1. Document the claim each current fixture establishes and identify missing counterexamples.
2. Add a small curated corpus with independent relevance/support labels and explicit untrusted-content boundaries.
3. Extend the report schema and UI with separate result groups and reproducible corpus/configuration digests.

## Verification and evidence to retain

- Run the suite against seeded local tenants and known bad candidates; verify that specific failures appear in the appropriate group.
- Change a corpus item after freezing it and verify manifest mismatch detection; test retired versions and malicious source text without network calls.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Create one example where a citation is valid but the answer is unsupported. Predict whether the current suite would detect it before reading its implementation.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which failure class matters most for the next demonstration, and who should review the labels independently?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
