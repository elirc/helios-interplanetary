# Using the revised Helios prompt

Use [the revised master prompt](HELIOS-AGENTIC-ENGINEERING-PROMPT.md) for the first implementation session. It is a standalone replacement for the execution instructions in the original. The original remains useful as a domain reference.

After the first session, use concise run instructions that point to the repository's durable guidance and active execution plan. Keep stable conventions in `AGENTS.md`, product direction in project documents, and task-specific details in the active plan. This follows the separation described in the official [Codex best practices](https://learn.chatgpt.com/guides/best-practices) and [AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

The design choices below are recommendations tailored to your learning goal. They have not yet been benchmarked against your original prompt.

## What changed and why

| Original tendency | Revised approach |
| --- | --- |
| A large product specification dominates the instructions. | The product supplies concrete exercises; the operating loop gets explicit rules. |
| Broad domain stages precede the first vertical slice, despite a later instruction to start narrowly. | The first delivery is a small telemetry-to-incident scenario; maintenance and inventory follow. |
| Plan 20-30 milestones and 20-30 detailed PRs upfront. | Detail the current task and two candidates; revise the horizon using implementation evidence. |
| “Continue” has an enormous endpoint. | Each run has an authorized task set, observable completion criteria, limits, and a handoff. |
| Learning mostly means reading generated explanations. | You practice specification, falsification, review, steering, and recovery. |
| Application AI and coding-agent practice are interleaved. | Coding-agent practice starts immediately; product agents become a later engineering track. |
| Repository memory describes status. | Checkpoints also describe evidence, interrupted operations, failed approaches, and the exact next step. |

Long-running practice should test whether the work stays scoped, survives interruption, and produces verifiable results. A longer runtime by itself tells you little about quality.

## First use

Paste the master prompt into your coding-agent session with the Helios repository open. Its final section starts the first bounded implementation task. Review the proposed run contract as it appears and steer if it misses your intent.

After that first build, choose LAB mode for the next task if you want to practice writing the contract yourself. Avoid consuming several autonomous milestones before reviewing any code: you need feedback on your own supervision decisions too.

## Practice writing a task contract

```text
Use LAB mode for the next Helios task.

First give me a brief description of one useful next behavior and the repository
context I need. Then ask me to write the outcome, scope, acceptance criteria,
and one failure example. Wait for my attempt before proposing your version.

Review my contract for ambiguity, unnecessary scope, and missing verification.
Give specific corrections. Once I say the contract is ready, switch to BUILD
and execute it. At handoff, compare the result with my original criteria.
```

## Run a bounded longer session

Replace the bracketed fields before sending. Start with a complete task that you can review, then increase the authorized batch after successful runs.

```text
Use BUILD mode and follow the repository's Helios operating instructions.

Outcome: [observable result]
Authorized task set: [task IDs or exact active-plan path]
Acceptance criteria: [criteria or their exact location]
Exclude: [adjacent work that must wait]
Learning focus: [one skill I will review afterward]
Limits: [optional time/cost limits that this environment can observe]

Execute the authorized tasks in dependency order. Continue through recoverable
failures and between those tasks without asking whether to continue.
Checkpoint after each verified unit. Reserve capacity for review, required
checks, and handoff. Stop when the task set is verified or a stated limit or
unresolved blocker is reached. Do not add tasks to fill remaining time.

Tell me which supplied limits the host can actually observe and enforce.
If a limit cannot be enforced, do not rely on it for an unattended run;
use the explicit task boundary and report the limitation.
```

Prompt instructions describe intended behavior. Use the host's supported controls for execution, cancellation, permissions, and enforceable budgets where available. The archived official [execution-plan example](https://developers.openai.com/cookbook/articles/codex_exec_plans) illustrates durable planning, but its runtime example is not a guarantee for your environment.

## Resume interrupted work

```text
Resume the active Helios task in BUILD mode.

Read AGENTS.md, docs/project/current-state.md, and the linked active plan.
Inspect the current branch, diff, relevant services, and validation evidence.
Reconcile the checkpoint with actual state before editing. Check whether any
interrupted migration, command, or external write already completed.

Briefly state the verified starting point and next action, then continue the
existing contract. Preserve valid work. Do not regenerate the project plan
or restart implementation unless evidence shows that is necessary.
```

