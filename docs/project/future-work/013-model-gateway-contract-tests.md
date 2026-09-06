# FW-013: Exercise model-provider failures with a local protocol server

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

As an engineer, I want to test the real gateway's HTTP behavior offline so that provider failures can be reproduced without paid calls.

## Current baseline and evidence

The optional Responses adapter already enforces a request deadline, a strict output shape, refusal/incomplete handling and an in-process circuit breaker. Fixture modes exercise domain behavior, but they do not establish every transport, parsing and recovery behavior of the HTTP adapter.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/model-gateway.ts](../../../src/server/model-gateway.ts)
- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [tests/integration/intelligence.test.ts](../../../tests/integration/intelligence.test.ts)

## Proposed scope

Introduce a narrowly injectable transport or test-only local provider endpoint and a deterministic protocol test server. Preserve production configuration boundaries: a browser request must never choose an arbitrary provider URL.

## Acceptance criteria

- [ ] Tests cover successful structured output, malformed JSON, missing fields, extra fields, refusal, incomplete output, non-success HTTP responses and a connection that never completes.
- [ ] The request deadline aborts the transport and releases resources; cancellation signals can compose with the deadline without leaving background requests running.
- [ ] Circuit opening, rejection during the open interval and recovery use a controllable clock and produce distinct trace outcomes; unexpected failures are not recorded as successful fixture answers.
- [ ] Provider usage is recorded only when returned and valid; an interrupted or malformed response leaves usage explicitly unknown instead of zero.
- [ ] Every test runs against a local server with fake credentials, checks the outbound request contract and completes without external network access or secret-bearing logs.

## Suggested implementation sequence

1. Separate HTTP transport and clock injection from output validation with the smallest practical interface.
2. Implement scripted local responses, delayed bodies and connection termination, and give each scenario a deterministic expectation.
3. Document which adapter behaviors are verified and which require an explicitly configured live trial.

## Verification and evidence to retain

- Run protocol scenarios through the actual gateway and assert status, trace classification, resource cleanup and circuit transitions.
- Fail the test if it attempts a non-loopback connection; ensure error output cannot contain the fake credential or a raw authorization header.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Draw the provider call timeline and place the deadline, response parsing, usage accounting and circuit transitions on it. Mark what remains unknown after disconnect.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Should the circuit remain process-local for the next increment, or is shared failure coordination a separately justified requirement?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
