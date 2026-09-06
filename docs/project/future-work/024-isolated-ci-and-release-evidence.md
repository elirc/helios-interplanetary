# FW-024: Verify an immutable preview image with isolated CI evidence

[Back to the review backlog](README.md)

| Field           | Proposed value                                  |
| --------------- | ----------------------------------------------- |
| Status          | Proposed — awaiting review                      |
| Theme           | Finance, workflow compatibility and delivery    |
| Priority        | P1                                              |
| Size            | L — relative complexity, not a time estimate    |
| Prerequisites   | [FW-006](006-reproducible-agent-checkpoints.md) |
| Owner           | Unassigned                                      |
| Review decision | Pending                                         |

## User story

As a reviewer, I want CI evidence tied to the image I will run so that test results cannot be confused with another checkout, database or build.

## Current baseline and evidence

CI is configured but no remote run was established by the local delivery. Integration and browser suites reset the same helios_test database and must currently run sequentially. The delivered preview was checked against workspace file hashes, and cold container builds were slow.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)
- [scripts/prepare-test-db.ts](../../../scripts/prepare-test-db.ts)
- [tests/helpers.ts](../../../tests/helpers.ts)
- [playwright.config.ts](../../../playwright.config.ts)
- [Dockerfile](../../../Dockerfile)
- [docs/exec-plans/002-complete-local-program.md](../../../docs/exec-plans/002-complete-local-program.md)

## Proposed scope

Create per-run disposable test database identities, build the preview image once and attach verifiable provenance and test evidence to it. Retain sequential suites until their isolation is proven. This story does not imply publishing an image or enabling a cloud deployment.

## Acceptance criteria

- [ ] Each CI run owns uniquely named test databases and explicit lifecycle metadata; reset/cleanup validates the permitted server and exact owned database and refuses development or unrelated targets.
- [ ] A successful run records source revision, dirty-state policy, migration digests, image identifier and actual command outcomes in the FW-006 evidence format.
- [ ] Health, relevant HTTP and browser workflows run against the same immutable image under review, with worker configuration and test data initialization recorded.
- [ ] Failure artifacts contain useful stage timing, logs and screenshots without environment files, credentials or unrestricted data dumps; unsuccessful stages cannot yield an overall success manifest.
- [ ] Two concurrent CI runs cannot reset each other's data; a documented local reproduction path checks the same contract, and remote verification is marked pending until an actual run is available.

## Suggested implementation sequence

1. Centralize test database naming/ownership and thread it through integration helpers and browser configuration.
2. Build once, start the image and worker against isolated fixtures, then collect stage-specific checks and provenance.
3. Measure stage duration and cache only safe build inputs; adjust the job budget from evidence without weakening required checks.

## Verification and evidence to retain

- Run two local CI-equivalent jobs with distinct database identities and deliberately fail one; confirm the other dataset and existing development data remain intact.
- Verify image/source evidence and secret exclusion, then inspect an actual remote run when a repository target is configured; otherwise report that last check as pending.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Reconstruct how a green result can belong to the wrong image. Design the minimum manifest that lets another reviewer detect that mismatch.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which repository/runner should execute the workflow, and is parallel suite execution valuable enough to justify its isolation complexity?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
