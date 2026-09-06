# Further work: 25 stories for review

This backlog contains exactly **25 proposed stories** extending the completed local M01–M15 program. They are based on the [delivered state](../current-state.md), [milestone map](../roadmap.md), [Run 002 evidence](../../exec-plans/002-complete-local-program.md) and linked source files. The baseline is the `helios-local-m15` checkpoint, commit `75c4d82`; reassess it when selecting work from a later revision.

All stories are **Proposed — awaiting review**, with owner and decision pending. The completed milestones remain complete. These documents describe future work; they do not claim implementation, live-provider validation or additional production capability.

Each story includes a user outcome, existing behavior, bounded scope, five acceptance criteria, suggested implementation steps, verification evidence, a learning exercise and a decision to resolve. Use [the separate backlog-review lab](../../../upskilling/labs/03-review-future-work.md) to practice turning one into an agent execution contract.

## How to review

Read a story's baseline before its proposed solution. Decide **accept, revise, defer or reject** based on its user value, evidence and complexity. Record the decision, owner and any revised acceptance criteria in the story. An accepted story still needs a bounded execution contract before BUILD begins.

Priorities are suggestions: **P1** strengthens reliability, supervision or delivery evidence; **P2** extends capability or evaluates an optional integration. They are not severity ratings or deadlines. Size **M** means a focused change across a few boundaries; **L** means a schema, runtime or cross-domain change that should be split into verified slices. Neither is a duration estimate.

Prerequisites describe the proposed implementation sequence, including evidence preparation, and form an acyclic graph. They are reviewable planning choices; for example, FW-006 precedes FW-007 to establish recovery evidence, not because Markdown manifests execute adviser jobs. Priority does not override prerequisites. Numbering groups related work and is not a required execution order.

## Story index

### Reliability and operator workflows

| Story                                                                                                        | Priority | Size | Prerequisites                                 |
| ------------------------------------------------------------------------------------------------------------ | -------- | ---- | --------------------------------------------- |
| [FW-001 · Explain and reproduce database connection timeouts](001-diagnose-connection-timeouts.md)           | P1       | M    | —                                             |
| [FW-002 · Give telemetry export a bounded resource budget](002-bound-telemetry-export.md)                    | P1       | M    | [FW-001](001-diagnose-connection-timeouts.md) |
| [FW-003 · Make operations reads accurate and bounded as history grows](003-scale-operations-reads.md)        | P1       | L    | [FW-001](001-diagnose-connection-timeouts.md) |
| [FW-004 · Retry an uncertain browser command with its original identity](004-retry-uncertain-ui-commands.md) | P1       | M    | —                                             |
| [FW-005 · Make auditor inspection and keyboard navigation complete](005-auditor-and-keyboard-workflows.md)   | P1       | M    | —                                             |

### Engineering and agent execution

| Story                                                                                                       | Priority | Size | Prerequisites                                                                        |
| ----------------------------------------------------------------------------------------------------------- | -------- | ---- | ------------------------------------------------------------------------------------ |
| [FW-006 · Package coding-agent checkpoints with verifiable evidence](006-reproducible-agent-checkpoints.md) | P1       | M    | —                                                                                    |
| [FW-007 · Run advisers as durable background jobs](007-durable-adviser-jobs.md)                             | P1       | L    | [FW-006](006-reproducible-agent-checkpoints.md)                                      |
| [FW-008 · Cancel an adviser job while work is in flight](008-cancel-running-advisers.md)                    | P1       | M    | [FW-007](007-durable-adviser-jobs.md), [FW-013](013-model-gateway-contract-tests.md) |
| [FW-009 · Enforce per-run and per-tenant adviser budgets](009-agent-resource-budgets.md)                    | P1       | L    | [FW-007](007-durable-adviser-jobs.md), [FW-013](013-model-gateway-contract-tests.md) |
| [FW-010 · Enforce versioned tool policies for each adviser role](010-versioned-tool-policies.md)            | P2       | M    | [FW-007](007-durable-adviser-jobs.md)                                                |

### Approvals, model behavior and evidence

| Story                                                                                                              | Priority | Size | Prerequisites                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | -------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [FW-011 · Revalidate the evidence behind an adviser proposal](011-revalidate-proposal-evidence.md)                 | P1       | L    | [FW-010](010-versioned-tool-policies.md)                                                                                                   |
| [FW-012 · Expand adversarial knowledge and policy evaluations](012-adversarial-retrieval-evaluations.md)           | P1       | M    | —                                                                                                                                          |
| [FW-013 · Exercise model-provider failures with a local protocol server](013-model-gateway-contract-tests.md)      | P1       | M    | —                                                                                                                                          |
| [FW-014 · Run a reproducible live-model evaluation within a reviewed budget](014-bounded-live-model-evaluation.md) | P2       | L    | [FW-009](009-agent-resource-budgets.md), [FW-012](012-adversarial-retrieval-evaluations.md), [FW-013](013-model-gateway-contract-tests.md) |
| [FW-015 · Compare learned retrieval against the token-hash baseline](015-learned-retrieval-experiment.md)          | P2       | L    | [FW-012](012-adversarial-retrieval-evaluations.md)                                                                                         |

### Knowledge and domain operations