To test your recovery process, request a checkpoint mid-task, end the session, and resume in a fresh one. First try a normal checkpoint. Later, use a disposable environment to test an abrupt interruption and check whether the last checkpoint was sufficient.

## Review an agent's claimed completion

```text
Use REVIEW mode for [task or execution-plan path].

Judge the diff and actual behavior against the task's original acceptance
criteria. Inspect the implementation and independently run relevant checks;
the previous agent's summary is context, not proof.

Look especially for superficial tests, mocked integration claims, tenant
isolation gaps, duplicate side effects, missing failure behavior, and scope
drift where relevant. Prioritize reproducible findings over stylistic changes.

Report findings with impact, file references, reproduction steps, and the
smallest useful correction. Identify checks you could not run. Do not edit
the implementation during this review.
```

A fresh session can reduce dependence on the implementation narrative, but it does not guarantee an unbiased or correct reviewer. Keep executable checks and your own inspection in the review process.

## Diagnose a stalled agent

```text
Pause feature edits and diagnose why the current Helios task is stalled.

Inspect the last meaningful failures. Classify the likely cause: ambiguous
task, missing context, weak tools, environment, implementation, verification,
or coordination. Identify what is observed and what remains a hypothesis.

Choose one small experiment that distinguishes the leading explanations.
Run it, inspect the result, and revise the plan. Do not repeat failed edits
without new evidence. Continue the build when the diagnosis supports a fix;
otherwise save a precise blocker and resume instructions.
```

## Practice delegation

Use this only when there are independent pieces of useful work.

```text
Use LAB mode to help me define two independent subtasks for the current
milestone. Ask me to specify inputs, outputs, writable scope, dependencies,
acceptance criteria, and how I will judge the combined result. Wait for my
attempt and then review the boundaries.

Once I confirm the contracts, use up to two subagents if supported. Keep one
integration owner, isolate concurrent edits when needed, and review shared
contracts before combining changes. Run validation on the combined result.
If subagents are unavailable, execute sequentially and say so.

Record integration failures and coordination effort. At handoff, help me judge
whether delegation improved this task enough to justify its overhead.
```

## Evaluate an improvement to your coding-agent workflow

```text
Use EXPERIMENT mode.

Hypothesis: [one change to context, tools, instructions, review, or delegation
will improve a specific observed failure]
Representative tasks: [a small fixed set]
Primary measure: acceptance criteria passed after review
Secondary measures: regressions, human interventions, elapsed time, and actual
usage/cost where available

Use isolated copies starting from the same repository state and environment.
Hold the task, model/settings where controllable, and evaluation criteria fixed.
Change one factor between baseline and candidate. Do not share one run's
implementation or failure analysis with the other before scoring.

Use checks established before the experiment, repeat runs when budget permits,
and include a held-out task where practical. Record failures as well as wins.
Report the sample size and uncertainty. Do not claim a universal improvement
from one successful comparison. Recommend keeping, revising, or rejecting
the change based on the evidence.
```

For agents inside Helios, separately evaluate tool choices, arguments, outcomes, and policy behavior. Official guidance on [evaluating agent workflows](https://developers.openai.com/api/docs/guides/agent-evals) describes using traces to locate failures and datasets for repeatable comparisons.

## A compact scorecard for yourself

After a meaningful run, answer these before reading the agent's suggested answers:

1. Could another engineer judge completion from my task contract?
2. Which piece of evidence would catch a plausible incorrect implementation?
3. Can I trace the changed behavior through its entry point, rules, persistence, and UI?
4. Did I recognize and correct drift, or only accept the completion summary?
5. Could a fresh session resume from the saved state?
6. What one change should I make to the next agent run, and how will I evaluate it?

Keep a short record of your answers, human interventions, defects found during review, and the next experiment. Judge progress by better specifications, stronger verification, successful recovery, and fewer repeated mistakes on comparable tasks.
