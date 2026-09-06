# Lab 3: turn future work into a supervised agent run

Use this after exploring the finished application and reading [the build retrospective](../retrospective/README.md). The [25-story review backlog](../../docs/project/future-work/README.md) gives you real next-work candidates grounded in this repository. This lab helps you choose and specify work; reading it does not start any ticket.

You can complete the review without running code. Keep your attempt in `upskilling/attempts/` and leave personal progress pending until you have produced evidence. The backlog is proposed work, so there is no fabricated implementation outcome or answer key for your priorities.

## 1. Recover the baseline

Choose two stories with different kinds of uncertainty. A useful pair for the original learning goal is [FW-006: verifiable checkpoints](../../docs/project/future-work/006-reproducible-agent-checkpoints.md) and [FW-007: durable adviser jobs](../../docs/project/future-work/007-durable-adviser-jobs.md). Another pair is [FW-001: connection timeouts](../../docs/project/future-work/001-diagnose-connection-timeouts.md) and [FW-013: gateway protocol tests](../../docs/project/future-work/013-model-gateway-contract-tests.md).

For each story, inspect at least one linked source file and one relevant recorded test or execution result. Write three statements in your own words:

- What already works, with a source or evidence reference.
- What was observed to fail, or which risk is only inferred from code.
- What new behavior would be worth adding and how you would observe it.

Keep those categories accurate. The benchmark timeout was observed, but its cause was not established. The adviser has persistent traces and interruption detection, but its current request-scoped execution does not provide resumable jobs. Distinguishing those claims prevents the agent from implementing a solution to the wrong problem.

## 2. Review the proposed scope

Use the worksheet in the backlog index to accept, revise, defer or reject each candidate. Explain your decision using user value and a specific constraint rather than the ticket's suggested priority alone.

For one candidate, identify the smallest slice that produces useful evidence. For example, a first slice of FW-006 could collect an explicit source/artifact manifest and detect tampering; automatic collection of every tool invocation could remain a later slice within the story. That partial implementation would not make the full story complete.

Resolve the story's open review question. Replace vague limits with values appropriate to your selected environment. Check prerequisites and distinguish a technical dependency from a useful learning sequence. If you change the dependency order, write the reason.

## 3. Predict a failure before implementation

Write one counterexample that would fool a shallow implementation and the assertion that would expose it. Use this table before asking an agent to run anything:

| Situation                            | Prediction | Observable check | What would change your mind? |
| ------------------------------------ | ---------- | ---------------- | ---------------------------- |
| Normal completion                    |            |                  |                              |
| Interruption or duplicate request    |            |                  |                              |
| Stale evidence or unauthorized scope |            |                  |                              |

For a durable job, choose a precise crash point: after claim, after a read result commits, or after provider completion before local persistence. A stored `RUNNING` row is not enough to explain all three. For a coding checkpoint, distinguish evidence that is absent from evidence that belongs to a different revision.

## 4. Write the execution contract

Start from [the task contract template](../templates/task-contract.md). Include the inspected revision, selected story and slice, allowed files or domain boundaries, invariants, acceptance criteria, verification commands, environmental limits and stopping conditions. Record any selected live-provider allowance separately; default this exercise to local fixtures and no paid calls.

Use the following prompt after you have filled in a concrete contract:

```text
Use BUILD mode for the selected slice of FW-___ only.
Read AGENTS.md, docs/project/current-state.md, the linked story and my contract.
Reconcile their baseline claims with the current source before editing.

My contract: <path to the completed execution contract>
Inspected source revision: <commit and any relevant local changes>

Implement the accepted scope and run its meaningful checks. Preserve existing
work and record actual failures, commands, results and pending verification.
At durable checkpoints, write enough state for a fresh session to resume.
Do not mark the entire story complete if this contract selects only one slice.
Keep personal learning unassessed until I provide my own explanation.
```

For a review-only session, use this instead:

```text
Use REVIEW mode. Review my proposed contract for FW-___ against its source
references and recorded baseline. Do not implement it yet. Identify missing
invariants, ambiguous acceptance criteria, unnecessary scope and one plausible
failure that my verification would miss. Separate observed facts from inference.
```

These are repository workflow conventions. They do not create a durable coding-agent runtime by naming a mode.

## 5. Reconstruct what happened afterward

After a future implementation run, compare your prediction with the actual diff, test outputs and checkpoint. Record one assumption confirmed, one assumption changed or still unresolved, and one next bounded action. Do not invent a surprise if the run matched your prediction.

Try a fresh-session review using only the contract, current state and checkpoint. Identify the exact source revision, one independently verifiable result, any unfinished step and whether an external operation has an uncertain outcome. If this cannot be recovered, improve the checkpoint before giving the next agent broader work.

Use [the workflow experiment template](../templates/workflow-experiment.md) if you compare two supervision approaches. Hold the task and acceptance criteria constant and record environmental differences. Faster completion alone does not establish better correctness or better personal understanding.

## Self-review rubric

Score each dimension 0 for missing, 1 for an unsupported assertion, or 2 for concrete evidence. The total is a practice rubric, not a certification or a score assigned by the build agent.

| Dimension              | Evidence for 2 points                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Baseline accuracy      | Source and recorded results distinguish existing behavior, observed failures and inferred risks. |
| Scope control          | One useful slice has clear boundaries and a reason for every prerequisite.                       |
| Falsifiable acceptance | A specific failure would make the proposed check fail.                                           |
| Recovery reasoning     | The checkpoint and crash timeline distinguish completed, pending and uncertain effects.          |
| Honest conclusion      | Claims match the actual evidence, with limitations and a bounded next action.                    |

If a dimension has no evidence, keep it pending and write the next action needed to assess it. Later, link your attempt and outcome from [the learning progress tracker](../progress.md).