| Story                                                                                                               | Priority | Size | Prerequisites                               |
| ------------------------------------------------------------------------------------------------------------------- | -------- | ---- | ------------------------------------------- |
| [FW-016 · Inspect the exact sources behind a historical adviser answer](016-inspect-citation-history.md)            | P2       | M    | —                                           |
| [FW-017 · Manage multiple station assets with explicit operating profiles](017-asset-and-station-registry.md)       | P2       | L    | —                                           |
| [FW-018 · Handle repair material lists and partial cargo receipts](018-multi-part-and-partial-deliveries.md)        | P2       | L    | [FW-017](017-asset-and-station-registry.md) |
| [FW-019 · Schedule crew availability and reject overlapping assignments](019-crew-schedules-and-conflicts.md)       | P2       | L    | —                                           |
| [FW-020 · Create preventive work from versioned simulation-time schedules](020-preventive-maintenance-schedules.md) | P2       | L    | [FW-017](017-asset-and-station-registry.md) |

### Finance, workflow compatibility and delivery

| Story                                                                                                           | Priority | Size | Prerequisites                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | -------- | ---- | -------------------------------------------------------------------------------------------------- |
| [FW-021 · Issue partial simulated refunds with immutable credit notes](021-partial-refunds-and-credit-notes.md) | P2       | L    | —                                                                                                  |
| [FW-022 · Process persisted events and workflows across version changes](022-workflow-version-compatibility.md) | P1       | L    | —                                                                                                  |
| [FW-023 · Replace fixture personas with membership-backed identity](023-membership-backed-identity.md)          | P2       | L    | —                                                                                                  |
| [FW-024 · Verify an immutable preview image with isolated CI evidence](024-isolated-ci-and-release-evidence.md) | P1       | L    | [FW-006](006-reproducible-agent-checkpoints.md)                                                    |
| [FW-025 · Rehearse schema upgrades and recovery on a disposable preview](025-upgrade-and-recovery-rehearsal.md) | P1       | L    | [FW-022](022-workflow-version-compatibility.md), [FW-024](024-isolated-ci-and-release-evidence.md) |

## Suggested review paths

Choose a path based on the skill or user outcome you want next; these are optional review sequences, not additional stories.

- **Understand an observed failure:** FW-001, then FW-002 and FW-003. Preserve the failed benchmark and establish a cause before claiming a remedy.
- **Practice long agent runs:** FW-006, FW-007 and FW-013, then FW-008/FW-009. Continue through FW-010/FW-011 for policy and approval evidence.
- **Improve everyday review:** FW-004, FW-005 and FW-016. Their core work can be selected independently; coordinate shared browser state and focus behavior if combined.
- **Measure adviser quality:** FW-012 first. Review FW-015 as a retrieval experiment; select FW-014 only after its runtime, budget and protocol prerequisites.
- **Broaden station operations:** FW-017 before FW-018 or FW-020. FW-019 is independently reviewable and becomes more useful with multiple simultaneous work orders.
- **Practice release recovery:** FW-006 and FW-022, then FW-024 and FW-025. Treat remote CI execution as pending until an actual run exists.
- **Review optional business integrations:** FW-021 and FW-023 have distinct finance and identity outcomes; neither requires implementing the other.

For the learning goal that motivated this project, start by reviewing **FW-006**, **FW-007** and **FW-013** together, then select a single bounded implementation slice. For investigating an observed operational issue, start with **FW-001**.

## Decisions still intentionally open

Several stories ask for values that depend on the intended use: acceptable read workload, cancellation interval, allowance limits, retention, shift rules, refund allocation and recovery bounds. They are explicit review decisions, not silently invented requirements. Resolve them in the selected story's contract before dependent implementation.

FW-014 needs a provider/model configuration and a specific live-evaluation allowance; FW-015 needs a candidate retrieval backend and an allowance if it makes external calls. FW-023 needs a selected identity integration target, and FW-024 needs a repository/runner target for remote verification. Local harnesses and review artifacts can be prepared first. No story authorizes paid usage, public rollout or messaging external collaborators by its presence here.

## Completion rules for a selected story

1. Reconcile the story with the current source and relevant build evidence; revise stale baseline claims instead of rebuilding completed behavior.
2. Resolve its review question, select a bounded slice, record prerequisites and write the contract in `docs/exec-plans/`. Use [the task contract template](../../../upskilling/templates/task-contract.md).
3. Implement with server-derived identity, existing domain boundaries and additive checksummed migrations. Define the failure and recovery behavior before changing durable state.
4. Run checks appropriate to the code change under [the repository instructions](../../../AGENTS.md), including actual database or browser checks where the criteria require them. Record unrun checks honestly.
5. Link each acceptance criterion to observed evidence and the exact source revision. Retain counterexamples, failed experiments and material limitations; a checkbox alone is not evidence.
6. Update the current state and retrospective only after behavior is established. Record a learning result only after the learner supplies a prediction, explanation or artifact.

## Review worksheet

Copy this into the chosen story or an entry under `upskilling/attempts/`. It is a decision record, not a twenty-sixth ticket.

| Field                                      | Your review |
| ------------------------------------------ | ----------- |
| Story ID and inspected revision            |             |
| Decision: accept / revise / defer / reject |             |
| User outcome worth pursuing                |             |
| Baseline evidence checked                  |             |
| Smallest first slice                       |             |
| Acceptance criteria or limits to revise    |             |
| Failure that must be disproved             |             |
| Prerequisites and external configuration   |             |
| Owner and next action                      |             |
| Execution contract / resulting evidence    |             |

No human review decisions or learning assessments have been filled in on your behalf.
