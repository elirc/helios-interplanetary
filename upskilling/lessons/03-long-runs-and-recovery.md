# Lesson 3: long runs, checkpoints, and recovery

Learning outcome: you can supervise a run whose implementation spans many tool calls or sessions, detect lack of progress, and resume it without relying on the original conversation.

## Define the unit of autonomy

Start with one verified behavior. Increase to a small dependency-ordered task batch after reviewing successful runs. State the authorized tasks explicitly; “work overnight” supplies duration but does not identify a useful outcome.

A run should end when its acceptance criteria are verified, a supplied limit is reached, or it cannot progress without a specific external change. Runtime support determines whether an agent can continue unattended. A prompt or Markdown checkpoint alone cannot provide scheduling, process persistence, or enforce a spending limit.

When setting time or cost constraints, establish what the host can measure and enforce. Use actual instrumentation when available. Do not interpret an estimated cost as an enforced cap, or missing usage data as zero usage.

## Keep a small, useful working context

The next agent needs stable guidance, current state, an active contract, relevant code, and recent evidence. It rarely needs every historical message or future product idea.

In Helios, the entry point is [current-state.md](../../docs/project/current-state.md). The active plan holds acceptance criteria and progress. The source tree and test results remain the authority when a status document is stale.

Update a checkpoint after a meaningful verified unit and before ending the session. Include failed approaches only when they would prevent repeated wasted work. Store detailed logs as artifacts and link to them rather than copying entire outputs into the plan.

## Resume is a reconciliation step

1. Read the checkpoint and inspect the working tree.
2. Confirm the current branch, relevant changes, dependencies, and running services.
3. Verify that cited artifacts still match the code.
4. Determine whether an interrupted command already completed.
5. Continue the next unmet acceptance criterion.

This matters especially for writes with uncertain outcomes. A scenario response can be lost after the transaction commits. Replaying the same run ID can recover the stored result. Generating a fresh ID can create a second sequence. External systems need their own idempotency or reconciliation guarantees; our PostgreSQL transaction cannot provide those automatically.

## Recognize a stalled loop

Track progress using newly verified behavior and resolved uncertainty. Several edits without a changed observation may indicate a poor diagnosis. After two materially different failed approaches without new evidence, ask for a smaller reproduction and a discriminating experiment.

Useful status: “Same-origin denial reproduces only on localhost; APP_ORIGIN uses 127.0.0.1. Next I will compare the request host with the configured origin.”

Weak status: “Still working hard on the authentication issue.”

## Fresh-session drill

Choose a small documentation or verification improvement that has at least two steps. Start it in BUILD mode and request a checkpoint after the first verified step. End that session. In a fresh session, provide only repository access and this instruction:

```text
Resume the active contract from docs/project/current-state.md.
Reconcile its checkpoint with the actual working tree and environment.
Continue the next unmet acceptance criterion, preserving verified work.
```

Record every fact the new agent needed that the checkpoint omitted. Improve [the checkpoint template](../templates/checkpoint.md) only where the drill exposed a real gap. Later, test an abrupt process interruption in a disposable environment.

## Assess the result

Can the new session explain what is done, reproduce a check, avoid already failed approaches, identify uncertain writes, and take the next step? Record these observations in [your progress tracker](../progress.md). A successful resume is useful evidence about the workflow; it does not guarantee recovery from every kind of interruption.
