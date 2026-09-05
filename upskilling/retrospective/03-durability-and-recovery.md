# 3. Two kinds of long-running work

This build contains two distinct recovery problems.

The **coding agent** makes many edits and tool calls over a long run. It needs a bounded task list, a trustworthy checkpoint, test evidence and reconciliation after interruption. Its Markdown notes do not create background execution capability.

The **Helios worker** is an actual process. Its durable state is in PostgreSQL. It claims events, advances resumed simulation, projects workflows, escalates deadlines and recovers abandoned adviser runs. Its persistence does not depend on a conversation.

## Process loss is an uncertain outcome

Read [worker.ts](../../src/server/worker.ts). Consider an event that was claimed just before a process stopped. Is it safe for another worker to execute it? What if the original worker wakes up afterward?

The lease has both an expiration and a token. Expiration makes work recoverable. The token prevents an old owner from committing after a new owner has taken over. The consumer receipt independently prevents repeated business effects.

Run the actual process drill:

```sh
node --env-file-if-exists=.env --import tsx --test --test-name-pattern="actual child process" tests/integration/platform.test.ts
```

The child exits with code 17 after claim. The test advances only that disposable lease deadline and starts another process. This is a deliberately triggered process failure with a real database, not a claim that a production worker crashed during the build.

## Retries need a terminal path

The poison-event exercise has three attempts, bounded delay and a dead-letter state. An operator records resolution before redrive. The main application never removes its duplicate protection to demonstrate a bad baseline.

Before reading the test, predict what changes after each failed attempt and what remains immutable. Explain why repeatedly requeuing a permanently invalid message without a limit would be a failure of the agent's control loop as well as the software's control loop.

## Reconstruct a coding checkpoint

Use [the checkpoint template](../templates/checkpoint.md) to write a checkpoint immediately after the six repair tests passed but before the browser journey ran. Include what was implemented, exactly what was verified, what was still uncertain, and the next action.

Then compare it with [Run 002](../../docs/exec-plans/002-complete-local-program.md). Avoid rewriting the history as if every feature was completed and tested in one pass. A good checkpoint preserves both valid work and evidence gaps.

Your evidence: one predicted lease timeline and a checkpoint another agent can use without this chat. [Answer key](../solutions/02-program-invariants.md).
