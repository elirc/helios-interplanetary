# Lab 2: direct and evaluate the agent

These exercises practice your decisions as the engineer supervising AI work. Ask the agent to use LAB mode and wait for your attempt. Use BUILD mode only once you are ready for implementation.

## Exercise 1: reconstruct a task contract

Use [the contract template](../templates/task-contract.md) for M02: creating a maintenance work order from an incident. This behavior now exists. Reconstruct its contract before reading the implementation, then compare your specification with the service and tests. To practice new implementation afterward, choose one bounded extension from your review instead of rebuilding M02 in the main application.

Include an observable outcome, an explicit scope boundary, a duplicate-creation example, a tenant-denial example, and a testable initial-state rule. State the assumptions you are leaving open.

Have the agent review the contract for ambiguity. Revise your own version. Keep both versions so you can identify which decisions you learned to specify more precisely. Do not accept additional domains unless they are dependencies of your outcome.

## Exercise 2: review a completion claim

Give a fresh agent the original Run 001 contract and repository in REVIEW mode. Ask it to produce reproducible findings and to distinguish unverified claims from defects.

Before reading its conclusions, inspect one code path yourself. Compare your observations afterward. Investigate disagreements with a concrete command or test. A second agent's agreement is useful feedback, not proof.

## Exercise 3: issue a targeted correction

Choose a real gap from the review or a learning improvement. Equal-time observations are already covered; do not present them as an unimplemented feature. Write a correction that:

- Identifies the unmet behavior or evidence gap.
- Preserves already valid work.
- Names the next observable check.
- Limits the scope of the fix.

Ask the agent to execute it. Compare the final diff against the correction. Record whether your instruction prevented unrelated changes.

## Exercise 4: test a workflow improvement

Use [the experiment template](../templates/workflow-experiment.md). Choose one variable: a better task contract, a concise code map, a deterministic reproduction command, or a separate review step.

Use separate copies at the same starting commit and the same task. Keep model/settings and evaluation criteria fixed where you control them. Do not give the candidate one run's solution while withholding it from the baseline. Repeated runs and a held-out task make the conclusion stronger when affordable.

Score acceptance criteria, defects found during review, human interventions, elapsed time, and actual usage if available. Record failures too. If the sample is one run per condition, describe it as an initial observation, not a reliable general improvement.

## Exercise 5: delegation, when useful

After the next feature has a stable contract, propose two independent subtasks. Specify their inputs, outputs, writable files, and integration owner. Explain why they can run independently. Shared schema changes or tightly coupled contracts may require sequential work first.

If you explicitly select this exercise and subagents are available, request up to two. Validate the combined result. Record merge conflicts, contract mismatches, duplicated work, and integration time. Decide whether the coordination overhead was justified.

## Assessment rubric

| Skill         | Needs work                                   | Demonstrated                                             |
| ------------- | -------------------------------------------- | -------------------------------------------------------- |
| Specification | Completion requires guessing intent.         | Another engineer can judge the result from the contract. |
| Verification  | Trusts a summary or screen alone.            | Uses relevant behavior and persistent-state evidence.    |
| Steering      | Gives broad criticism or requests a rewrite. | Corrects a specific gap while preserving valid work.     |
| Recovery      | Depends on the old conversation.             | Resumes from reconciled repository state.                |
| Evaluation    | Claims improvement from a favorite example.  | Controls the comparison and states its limits.           |
| Delegation    | Splits work by job title alone.              | Defines independent tasks and verifies integration.      |

Record only demonstrated skills in [progress.md](../progress.md). The agent should not mark your learning complete on your behalf without evidence from your attempt.
