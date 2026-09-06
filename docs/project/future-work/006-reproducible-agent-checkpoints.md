# FW-006: Package coding-agent checkpoints with verifiable evidence

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Engineering and agent execution              |
| Priority        | P1                                           |
| Size            | M — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a developer resuming a long coding-agent run, I want a checkpoint that identifies the exact source, artifacts and unfinished work, so that I can continue without trusting an old chat summary.

## Current baseline and evidence

The build has useful Markdown execution records, Git checkpoints and ignored local artifacts. Their relationships are recorded manually, so a fresh session must reconcile them by inspection.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [docs/exec-plans/002-complete-local-program.md](../../../docs/exec-plans/002-complete-local-program.md)
- [upskilling/templates/checkpoint.md](../../../upskilling/templates/checkpoint.md)
- [upskilling/retrospective/03-durability-and-recovery.md](../../../upskilling/retrospective/03-durability-and-recovery.md)
- [scripts/benchmark.ts](../../../scripts/benchmark.ts)

## Proposed scope

Add a local checkpoint/evidence manifest command and a verifier. It records an engineering run; it does not itself create autonomous background execution.

## Acceptance criteria

- [ ] A manifest records commit, dirty-worktree state or patch digest, selected task contract, environment identifiers, commands and observed exit codes, artifact paths/hashes, and explicit pending work.
- [ ] A check result is marked passed only when an actual recorded execution supplied that result; missing, interrupted and unrun checks remain distinct.
- [ ] The verifier detects a modified or missing artifact and a source revision mismatch instead of presenting stale evidence as current.
- [ ] The bundle excludes environment secrets, authentication cookies and unreviewed arbitrary files by default; its included paths are explicit.
- [ ] A fresh-session walkthrough can identify the next bounded action and verify one prior result using the bundle plus the repository.

## Suggested implementation sequence

1. Define a small versioned JSON manifest and its relationship to the existing human-readable checkpoint.
2. Build a local collector for explicitly supplied command results and artifacts, then a separate verification command.
3. Add a worked checkpoint from an actual future run and a resume prompt that requires reconciliation with current state.

## Verification and evidence to retain

- Modify one artifact and the working tree after collection and verify that both mismatches are reported.
- Interrupt a check and confirm its manifest entry cannot become a pass; attempt the fresh-session walkthrough without the original conversation.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Write a checkpoint yourself before using the collector. Compare what the manifest can prove with what still needs engineering judgment.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

What minimum evidence should a fresh agent verify before it acts, and which files should be eligible for inclusion?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
